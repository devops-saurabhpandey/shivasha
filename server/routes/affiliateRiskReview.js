import express from "express";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import AffiliateCommission from "../models/AffiliateCommission.js";
import AffiliateEvent from "../models/AffiliateEvent.js";
import buildAffiliateRiskSignals from "../utils/affiliateRiskSignals.js";

const router = express.Router();

router.use(requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required." });
    next();
  } catch (error) { next(error); }
});

// Returns explainable risk indicators for human review. Signals never change
// commission status and do not make an automatic fraud determination.
router.get("/", async (_req, res, next) => {
  try {
    const pending = await AffiliateCommission.find({ status: "pending_review" })
      .populate("partner", "code user")
      .populate({ path: "partner", populate: { path: "user", select: "name email" } })
      .populate("user", "name email")
      .sort({ createdAt: -1 }).limit(200).lean();

    const now = Date.now();
    const reviews = await Promise.all(pending.map(async commission => {
      const partnerId = commission.partner?._id;
      const buyerId = commission.user?._id;
      const [clicksLastHour, buyerConversionsLastDay] = await Promise.all([
        partnerId ? AffiliateEvent.countDocuments({ partner: partnerId, type: "click", createdAt: { $gte: new Date(now - 60 * 60 * 1000) } }) : 0,
        partnerId && buyerId ? AffiliateCommission.countDocuments({
          partner: partnerId, user: buyerId, status: { $in: ["pending_review", "approved"] },
          createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) }
        }) : 0
      ]);
      const riskSignals = buildAffiliateRiskSignals({
        grossAmount: commission.grossAmount, ratePercent: commission.ratePercent,
        clicksLastHour, buyerConversionsLastDay
      });
      return { commission, riskSignals, riskLevel: riskSignals.length ? "review" : "no_signal", context: { clicksLastHour, buyerConversionsLastDay } };
    }));
    res.json({ reviews, note: "Risk signals are advisory only. Verify source records and give partners a fair opportunity to explain before any decision." });
  } catch (error) { next(error); }
});

export default router;
