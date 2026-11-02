import { Router } from "express";
import YouTubeProject from "../models/YouTubeProject.js";

const router = Router();

function requireWorker(req, res, next) {
  const expected = process.env.YOUTUBE_RENDER_WORKER_TOKEN;
  const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied || supplied !== expected) {
    return res.status(401).json({ message: "Worker authentication failed." });
  }
  next();
}

// Internal worker endpoint: recover stale jobs, then atomically claim one queued project.
// A worker that dies leaves a running job; after 45 minutes it becomes eligible again.
router.post("/render-worker-claim", requireWorker, async (_req, res) => {
  try {
    const staleBefore = new Date(Date.now() - 45 * 60 * 1000);
    await YouTubeProject.updateMany(
      { renderStatus: "running", renderStartedAt: { $lt: staleBefore } },
      { $set: { renderStatus: "queued", renderStartedAt: null, renderError: "Previous worker timed out; job re-queued automatically." } }
    );
    const project = await YouTubeProject.findOneAndUpdate(
      { renderStatus: "queued" },
      { $set: { renderStatus: "running", renderStartedAt: new Date(), renderError: "" } },
      { new: true, sort: { updatedAt: 1 } }
    ).lean();

    if (!project) return res.json({ job: null });

    res.json({
      job: {
        projectId: String(project._id),
        title: project.title,
        format: project.format,
        durationSeconds: project.duration,
        captionsSrt: project.captions,
        voiceoverUrl: project.voiceoverUrl,
        sceneAssets: project.sceneAssets || []
      }
    });
  } catch {
    res.status(500).json({ message: "Could not claim render job." });
  }
});

export default router;
