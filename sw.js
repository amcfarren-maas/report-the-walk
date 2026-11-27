/* Report the Walk: guarda la app en el teléfono para que abra sin conexión.
   La app: red primero (así llegan las versiones nuevas) y, sin conexión o si tarda, la copia guardada.
   Fuentes y lector de códigos (ZXing): copia guardada primero. Los datos de stock y las visitas NO pasan por aquí: viven en el teléfono.
   La app se pide siempre comprobando con GitHub (cache "reload" / "no-cache"): GitHub Pages deja usar 10 minutos la copia del navegador
   y, sin esto, una versión nueva podía guardar la página de antes (27-11-2026). */
const VERSION = "rtw-20261127-nocache";
const APP = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png", "./icons/favicon-64.png"];
const EXT = ["https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(APP.map(u => new Request(u, {cache: "reload"})));
    for (const u of EXT) { try { await c.add(new Request(u, {mode: "cors"})); } catch (err) { /* se guardará al usarlo */ } }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k.startsWith("rtw-")) await caches.delete(k);
    await self.clients.claim();
  })());
});
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try {
        const res = await withTimeout(fetch(new Request(r.url, {cache: "no-cache", credentials: "same-origin"})), 4000);
        if (res && res.ok) c.put(r, res.clone());
        return res;
      } catch (err) {
        return (await c.match(r, {ignoreSearch: true})) || (r.mode === "navigate" ? await c.match("./index.html") : Response.error());
      }
    })());
    return;
  }
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) || u.hostname === "unpkg.com") {
    e.respondWith((async () => {
      const c = await caches.open(VERSION), m = await c.match(r);
      if (m) return m;
      try { const res = await fetch(r); if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone()); return res; }
      catch (err) { return Response.error(); }
    })());
  }
});
