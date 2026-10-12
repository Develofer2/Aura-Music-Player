/** Versioned application-shell service worker. Personal data stays in IndexedDB. */
const manifest = self.__WB_MANIFEST
const version = manifest
  .map((entry) => `${entry.url}:${entry.revision || ""}`)
  .join("|")
  .split("")
  .reduce(
    (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619),
    0,
  )
  .toString(36)
const CACHE_NAME = `aura-shell-${version}`
const assetUrls = [
  ...new Set(
    manifest.map((entry) => new URL(entry.url, self.registration.scope).href),
  ),
]
const indexUrl = new URL("index.html", self.registration.scope).href
const offlineUrl = new URL("offline.html", self.registration.scope).href

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assetUrls)),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) => name.startsWith("aura-shell-") && name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting()
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return (
          (await cache.match(indexUrl)) ||
          (await cache.match(offlineUrl)) ||
          Response.error()
        )
      }),
    )
    return
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      return cached || fetch(request)
    }),
  )
})
