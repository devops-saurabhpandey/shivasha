import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT || 10000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4"
};

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end("Method Not Allowed");
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    return res.end("Bad Request");
  }

  const relative = pathname.replace(/^\/+/, "");
  let target = path.resolve(root, relative || "index.html");
  if (!target.startsWith(root + path.sep) && target !== path.join(root, "index.html")) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }

  // SPA routes should return index.html; missing asset requests should remain 404s.
  if (!existsSync(target) || !statSync(target).isFile()) {
    if (!path.extname(pathname) || pathname.endsWith(".html")) {
      target = path.join(root, "index.html");
    } else {
      res.writeHead(404);
      return res.end("Not Found");
    }
  }

  if (!existsSync(target)) {
    res.writeHead(500);
    return res.end("Build output missing: run npm run build");
  }

  res.writeHead(200, {
    "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream",
    "Cache-Control": target.endsWith("index.html") ? "no-cache" : "public, max-age=3600"
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(target).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`SHIVASHA frontend serving dist/ on port ${port}`);
});
