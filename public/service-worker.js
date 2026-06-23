self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const { title, body, icon, url } = payload;
    
    const options = {
      body: body || "",
      icon: icon || "/logo.png",
      badge: "/logo.png",
      data: { url: url || "/" },
    };
    
    event.waitUntil(
      self.registration.showNotification(title || "ProHealthLedger", options)
    );
  } catch (err) {
    console.error("Error displaying push notification:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus if window already exists at target URL
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window otherwise
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
