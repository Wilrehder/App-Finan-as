// Este arquivo é injetado pelo next-pwa no service worker gerado.
// Adiciona suporte a Push Notifications e clique nas notificações.

// ── Push recebido ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Prisma", body: event.data.text() };
  }

  const { title = "Prisma 💰", body = "", icon = "/icon-192x192.png", badge = "/icon-192x192.png", url = "/dashboard" } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: "prisma-notification",
      renotify: true,
      data: { url },
      vibrate: [100, 50, 100],
    })
  );
});

// ── Clique na notificação → abre o app ────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Se o app já está aberto, foca ele
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Se não está aberto, abre uma nova janela
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
