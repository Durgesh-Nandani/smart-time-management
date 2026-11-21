
const CACHE_NAME = "smart-time-v14";
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/login.html",
    "/signup.html",
    "/tasks.html",
    "/manage-time.html",
    "/manifest.json",
    "/offline-storage.js",
    "/script.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(FILES_TO_CACHE))
    );

    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        ).then(() => self.clients.claim())
    );
});


self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cachedResponse = await caches.match(event.request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                return caches.match("/index.html");
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).catch(() => {
                return new Response("Offline - resource unavailable", {
                    status: 503,
                    headers: { "Content-Type": "text/plain" }
                });
            });
        })
    );
});

