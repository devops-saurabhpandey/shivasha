import { setTimeout as sleep } from "node:timers/promises";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

const apiBase = (process.env.SHIVASHA_API_URL || "").replace(/\/$/, "");
const token = process.env.CINEMATIC_RENDER_WORKER_TOKEN;
const pollMs = Math.max(5000, Number(process.env.CINEMATIC_RENDER_POLL_MS) || 15000);
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const maxSourceBytes = 50 * 1024 * 1024;
const maxOutputBytes = 900 * 1024 * 1024;

if (!apiBase || !token) {
  console.error("Set SHIVASHA_API_URL and CINEMATIC_RENDER_WORKER_TOKEN.");
  process.exit(1);
}
if (!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
  console.error("Set Cloudinary credentials for rendered video storage.");
  process.exit(1);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
async function api(route, body) {
  const response = await fetch(`${apiBase}${route}`, {
    method: "POST", headers, body: JSON.stringify(body),
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
async function downloadSource(url, destination) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !(parsed.hostname === "res.cloudinary.com" || parsed.hostname.endsWith(".cloudinary.com"))) {
    throw new Error("Source video must be hosted on Cloudinary HTTPS storage.");
  }
  const response = await fetch(parsed, { signal: AbortSignal.timeout(180000), redirect: "error" });
  if (!response.ok) throw new Error(`Source download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maxSourceBytes) throw new Error("Source video is empty or exceeds the 50 MB limit.");
  await writeFile(destination, bytes);
}
function gradingFilter(look, intensity) {
  const amount = Math.max(0, Math.min(1, Number(intensity) / 100));
  if (look === "natural" || look === "custom") {
    return `eq=contrast=${(1 + amount * 0.08).toFixed(3)}:saturation=${(1 + amount * 0.06).toFixed(3)}:brightness=0`;
  }
  if (look === "social") {
    return `eq=contrast=${(1 + amount * 0.22).toFixed(3)}:saturation=${(1 + amount * 0.28).toFixed(3)}:brightness=${(amount * 0.015).toFixed(3)}`;
  }
  return `eq=contrast=${(1 + amount * 0.18).toFixed(3)}:saturation=${(1 + amount * 0.12).toFixed(3)}:brightness=${(-amount * 0.012).toFixed(3)},colorbalance=rs=${(amount * 0.025).toFixed(3)}:bs=${(-amount * 0.025).toFixed(3)}`;
}
async function uploadOutput(file, jobId) {
  const info = await stat(file);
  if (info.size > maxOutputBytes) throw new Error("Rendered MP4 exceeds the 900 MB upload limit.");
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: "video", folder: "shivasha/cinematic/renders",
      public_id: `job-${jobId}-${Date.now()}`, format: "mp4"
    }, (error, result) => error ? reject(error) : resolve(result.secure_url));
    readFile(file).then(bytes => stream.end(bytes)).catch(reject);
  });
}
async function processJob(job) {
  const work = await mkdtemp(path.join(tmpdir(), "shivasha-cinematic-"));
  const input = path.join(work, "source-video");
  const output = path.join(work, "render.mp4");
  try {
    if (job.settings?.background !== "original" || job.settings?.audio !== "original") {
      throw new Error("This worker currently supports color grading with original background and audio only. AI background/audio options are not active yet.");
    }
    await downloadSource(job.sourceUrl, input);
    await run(ffmpeg, [
      "-y", "-i", input, "-map", "0:v:0", "-map", "0:a?", "-vf",
      gradingFilter(job.settings?.look || "cinematic", job.settings?.intensity ?? 65),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", output
    ]);
    const outputUrl = await uploadOutput(output, job.id);
    await api("/api/cinematic-video/render-worker-result", {
      jobId: job.id, status: "completed", outputUrl
    });
    console.log(`Completed cinematic render: ${job.id}`);
  } catch (error) {
    const message = String(error?.message || "Render failed").slice(0, 900);
    try {
      await api("/api/cinematic-video/render-worker-result", {
        jobId: job.id, status: "failed", error: message
      });
    } catch (callbackError) {
      console.error(`Result callback failed for ${job.id}: ${callbackError.message}`);
    }
    console.error(`Cinematic render failed for ${job.id}: ${message}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

console.log(`SHIVASHA cinematic render worker started; polling every ${pollMs}ms.`);
while (true) {
  try {
    const result = await api("/api/cinematic-video/render-worker-claim", {});
    if (result.job) await processJob(result.job);
  } catch (error) {
    console.error(error.message || "Worker poll error");
  }
  await sleep(pollMs);
}
