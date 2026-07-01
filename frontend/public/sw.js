const CACHE = "africhess-v2";

const PRECACHE = ["/manifest.json", "/images/logo.png"];

function shouldBypassCache(url) {
  if (url.pathname.startsWith("/_next/")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.includes(".")) return true;
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypassCache(url)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});

function pushTargetUrl(data) {
  if (!data) return "/";
  if (data.game_id) return `/play?game=${data.game_id}`;
  if (data.action === "match_found" && data.game_id) return `/play?game=${data.game_id}`;
  return "/";
}

self.addEventListener("push", (event) => {
  let payload = { title: "AFRICHESS", body: "", data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  const { title, body, data } = payload;
  event.waitUntil(
    self.registration.showNotification(title || "AFRICHESS", {
      body: body || "",
      icon: "/images/logo.png",
      badge: "/images/logo.png",
      data: data || {},
      tag: data?.notification_id ? `notif-${data.notification_id}` : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = pushTargetUrl(event.notification.data);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
