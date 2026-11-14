import mongoose from "mongoose";
import EnterpriseAuditEvent from "../models/EnterpriseAuditEvent.js";
import { HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun } from "../models/HR.js";

// The business document and its audit intent are committed atomically in one
// MongoDB write. This works with standalone MongoDB; no replica-set
// transaction or multi-document transaction is assumed.
export const MAX_PENDING_HR_AUDIT_EVENTS = 250;
const HR_MODELS = [HREmployee, HRAttendance, HRLeave, HRChallan, HRPayrollRun];

export function createHRAuditEvent({ companyId, actorUserId, action, resourceType, resourceId, details = {} }) {
  return {
    eventId: new mongoose.Types.ObjectId(),
    companyId,
    actorUserId,
    action,
    resourceType,
    resourceId: String(resourceId),
    details,
    occurredAt: new Date()
  };
}

export function withHRAuditCapacity(filter = {}) {
  return {
    ...filter,
    $expr: {
      $lt: [
        { $size: { $ifNull: ["$auditOutbox", []] } },
        MAX_PENDING_HR_AUDIT_EVENTS
      ]
    }
  };
}

async function persistOutboxEvent(event) {
  const payload = {
    _id: event.eventId,
    companyId: event.companyId,
    actorUserId: event.actorUserId,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    details: event.details || {},
    occurredAt: event.occurredAt
  };
  // _id is the idempotency key. A retry after an insert-before-ack crash
  // finds the existing event and does not create a duplicate.
  try {
    await EnterpriseAuditEvent.create(payload);
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
  const stored = await EnterpriseAuditEvent.findById(event.eventId)
    .select("companyId actorUserId action resourceType resourceId")
    .lean();
  if (!stored ||
      String(stored.companyId) !== String(event.companyId) ||
      String(stored.actorUserId) !== String(event.actorUserId) ||
      stored.action !== event.action ||
      stored.resourceType !== event.resourceType ||
      stored.resourceId !== event.resourceId) {
    throw new Error("Audit outbox idempotency verification failed");
  }
}

export async function flushHRAuditOutboxForDocument(Model, documentId, maxEvents = MAX_PENDING_HR_AUDIT_EVENTS) {
  let processed = 0;
  try {
    for (; processed < maxEvents; processed += 1) {
      const document = await Model.findById(documentId).select("auditOutbox").lean();
      if (!document) return { recorded: false, pending: 0, processed };
      const event = document.auditOutbox?.[0];
      if (!event) return { recorded: true, pending: 0, processed };
      await persistOutboxEvent(event);
      // Never remove an outbox item until its central audit record is durable.
      await Model.updateOne(
        { _id: documentId, "auditOutbox.eventId": event.eventId },
        { $pull: { auditOutbox: { eventId: event.eventId } } }
      );
    }
    const remaining = await Model.findById(documentId).select("auditOutbox").lean();
    const pending = remaining?.auditOutbox?.length || 0;
    return { recorded: pending === 0, pending, processed };
  } catch {
    const remaining = await Model.findById(documentId).select("auditOutbox").lean().catch(() => null);
    return { recorded: false, pending: remaining?.auditOutbox?.length ?? 1, processed };
  }
}

export async function drainHRAuditOutbox({ batchSize = 100 } = {}) {
  if (mongoose.connection.readyState !== 1) {
    return { scanned: 0, recorded: 0, pending: 0, database: "not-connected" };
  }
  let scanned = 0;
  let recorded = 0;
  let pending = 0;
  for (const Model of HR_MODELS) {
    let documents;
    try {
      documents = await Model.find({ "auditOutbox.eventId": { $exists: true } })
        .select("_id").limit(batchSize).lean();
    } catch {
      pending += 1;
      continue;
    }
    for (const document of documents) {
      scanned += 1;
      const result = await flushHRAuditOutboxForDocument(Model, document._id);
      if (result.recorded) recorded += 1;
      else pending += Math.max(1, result.pending);
    }
  }
  return { scanned, recorded, pending, database: "connected" };
}

export function startHRAuditOutboxWorker({ intervalMs = 5000, logger = console } = {}) {
  let running = false;
  const run = async () => {
    if (running || mongoose.connection.readyState !== 1) return;
    running = true;
    try {
      const result = await drainHRAuditOutbox();
      if (result.pending > 0) logger.error?.("SHIVASHA HR audit outbox has pending events", result);
    } catch (error) {
      logger.error?.("SHIVASHA HR audit outbox drain failed", error);
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
