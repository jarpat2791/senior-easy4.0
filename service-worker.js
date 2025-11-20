const CACHE_NAME = 'senior-easy-v4.0';
const STATIC_CACHE = 'static-v4';
const DYNAMIC_CACHE = 'dynamic-v4';

// Zasoby do cache'owania podczas instalacji
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Instalacja Service Workera
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalowanie...', event);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Cacheowanie zasobów statycznych');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Zainstalowany');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Błąd podczas cacheowania', error);
      })
  );
});

// Aktywacja Service Workera
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Aktywacja...', event);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE && cache !== CACHE_NAME) {
            console.log('Service Worker: Usuwanie starego cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Aktywowany');
      return self.clients.claim();
    })
  );
});

// Przechwytywanie żądań
self.addEventListener('fetch', (event) => {
  // Pomijamy żądania inne niż HTTP
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Jeśli zasób jest w cache, zwracamy go
        if (response) {
          return response;
        }

        // W przeciwnym razie wykonujemy żądanie sieciowe
        return fetch(event.request)
          .then((fetchResponse) => {
            // Sprawdzamy czy odpowiedź jest poprawna
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Klonujemy odpowiedź
            const responseToCache = fetchResponse.clone();

            // Cache'ujemy dynamiczne odpowiedzi
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('Service Worker: Błąd cacheowania dynamicznego', error);
              });

            return fetchResponse;
          })
          .catch((error) => {
            console.warn('Service Worker: Błąd sieci', error);
            
            // Dla stron - zwracamy stronę główną z cache
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            
            // Dla obrazków - zwracamy placeholder
            if (event.request.destination === 'image') {
              return caches.match('/icon-192.png');
            }
            
            return new Response('Brak połączenia z internetem', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Obsługa wiadomości
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Obsługa powiadomień push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push Notification received', event);
  
  let data = {
    title: 'Senior-Easy',
    body: 'Masz nową wiadomość',
    icon: '/icon-192.png',
    badge: '/icon-72.png'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.warn('Service Worker: Błąd parsowania danych push', error);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Otwórz aplikację',
        icon: '/icon-72.png'
      },
      {
        action: 'close',
        title: 'Zamknij',
        icon: '/icon-72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Obsługa kliknięć w powiadomienia
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Szukamy otwartego okna aplikacji
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Jeśli nie ma otwartego okna, otwieramy nowe
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Obsługa synchronizacji w tle
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Funkcja synchronizacji w tle
function doBackgroundSync() {
  return new Promise((resolve) => {
    // Tutaj można dodać logikę synchronizacji danych
    console.log('Service Worker: Synchronizacja w tle');
    resolve();
  });
}

// Obsługa stanu offline
self.addEventListener('offline', () => {
  console.log('Service Worker: Aplikacja jest offline');
});

self.addEventListener('online', () => {
  console.log('Service Worker: Aplikacja jest online');
});
