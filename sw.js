/* Forager's Atlas — service worker (offline app shell) */
var CACHE = "forage-atlas-v1";
var ASSETS = [
  "./foraging.html",
  "./forage-data.js",
  "./forage-art.js",
  "./manifest.json",
  "./forage-icon.svg",
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Cross-origin (e.g. Wikipedia photos, fonts): try network, no caching of opaque bloat.
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(req).catch(function () { return caches.match(req); }));
    return;
  }

  // Navigation requests: serve the app shell so deep links work offline.
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./foraging.html").then(function (r) { return r || fetch(req); })
    );
    return;
  }

  // Same-origin assets: cache-first, then network (and cache the result).
  e.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return cached; });
    })
  );
});
