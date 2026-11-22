import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import SocialSpacePost from "../models/SocialSpacePost.js";
import SocialSpaceMediaAsset from "../models/SocialSpaceMediaAsset.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { isBlockedEitherDirection } from "../social/blockPolicy.js";
import { detectSocialMediaType } from "../media/socialMediaSignature.js";
import { canCreateSpacePost, canReadSpaceContent, canDeleteSpacePost, canEditSpacePost, normalizeSpacePostText, normalizeSpaceCommentText } from "../social/socialSpacePostPolicy.js";

function createSpacePostRouter({ Resource, Membership, resourceType, resourceKey }) {
 const router = Router();
 const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 150 * 1024 * 1024, files: 1 } });
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
 router.post("/:id/posts/media", requireAuth, upload.single("media"), async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Resource not found" });
  const context = await loadContext(req.params.id, req.user.id);
  if (!context || !canCreateSpacePost({ resourceStatus: context.resource.status, membership: context.membership })) return res.status(403).json({ message: "Active membership is required to upload media" });
  if (!req.file) return res.status(400).json({ message: "Select one image or video file" });
  const mediaType = detectSocialMediaType(req.file.buffer, req.file.mimetype);
  if (!mediaType) return res.status(415).json({ message: "File content does not match a supported image or video type" });
  const limit = mediaType === "image" ? 15 * 1024 * 1024 : 150 * 1024 * 1024;
  if (req.file.size > limit) return res.status(413).json({ message: mediaType === "image" ? "Images are limited to 15 MB" : "Videos are limited to 150 MB" });
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
   return res.status(503).json({ message: "Media storage is not configured. Configure Cloudinary before enabling uploads." });
  }
  let cloudinary, uploaded;
  try {
   const { v2 } = await import("cloudinary");
   cloudinary = v2;
   cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
   uploaded = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
     folder: "shivasha/social-spaces/" + resourceType,
     resource_type: mediaType === "video" ? "video" : "image",
     ...(mediaType === "image" ? { transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }] } : {}),
     timeout: 120000
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(req.file.buffer);
   });
   const asset = await SocialSpaceMediaAsset.create({
    ownerId: req.user.id, resourceType, resourceId: context.resource._id,
    mediaType, mimeType: req.file.mimetype, secureUrl: uploaded.secure_url,
    publicId: uploaded.public_id, bytes: uploaded.bytes || req.file.size
   });
   return res.status(201).json({ assetId: asset._id, mediaType, url: asset.secureUrl, bytes: asset.bytes });
  } catch (error) {
   if (uploaded?.public_id && cloudinary) {
    try { await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: mediaType === "video" ? "video" : "image" }); } catch {}
   }
   return res.status(503).json({ message: "Media upload could not be completed" });
  }
 });
 router.post("/:id/posts", requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: "Resource not found" });
  const context = await loadContext(req.params.id, req.user.id);
  if (!context) return res.status(404).json({ message: "Resource not found" });
  if (!canCreateSpacePost({ resourceStatus: context.resource.status, membership: context.membership })) return res.status(403).json({ message: "Active membership is required to publish" });
  const text = normalizeSpacePostText(req.body?.text) || "";
  const ids = req.body?.mediaAssetIds === undefined ? [] : req.body.mediaAssetIds;
  if (!Array.isArray(ids) || ids.length > 4 || ids.some(id => !validId(id)) || new Set(ids.map(String)).size !== ids.length) return res.status(400).json({ message: "Provide up to four unique valid mediaAssetIds" });
  if (!text && ids.length === 0) return res.status(400).json({ message: "Post text or media is required" });
  const assets = ids.length ? await SocialSpaceMediaAsset.find({ _id: { $in: ids }, ownerId: req.user.id, resourceType, resourceId: context.resource._id, status: "uploaded" }) : [];
  if (assets.length !== ids.length) return res.status(400).json({ message: "One or more media assets are invalid, already used, or belong to another resource" });
  if (ids.length) {
   const claimed = await SocialSpaceMediaAsset.updateMany({ _id: { $in: ids }, ownerId: req.user.id, resourceType, resourceId: context.resource._id, status: "uploaded" }, { $set: { status: "attached" } });
   if (claimed.modifiedCount !== ids.length) return res.status(409).json({ message: "A media asset was already attached. Upload it again." });
  }
  try {
   const post = await SocialSpacePost.create({
    resourceType, resourceId: context.resource._id, authorId: req.user.id, text,
    attachments: assets.map(asset => ({ mediaType: asset.mediaType, url: asset.secureUrl, mimeType: asset.mimeType, bytes: asset.bytes }))
   });
   if (ids.length) await SocialSpaceMediaAsset.updateMany({ _id: { $in: ids }, status: "attached" }, { $set: { postId: post._id } });
   res.status(201).json({ post });
  } catch (error) {
   if (ids.length) await SocialSpaceMediaAsset.updateMany({ _id: { $in: ids }, ownerId: req.user.id, status: "attached", postId: null }, { $set: { status: "uploaded" } });
   throw error;
  }
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
 router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Media file exceeds the 150 MB upload limit" });
  return res.status(400).json({ message: "Media upload request is invalid" });
 });
 return router;
}
export function createSocialSpacePostRouters({ Group, GroupMembership, Community, CommunityMembership }) {
 return {
  groupPostRoutes: createSpacePostRouter({ Resource: Group, Membership: GroupMembership, resourceType: "group", resourceKey: "groupId" }),
  communityPostRoutes: createSpacePostRouter({ Resource: Community, Membership: CommunityMembership, resourceType: "community", resourceKey: "communityId" })
 };
}
