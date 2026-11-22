import { Router } from "express";
import mongoose from "mongoose";
import Group from "../models/Group.js";
import GroupMembership from "../models/GroupMembership.js";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { isBlockedEitherDirection } from "../social/blockPolicy.js";
import { canViewGroup, GROUP_MEMBER_ROLE, GROUP_MEMBER_STATUS } from "../social/groupAccessPolicy.js";
import {
  canRequestGroupMembership,
  canReviewGroupMembership,
  getGroupMembershipTransition
} from "../social/groupMembershipPolicy.js";

async function areBlocked(userId, peerId) {
  const [viewer, peer] = await Promise.all([
    User.findById(userId).select("blockedUsers").lean(),
    User.findById(peerId).select("blockedUsers moderationBlocked").lean()
  ]);
  if (!viewer || !peer || peer.moderationBlocked) return true;
  return isBlockedEitherDirection(userId, peerId, viewer.blockedUsers || [], peer.blockedUsers || []);
}

function createResourceRouter({ Resource, Membership, resourceKey, resourceLabel, maxName, maxDescription }) {
  const router = Router();
  const resourceIdFilter = id => ({ [resourceKey]: id });

  async function getViewerMembership(resourceId, userId) {
    return Membership.findOne({ ...resourceIdFilter(resourceId), userId }).lean();
  }

  async function canAccessResource(resource, membership, viewerId) {
    if (!resource || resource.status !== "active") return false;
    if (await areBlocked(viewerId, resource.createdBy)) return false;
    return canViewGroup({ privacy: resource.privacy, membership });
  }

  router.get("/", requireAuth, async (req, res) => {
    const memberships = await Membership.find({ userId: req.user.id }).select(resourceKey + " status").lean();
    const activeIds = memberships.filter(item => item.status === GROUP_MEMBER_STATUS.ACTIVE).map(item => item[resourceKey]);
    const bannedIds = memberships.filter(item => item.status === GROUP_MEMBER_STATUS.BANNED).map(item => item[resourceKey]);
    const blockedOwnerIds = await User.find({ blockedUsers: req.user.id }).distinct("_id");
    const viewer = await User.findById(req.user.id).select("blockedUsers").lean();
    if (!viewer) return res.status(401).json({ message: "Account not found" });
    const excludedOwnerIds = [...new Set([...(viewer.blockedUsers || []), ...blockedOwnerIds].map(String))];
    const filter = {
      status: "active",
      createdBy: { $nin: excludedOwnerIds },
      _id: { $nin: bannedIds },
      $or: [{ privacy: "public" }, { _id: { $in: activeIds } }]
    };
    const items = await Resource.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json(items);
  });

  router.post("/", requireAuth, async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
    const privacy = req.body?.privacy === undefined ? "private" : req.body.privacy;
    if (name.length < 2 || name.length > maxName) {
      return res.status(400).json({ message: name.length > maxName ? "Name is too long" : "A valid name is required" });
    }
    if (description.length > maxDescription) return res.status(400).json({ message: "Description is too long" });
    if (!["public", "private", "invite-only"].includes(privacy)) {
      return res.status(400).json({ message: "Invalid privacy setting" });
    }
    let resource;
    try {
      resource = await Resource.create({ name, description, privacy, createdBy: req.user.id });
      await Membership.create({
        [resourceKey]: resource._id,
        userId: req.user.id,
        role: GROUP_MEMBER_ROLE.OWNER,
        status: GROUP_MEMBER_STATUS.ACTIVE,
        joinedAt: new Date()
      });
    } catch (error) {
      if (resource?._id) await Resource.deleteOne({ _id: resource._id }).catch(() => {});
      if (error?.code === 11000) return res.status(409).json({ message: "Membership already exists" });
      if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ message: "Invalid " + resourceLabel + " data" });
      throw error;
    }
    res.status(201).json({ [resourceLabel]: resource });
  });

  router.get("/:id", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: resourceLabel + " not found" });
    const resource = await Resource.findById(req.params.id).lean();
    if (!resource) return res.status(404).json({ message: resourceLabel + " not found" });
    const membership = await getViewerMembership(resource._id, req.user.id);
    if (!await canAccessResource(resource, membership, req.user.id)) {
      return res.status(404).json({ message: resourceLabel + " not found" });
    }
    res.json({ [resourceLabel]: resource, membership: membership || null });
  });

  router.post("/:id/join", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: resourceLabel + " not found" });
    const resource = await Resource.findById(req.params.id).lean();
    if (!resource || resource.status !== "active") return res.status(404).json({ message: resourceLabel + " not found" });
    if (await areBlocked(req.user.id, resource.createdBy)) return res.status(404).json({ message: resourceLabel + " not found" });
    const existing = await getViewerMembership(resource._id, req.user.id);
    const allowed = canRequestGroupMembership({
      privacy: resource.privacy,
      existingMembership: existing,
      isBlocked: false,
      hasValidInvite: false
    });
    if (!allowed) {
      if (resource.privacy === "invite-only") return res.status(403).json({ message: "A valid invitation is required" });
      if (existing?.status === GROUP_MEMBER_STATUS.BANNED) return res.status(403).json({ message: "Membership is restricted" });
      return res.status(409).json({ message: "A membership request is already active" });
    }
    let membership;
    try {
      if (existing?.status === GROUP_MEMBER_STATUS.REMOVED) {
        membership = await Membership.findOneAndUpdate(
          { _id: existing._id, status: GROUP_MEMBER_STATUS.REMOVED },
          { $set: { status: GROUP_MEMBER_STATUS.PENDING, role: GROUP_MEMBER_ROLE.MEMBER, invitedBy: null, joinedAt: null } },
          { new: true, runValidators: true }
        );
        if (!membership) return res.status(409).json({ message: "Membership changed; try again" });
      } else {
        membership = await Membership.create({
          [resourceKey]: resource._id,
          userId: req.user.id,
          role: GROUP_MEMBER_ROLE.MEMBER,
          status: GROUP_MEMBER_STATUS.PENDING
        });
      }
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ message: "A membership request already exists" });
      throw error;
    }
    res.status(202).json({ status: membership.status, message: "Membership request submitted" });
  });

  router.post("/:id/leave", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: resourceLabel + " not found" });
    const membership = await Membership.findOne({ ...resourceIdFilter(req.params.id), userId: req.user.id });
    if (!membership || membership.status !== GROUP_MEMBER_STATUS.ACTIVE) {
      return res.status(404).json({ message: "Active membership not found" });
    }
    if (membership.role === GROUP_MEMBER_ROLE.OWNER) {
      return res.status(409).json({ message: "Transfer ownership before leaving" });
    }
    membership.status = GROUP_MEMBER_STATUS.REMOVED;
    membership.joinedAt = null;
    await membership.save();
    res.json({ left: true });
  });

  router.post("/:id/members/:userId/review", requireAuth, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.userId)) {
      return res.status(404).json({ message: "Membership not found" });
    }
    const action = String(req.body?.action || "");
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be approve or reject" });
    }
    const [actorMembership, targetMembership] = await Promise.all([
      Membership.findOne({ ...resourceIdFilter(req.params.id), userId: req.user.id, status: GROUP_MEMBER_STATUS.ACTIVE }).lean(),
      Membership.findOne({ ...resourceIdFilter(req.params.id), userId: req.params.userId })
    ]);
    if (!actorMembership || !targetMembership ||
        !canReviewGroupMembership({ actorRole: actorMembership.role, targetMembership, action })) {
      return res.status(403).json({ message: "You are not allowed to review this membership" });
    }
    const transition = getGroupMembershipTransition(action);
    const updated = await Membership.findOneAndUpdate(
      { _id: targetMembership._id, status: GROUP_MEMBER_STATUS.PENDING, role: { $ne: GROUP_MEMBER_ROLE.OWNER } },
      { $set: transition },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(409).json({ message: "Membership changed; refresh and try again" });
    res.json({ userId: updated.userId, status: updated.status });
  });

  return router;
}

export const groupRoutes = createResourceRouter({
  Resource: Group,
  Membership: GroupMembership,
  resourceKey: "groupId",
  resourceLabel: "group",
  maxName: 100,
  maxDescription: 1000
});

export const communityRoutes = createResourceRouter({
  Resource: Community,
  Membership: CommunityMembership,
  resourceKey: "communityId",
  resourceLabel: "community",
  maxName: 120,
  maxDescription: 1500
});
