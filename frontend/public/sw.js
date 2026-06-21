const CACHE_NAME = 'mindcheck-cache-v1';
const API_CACHE_NAME = 'mindcheck-api-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== API_CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

function staleWhileRevalidate(event) {
  const request = event.request;
  return caches.open(API_CACHE_NAME).then((cache) => {
    return cache.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => {
        // Ignorar fallos de red en actualizaciones en segundo plano
      });

      if (cachedResponse) {
        event.waitUntil(fetchPromise);
        return cachedResponse;
      }
      return fetchPromise;
    });
  });
}

function networkFirst(event) {
  const request = event.request;
  return fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(API_CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return networkResponse;
    })
    .catch((error) => {
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        throw error;
      });
    });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isApiRequest = url.pathname.includes('/api/v1/');

  if (isApiRequest) {
    // 1. Interceptar escrituras (POST, PATCH, DELETE) para invalidación de caché
    if (['POST', 'PATCH', 'DELETE'].includes(event.request.method)) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const path = url.pathname;
              caches.open(API_CACHE_NAME).then((cache) => {
                if (path.includes('/journal/analyze') || path.includes('/journal/manual-emotion') || path.includes('/journal/entries')) {
                  cache.keys().then((keys) => {
                    keys.forEach((request) => {
                      if (request.url.includes('/api/v1/journal/entries')) {
                        cache.delete(request);
                      }
                    });
                  });
                }
                if (path.includes('/alerts')) {
                  cache.keys().then((keys) => {
                    keys.forEach((request) => {
                      if (request.url.includes('/api/v1/alerts')) {
                        cache.delete(request);
                      }
                    });
                  });
                }
              });
            }
            return response;
          })
          .catch((error) => {
            throw error;
          })
      );
      return;
    }

    // 2. Interceptar lecturas GET específicas
    if (event.request.method === 'GET') {
      const path = url.pathname;
      if (path.includes('/api/v1/resources')) {
        event.respondWith(staleWhileRevalidate(event));
        return;
      }
      if (path.includes('/api/v1/journal/entries')) {
        event.respondWith(networkFirst(event));
        return;
      }
      if (path.includes('/api/v1/alerts')) {
        event.respondWith(networkFirst(event));
        return;
      }
    }

    // Cualquier otra petición API (ej: GET /api/v1/push/vapid-public-key) va directo a red sin caché
    return;
  }

  // --- Lógica original para recursos estáticos y navegación ---
  // Only handle GET requests and local resources
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh in background and update cache (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Ignore network failures when offline */});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If offline and request is for page navigation, return index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// --- Web Push Event Listeners ---

self.addEventListener('push', (event) => {
  let data = { title: 'MindCheck', body: 'Tienes una nueva alerta de bienestar.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'MindCheck', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'mindcheck-alert',
    renotify: true,
    data: data.data || {},
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle click by focusing existing tab or opening a new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate('/notificaciones');
          }
          return client.focus();
        }
      }
      // Otherwise open a new window at the notifications page
      if (self.clients.openWindow) {
        return self.clients.openWindow('/notificaciones');
      }
    })
  );
});

