import { Router } from "express";
import mongoose from "mongoose";
import YouTubeProject from "../models/YouTubeProject.js";

const router = Router();

router.post("/render-worker-result", async (req, res) => {
  const expected = process.env.YOUTUBE_RENDER_WORKER_TOKEN;
  const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied || supplied !== expected) {
    return res.status(401).json({ message: "Worker authentication failed." });
  }

  const projectId = String(req.body?.projectId || "");
  const status = req.body?.status;
  const outputUrl = typeof req.body?.outputUrl === "string" ? req.body.outputUrl.trim() : "";
  const error = typeof req.body?.error === "string" ? req.body.error.trim().slice(0, 1000) : "";

  if (!mongoose.isValidObjectId(projectId)) return res.status(400).json({ message: "Invalid project ID." });
  if (!["completed", "failed"].includes(status)) return res.status(400).json({ message: "Status must be completed or failed." });
  if (status === "completed" && (!/^https:\/\//i.test(outputUrl) || outputUrl.length > 2000)) {
    return res.status(400).json({ message: "A valid HTTPS output URL is required." });
  }

  try {
    const values = status === "completed"
      ? { renderStatus: "completed", renderOutputUrl: outputUrl, renderError: "", renderStartedAt: null }
      : { renderStatus: "failed", renderOutputUrl: "", renderError: error || "Worker rendering failed.", renderStartedAt: null };
    const project = await YouTubeProject.findOneAndUpdate(
      { _id: projectId, renderStatus: "running" },
      { $set: values },
      { new: true }
    ).select("_id renderStatus renderOutputUrl renderError").lean();

    if (!project) return res.status(409).json({ message: "Project not found or is not currently running." });
    return res.json({ projectId: String(project._id), status: project.renderStatus });
  } catch {
    return res.status(500).json({ message: "Could not save render result." });
  }
});

export default router;
