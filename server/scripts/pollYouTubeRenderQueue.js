import { setTimeout as sleep } from "node:timers/promises";

const apiBase = (process.env.SHIVASHA_API_URL || "").replace(/\/$/, "");
const token = process.env.YOUTUBE_RENDER_WORKER_TOKEN;
const pollMs = Math.max(5000, Number(process.env.YOUTUBE_RENDER_POLL_MS) || 15000);

if (!apiBase || !token) {
  console.error("Set SHIVASHA_API_URL and YOUTUBE_RENDER_WORKER_TOKEN.");
  process.exit(1);
}

async function poll() {
  const response = await fetch(`${apiBase}/api/youtube/projects/render-worker-claim`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Worker claim failed: HTTP ${response.status}`);
  return response.json();
}

console.log(`SHIVASHA render worker started; polling every ${pollMs}ms.`);
while (true) {
  try {
    const result = await poll();
    if (result.job) {
      console.log(`Claimed project ${result.job.projectId}; renderer adapter is not configured yet.`);
      // Deliberately do not mark this job completed: FFmpeg execution and durable upload
      // must be implemented before this worker can safely process real queued jobs.
    }
  } catch (error) {
    console.error(error.message || "Worker poll error");
  }
  await sleep(pollMs);
}
