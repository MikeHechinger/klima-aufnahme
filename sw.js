const CACHE = "klima-aufnahme-v1";
const ASSETS = ["./", "./index.html", "./app.css", "./app.js", "./schema.js", "./pdf.js", "./lib/jspdf.umd.min.js",
  "./logo-small.jpg", "./manifest.webmanifest", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Netz zuerst (aktuelle Version), bei fehlendem Empfang aus dem Cache
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match("./index.html"))));
});
