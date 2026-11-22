import { Router } from "express";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

async function getBlockedPeerIds(viewerId) {
  const [viewer, blockers] = await Promise.all([
    User.findById(viewerId).select("blockedUsers").lean(),
    User.find({ blockedUsers: viewerId }).select("_id").lean()
  ]);
  if (!viewer) throw new Error("Authenticated user not found");
  return [...new Set([...(viewer.blockedUsers || []), ...blockers.map(user => user._id)].map(id => String(id)))];
}

router.get("/", requireAuth, async (req, res) => {
  const blockedIds = await getBlockedPeerIds(req.user.id);
  const visibleFilter = { recipient: req.user.id, actor: { $nin: blockedIds } };
  const notifications = await Notification.find(visibleFilter)
    .populate("actor", "name avatarUrl")
    .sort({ createdAt: -1 })
    .limit(50);
  const unread = await Notification.countDocuments({ ...visibleFilter, read: false });
  res.json({ notifications, unread });
});

router.post("/read", requireAuth, async (req, res) => {
  await Notification.updateMany({ recipient: req.user.id, read: false }, { $set: { read: true } });
  res.json({ success: true });
});

export default router;
