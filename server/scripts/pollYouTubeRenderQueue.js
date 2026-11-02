import { setTimeout as sleep } from "node:timers/promises";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

const apiBase = (process.env.SHIVASHA_API_URL || "").replace(/\/$/, "");
const token = process.env.YOUTUBE_RENDER_WORKER_TOKEN;
const pollMs = Math.max(5000, Number(process.env.YOUTUBE_RENDER_POLL_MS) || 15000);
const maxOutputBytes = 900 * 1024 * 1024;

if (!apiBase || !token) {
  console.error("Set SHIVASHA_API_URL and YOUTUBE_RENDER_WORKER_TOKEN.");
  process.exit(1);
}
if (!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
  console.error("Set Cloudinary credentials for durable rendered video storage.");
  process.exit(1);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const workerHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
async function api(pathname, body) {
  const response = await fetch(`${apiBase}${pathname}`, {
    method: "POST", headers: workerHeaders, body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `API request failed: HTTP ${response.status}`);
  return payload;
}
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("close", code => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)));
  });
}
async function uploadVideo(file, projectId) {
  const info = await stat(file);
  if (info.size > maxOutputBytes) throw new Error("Rendered MP4 exceeds the 900 MB upload limit.");
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: "video",
      folder: "shivasha/youtube-renders",
      public_id: `project-${projectId}-${Date.now()}`,
      format: "mp4"
    }, (error, result) => error ? reject(error) : resolve(result.secure_url));
    readFile(file).then(bytes => stream.end(bytes)).catch(reject);
  });
}
async function processJob(job) {
  const work = await mkdtemp(path.join(tmpdir(), "shivasha-youtube-worker-"));
  const manifestPath = path.join(work, "manifest.json");
  const outputPath = path.join(work, "render.mp4");
  try {
    const manifest = {
      projectId: job.projectId,
      title: job.title,
      format: job.format,
      durationSeconds: job.durationSeconds,
      aspectRatio: job.format === "short" ? "9:16" : "16:9",
      captionsSrt: job.captionsSrt,
      voiceoverUrl: job.voiceoverUrl,
      sceneAssets: job.sceneAssets
    };
    await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
    await run("node", [path.resolve("scripts/renderYouTubeProject.js"), manifestPath, outputPath]);
    const outputUrl = await uploadVideo(outputPath, job.projectId);
    await api("/api/youtube/projects/render-worker-result", {
      projectId: job.projectId, status: "completed", outputUrl
    });
    console.log(`Completed render for project ${job.projectId}`);
  } catch (error) {
    const message = String(error?.message || "Render failed").slice(0, 900);
    try {
      await api("/api/youtube/projects/render-worker-result", {
        projectId: job.projectId, status: "failed", error: message
      });
    } catch (callbackError) {
      console.error(`Result callback failed for ${job.projectId}: ${callbackError.message}`);
    }
    console.error(`Render failed for ${job.projectId}: ${message}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

console.log(`SHIVASHA YouTube render worker started; polling every ${pollMs}ms.`);
while (true) {
  try {
    const result = await api("/api/youtube/projects/render-worker-claim", {});
    if (result.job) await processJob(result.job);
  } catch (error) {
    console.error(error.message || "Worker poll error");
  }
  await sleep(pollMs);
}
