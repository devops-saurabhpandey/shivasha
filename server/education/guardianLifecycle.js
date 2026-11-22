export const GUARDIAN_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export function getGuardianInviteExpiry(now = new Date()) {
  return new Date(now.getTime() + GUARDIAN_INVITE_TTL_MS);
}

export function buildRedeemableGuardianInviteFilter(inviteHash, now = new Date()) {
  return {
    inviteHash,
    guardian: null,
    inviteExpiresAt: { $gt: now },
    status: "pending"
  };
}

export function canRedeemGuardianInvite(link, guardianId, now = new Date()) {
  if (!link || !guardianId || !link.student || !link.inviteExpiresAt) return false;
  if (String(link.student) === String(guardianId)) return false;
  return link.guardian == null &&
    link.status === "pending" &&
    new Date(link.inviteExpiresAt).getTime() > now.getTime();
}

export function buildGuardianLinkTransitionFilter({ linkId, studentId, action }) {
  const expectedStatus = action === "revoke" ? "approved" : "pending";
  return {
    _id: linkId,
    student: studentId,
    guardian: { $ne: null },
    status: expectedStatus
  };
}

export function buildGuardianLinkTransitionUpdate(action, now = new Date()) {
  if (action === "approve") return { $set: { status: "approved", approvedAt: now } };
  if (action === "reject" || action === "revoke") return { $set: { status: "revoked", revokedAt: now } };
  throw new TypeError("Unsupported guardian link action.");
}

export function buildStudentGuardianRequestsFilter(studentId) {
  return { student: studentId, guardian: { $ne: null }, status: "pending" };
}

export function buildApprovedGuardianChildrenFilter(guardianId) {
  return { guardian: guardianId, status: "approved" };
}

export function canGuardianReadStudentProgress(link, guardianId) {
  return Boolean(link && link.guardian && link.status === "approved" &&
    String(link.guardian) === String(guardianId));
}
