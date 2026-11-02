import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const input = process.argv[2];
const output = process.argv[3] || "shivasha-youtube-output.mp4";
if (!input) {
  console.error("Usage: npm run youtube:render -- <manifest.json> [output.mp4]");
  process.exit(1);
}

const manifest = JSON.parse(await readFile(path.resolve(input), "utf8"));
if (!Array.isArray(manifest.sceneAssets) || !manifest.sceneAssets.length) throw new Error("Manifest has no scene assets.");
if (!manifest.voiceoverUrl) throw new Error("Manifest has no voice-over URL.");
const ratio = manifest.aspectRatio === "9:16" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
const work = await mkdtemp(path.join(tmpdir(), "shivasha-render-"));
const run = args => new Promise((resolve, reject) => {
  const child = spawn("ffmpeg", args, { stdio: "inherit" });
  child.once("error", reject);
  child.once("close", code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)));
});
const download = async (url, destination) => {
  if (!/^https:\/\//i.test(url)) throw new Error("Only HTTPS media URLs are accepted.");
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Media download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 250 * 1024 * 1024) throw new Error("A media file exceeds the 250 MB worker limit.");
  await writeFile(destination, bytes);
};

try {
  const clips = [];
  for (let i = 0; i < manifest.sceneAssets.length; i++) {
    const asset = manifest.sceneAssets[i];
    const source = path.join(work, `source-${i}.${asset.type === "image" ? "img" : "video"}`);
    const clip = path.join(work, `clip-${i}.mp4`);
    await download(asset.url, source);
    const duration = Math.max(1, Math.min(600, Number(asset.duration) || 5));
    const vf = `scale=${ratio.width}:${ratio.height}:force_original_aspect_ratio=increase,crop=${ratio.width}:${ratio.height},setsar=1,fps=30,format=yuv420p`;
    const args = ["-y"];
    if (asset.type === "image") args.push("-loop", "1");
    args.push("-i", source, "-vf", vf, "-t", String(duration), "-an", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", clip);
    await run(args);
    clips.push(clip);
  }

  const listPath = path.join(work, "concat.txt");
  await writeFile(listPath, clips.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"));
  const joined = path.join(work, "joined.mp4");
  await run(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", joined]);

  const audioPath = path.join(work, "voiceover.audio");
  await download(manifest.voiceoverUrl, audioPath);
  const args = ["-y", "-i", joined, "-i", audioPath, "-map", "0:v:0", "-map", "1:a:0"];
  if (typeof manifest.captionsSrt === "string" && manifest.captionsSrt.includes("-->")) {
    const srtPath = path.join(work, "captions.srt");
    await writeFile(srtPath, manifest.captionsSrt, "utf8");
    const escaped = srtPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
    args.push("-vf", `subtitles='${escaped}':force_style='FontName=Arial,FontSize=24,Outline=2,Shadow=1,Alignment=2,MarginV=50'`);
  }
  args.push("-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", "-movflags", "+faststart", path.resolve(output));
  await run(args);
  console.log(`Rendered video: ${path.resolve(output)}`);
  console.log(manifest.captionsSrt?.includes("-->") ? "SRT captions burned into the MP4." : "No valid SRT captions supplied; MP4 rendered without burned captions.");
} finally {
  await rm(work, { recursive: true, force: true });
}
