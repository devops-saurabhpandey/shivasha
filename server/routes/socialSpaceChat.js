import { Router } from "express";
import mongoose from "mongoose";
import SocialSpaceChatMessage from "../models/SocialSpaceChatMessage.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { isBlockedEitherDirection } from "../social/blockPolicy.js";
import { canDeleteSpaceChatMessage } from "../social/socialSpaceChatPolicy.js";

function createChatRouter({ Resource, Membership, resourceKey, resourceType }) {
  const router = Router();
  async function loadActiveContext(resourceId, userId) {
    if (!mongoose.isValidObjectId(resourceId)) return null;
    const resource = await Resource.findById(resourceId).select("status createdBy").lean();
    if (!resource || resource.status !== "active") return null;
    const membership = await Membership.findOne({ [resourceKey]: resource._id, userId, status: "active" }).select("_id role status").lean();
    if (!membership) return null;
    const [viewer, creator] = await Promise.all([
      User.findById(userId).select("blockedUsers moderationBlocked").lean(),
      User.findById(resource.createdBy).select("blockedUsers moderationBlocked").lean()
    ]);
    if (!viewer || viewer.moderationBlocked || !creator || creator.moderationBlocked ||
        isBlockedEitherDirection(userId, resource.createdBy, viewer.blockedUsers || [], creator.blockedUsers || [])) return null;
    return { resource, membership };
  }
  async function blockedPeerIds(viewerId) {
    const [viewer, blockers] = await Promise.all([
      User.findById(viewerId).select("blockedUsers moderationBlocked").lean(),
      User.find({ blockedUsers: viewerId }).select("_id").lean()
    ]);
    if (!viewer || viewer.moderationBlocked) throw new Error("Authenticated user is unavailable");
    return new Set([...(viewer.blockedUsers || []), ...blockers.map(row => row._id)].map(String));
  }
  async function emitToAllowedMembers(req, resourceId, event, payload) {
    const io = req.app.get("io");
    if (!io) return;
    const memberships = await Membership.find({ [resourceKey]: resourceId, status: "active" }).select("userId").lean();
    const recipientIds = memberships.map(row => String(row.userId));
    const [sender, recipients] = await Promise.all([
      User.findById(req.user.id).select("blockedUsers").lean(),
      User.find({ _id: { $in: recipientIds } }).select("_id blockedUsers moderationBlocked").lean()
    ]);
    for (const recipient of recipients) {
      if (!recipient.moderationBlocked &&
          !isBlockedEitherDirection(req.user.id, recipient._id, sender?.blockedUsers || [], recipient.blockedUsers || [])) {
        io.to("user:" + String(recipient._id)).emit(event, payload);
      }
    }
  }
  router.get("/:id/chat/messages", requireAuth, async (req, res) => {
    const context = await loadActiveContext(req.params.id, req.user.id);
    if (!context) return res.status(404).json({ message: "Chat not found" });
    const blocked = await blockedPeerIds(req.user.id);
    const messages = await SocialSpaceChatMessage.find({
      resourceType, resourceId: context.resource._id, senderId: { $nin: [...blocked] }
    }).populate({ path: "senderId", select: "name avatarUrl" }).sort({ createdAt: -1 }).limit(100).lean();
    messages.reverse();
    res.json({ messages });
  });
  router.post("/:id/chat/messages", requireAuth, async (req, res) => {
    const context = await loadActiveContext(req.params.id, req.user.id);
    if (!context) return res.status(404).json({ message: "Chat not found" });
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 2000) return res.status(400).json({ message: "Message must contain 1–2000 characters" });
    const message = await SocialSpaceChatMessage.create({
      resourceType, resourceId: context.resource._id, senderId: req.user.id,
      text, readBy: [req.user.id]
    });
    const populated = await SocialSpaceChatMessage.findById(message._id).populate({ path: "senderId", select: "name avatarUrl" }).lean();
    await emitToAllowedMembers(req, context.resource._id, "social-space:message:new", { ...populated, resourceId: String(context.resource._id), resourceType });
    res.status(201).json(populated);
  });
  router.delete("/:id/chat/messages/:messageId", requireAuth, async (req, res) => {
    const context = await loadActiveContext(req.params.id, req.user.id);
    if (!context || !mongoose.isValidObjectId(req.params.messageId)) return res.status(404).json({ message: "Message not found" });
    const message = await SocialSpaceChatMessage.findOne({
      _id: req.params.messageId, resourceType, resourceId: context.resource._id, deletedAt: null
    }).lean();
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (!canDeleteSpaceChatMessage({ senderId: message.senderId, requesterId: req.user.id, requesterRole: context.membership.role })) {
      return res.status(403).json({ message: "You cannot remove this message" });
    }
    const deletedAt = new Date();
    const updated = await SocialSpaceChatMessage.findOneAndUpdate(
      { _id: message._id, resourceType, resourceId: context.resource._id, deletedAt: null },
      { $set: { text: "This message was removed", deletedAt, deletedBy: req.user.id } },
      { new: true }
    ).populate({ path: "senderId", select: "name avatarUrl" }).lean();
    if (!updated) return res.status(409).json({ message: "Message changed; refresh and try again" });
    await emitToAllowedMembers(req, context.resource._id, "social-space:message:deleted", {
      messageId: String(updated._id), resourceId: String(context.resource._id), resourceType, deletedAt
    });
    res.json({ message: updated });
  });
  router.post("/:id/chat/read", requireAuth, async (req, res) => {
    const context = await loadActiveContext(req.params.id, req.user.id);
    if (!context) return res.status(404).json({ message: "Chat not found" });
    await SocialSpaceChatMessage.updateMany(
      { resourceType, resourceId: context.resource._id, senderId: { $ne: req.user.id }, deletedAt: null, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );
    res.json({ success: true });
  });
  return router;
}

export function createSocialSpaceChatRouters({ Group, GroupMembership, Community, CommunityMembership }) {
  return {
    groupChatRoutes: createChatRouter({ Resource: Group, Membership: GroupMembership, resourceKey: "groupId", resourceType: "group" }),
    communityChatRoutes: createChatRouter({ Resource: Community, Membership: CommunityMembership, resourceKey: "communityId", resourceType: "community" })
  };
}
