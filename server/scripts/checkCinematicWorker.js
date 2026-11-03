import { spawn } from "node:child_process";

const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const child = spawn(ffmpeg, ["-version"], { stdio: "inherit" });
child.once("error", error => {
  console.error("FFmpeg is not installed or FFMPEG_PATH is incorrect:", error.message);
  process.exitCode = 1;
});
child.once("close", code => {
  if (code !== 0) process.exitCode = code || 1;
});
