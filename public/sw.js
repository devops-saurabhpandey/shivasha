const VERSION = "shivasha-pwa-v2";
const APP_SHELL = ["./", "./manifest.webmanifest", "./images/shivasha-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("shivasha-pwa-") && key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Never cache API calls or authenticated/user-specific responses.
  if (url.pathname.includes("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put("./", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("./")))
    );
    return;
  }

  if (url.pathname.includes("/assets/")) {
    // Prefer the latest deployed asset; use the cached copy only when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(VERSION).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(request)) || Response.error())
    );
  }
});
