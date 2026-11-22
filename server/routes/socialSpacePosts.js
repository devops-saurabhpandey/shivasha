import { Router } from "express";
import mongoose from "mongoose";
import SocialSpacePost from "../models/SocialSpacePost.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { isBlockedEitherDirection } from "../social/blockPolicy.js";
import { canCreateSpacePost, canReadSpaceContent, canDeleteSpacePost, canEditSpacePost, normalizeSpacePostText, normalizeSpaceCommentText } from "../social/socialSpacePostPolicy.js";

function createSpacePostRouter({ Resource, Membership, resourceType, resourceKey }) {
 const router = Router();
 async function loadContext(resourceId, userId) {
  const resource = await Resource.findById(resourceId).lean();
  if (!resource) return null;
  const [membership, viewer, creator] = await Promise.all([
   Membership.findOne({ [resourceKey]: resource._id, userId }).lean(),
   User.findById(userId).select("blockedUsers").lean(),
   User.findById(resource.createdBy).select("blockedUsers moderationBlocked").lean()
  ]);
  if (!viewer || !creator || creator.moderationBlocked || isBlockedEitherDirection(userId, resource.createdBy, viewer.blockedUsers || [], creator.blockedUsers || [])) return null;
  return { resource, membership };
 }
 async function excludedAuthors(viewerId) {
  const [viewer, blockers] = await Promise.all([
   User.findById(viewerId).select("blockedUsers").lean(),
   User.find({ blockedUsers: viewerId }).select("_id").lean()
  ]);
  if (!viewer) throw new Error("Authenticated user not found");
  return [...new Set([...(viewer.blockedUsers || []), ...blockers.map(user => user._id)].map(String))];
 }
 const validId = id => mongoose.isValidObjectId(id);
 router.get("/:id/posts", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Resource not found" });
  const context = await loadContext(req.params.id, req.user.id);
  if (!context || !canReadSpaceContent({ resourceStatus: context.resource.status, privacy: context.resource.privacy, membership: context.membership })) return res.status(404).json({ message: "Resource not found" });
  const posts = await SocialSpacePost.find({ resourceType, resourceId: context.resource._id, authorId: { $nin: await excludedAuthors(req.user.id) } })
   .populate({ path: "authorId", select: "name avatarUrl" })
   .populate({ path: "comments.userId", select: "name avatarUrl" })
   .populate({ path: "comments.replies.userId", select: "name avatarUrl" })
   .sort({ createdAt: -1 }).limit(50).lean();
  res.json({ posts });
 });
 router.post("/:id/posts", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Resource not found" });
  const context = await loadContext(req.params.id, req.user.id);
  if (!context) return res.status(404).json({ message: "Resource not found" });
  if (!canCreateSpacePost({ resourceStatus: context.resource.status, membership: context.membership })) return res.status(403).json({ message: "Active membership is required to publish" });
  const text = normalizeSpacePostText(req.body?.text);
  if (!text) return res.status(400).json({ message: "Post text must contain 1 to 3000 characters" });
  const post = await SocialSpacePost.create({ resourceType, resourceId: context.resource._id, authorId: req.user.id, text });
  res.status(201).json({ post });
 });
 router.post("/:id/posts/:postId/like", requireAuth, async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.postId)) return res.status(404).json({ message: "Post not found" });
  const context = await loadContext(req.params.id, req.user.id);
  if (!context || !canCreateSpacePost({ resourceStatus: context.resource.status, membership: context.membership })) return res.status(404).json({ message: "Post not found" });
  const post = await SocialSpacePost.findOne({ _id: req.params.postId, resourceType, resourceId: context.resource._id });
  if (!post) return res.status(404).json({ message: "Post not found" });
  const [viewer, author] = await Promise.all([User.findById(req.user.id).select("blockedUsers").lean(), User.findById(post.authorId).select("blockedUsers moderationBlocked").lean()]);
  if (!viewer || !author || author.moderationBlocked || isBlockedEitherDirection(req.user.id, post.authorId, viewer.blockedUsers || [], author.blockedUsers || [])) return res.status(404).json({ message: "Post not found" });
  const userId = String(req.user.id), alreadyLiked = post.likes.some(id => String(id) === userId);
  post.likes = alreadyLiked ? post.likes.filter(id => String(id) !== userId) : [...post.likes, req.user.id];
  await post.save();
  res.json({ liked: !alreadyLiked, likesCount: post.likes.length });
 });
 router.post("/:id/posts/:postId/comments", requireAuth, async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.postId)) return res.status(404).json({ message: "Post not found" });
  const context = await loadContext(req.params.id, req.user.id);
  if (!context || !canCreateSpacePost({ resourceStatus: context.resource.status, membership: context.membership })) return res.status(404).json({ message: "Post not found" });
  const text = normalizeSpaceCommentText(req.body?.text);
  if (!text) return res.status(400).json({ message: "Comment must contain 1 to 1000 characters" });
  const post = await SocialSpacePost.findOne({ _id: req.params.postId, resourceType, resourceId: context.resource._id });
  if (!post) return res.status(404).json({ message: "Post not found" });
  const [viewer, author] = await Promise.all([User.findById(req.user.id).select("blockedUsers").lean(), User.findById(post.authorId).select("blockedUsers moderationBlocked").lean()]);
  if (!viewer || !author || author.moderationBlocked || isBlockedEitherDirection(req.user.id, post.authorId, viewer.blockedUsers || [], author.blockedUsers || [])) return res.status(404).json({ message: "Post not found" });
  post.comments.push({ userId: req.user.id, text });
  await post.save();
  res.status(201).json({ comment: post.comments[post.comments.length - 1] });
 });
 router.patch("/:id/posts/:postId", requireAuth, async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.postId)) return res.status(404).json({ message: "Post not found" });
  const context = await loadContext(req.params.id, req.user.id);
  if (!context || !canCreateSpacePost({ resourceStatus: context.resource.status, membership: context.membership })) return res.status(404).json({ message: "Post not found" });
  const post = await SocialSpacePost.findOne({ _id: req.params.postId, resourceType, resourceId: context.resource._id });
  if (!post || !canEditSpacePost({ authorId: post.authorId, requesterId: req.user.id })) return res.status(404).json({ message: "Post not found" });
  const text = normalizeSpacePostText(req.body?.text);
  if (!text) return res.status(400).json({ message: "Post text must contain 1 to 3000 characters" });
  post.text = text; post.editedAt = new Date(); await post.save();
  res.json({ post });
 });
 router.delete("/:id/posts/:postId", requireAuth, async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.postId)) return res.status(404).json({ message: "Post not found" });
  const context = await loadContext(req.params.id, req.user.id);
  if (!context || context.membership?.status !== "active") return res.status(404).json({ message: "Post not found" });
  const post = await SocialSpacePost.findOne({ _id: req.params.postId, resourceType, resourceId: context.resource._id });
  if (!post) return res.status(404).json({ message: "Post not found" });
  if (!canDeleteSpacePost({ authorId: post.authorId, requesterId: req.user.id, requesterRole: context.membership.role })) return res.status(403).json({ message: "You cannot moderate this post" });
  await post.deleteOne();
  res.json({ deleted: true, postId: req.params.postId });
 });
 return router;
}
export function createSocialSpacePostRouters({ Group, GroupMembership, Community, CommunityMembership }) {
 return {
  groupPostRoutes: createSpacePostRouter({ Resource: Group, Membership: GroupMembership, resourceType: "group", resourceKey: "groupId" }),
  communityPostRoutes: createSpacePostRouter({ Resource: Community, Membership: CommunityMembership, resourceType: "community", resourceKey: "communityId" })
 };
}
