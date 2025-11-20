// Service Worker dla Senior-Easy App
const CACHE_NAME = 'senior-easy-v4.0';
const STATIC_CACHE = 'static-cache-v4';
const DYNAMIC_CACHE = 'dynamic-cache-v4';

// Zasoby do cache'owania podczas instalacji
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Zasoby do cache'owania dynamicznego
const DYNAMIC_ASSETS = [
  // API endpoints które chcemy cache'ować
];

// Instalacja Service Workera
self.addEventListener('install', (event) => {
  console.log('🟢 Service Worker instalowany...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Cache otwarty, dodawanie zasobów...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Wszystkie zasoby zostały zcacheowane');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Błąd podczas cacheowania zasobów:', error);
      })
  );
});

// Aktywacja Service Workera
self.addEventListener('activate', (event) => {
  console.log('🟡 Service Worker aktywowany...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Usuń stare cache'e
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME) {
              console.log('🗑️ Usuwanie starego cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker został aktywowany');
        return self.clients.claim();
      })
  );
});

// Fetch events - strategia Cache First z fallback do network
self.addEventListener('fetch', (event) => {
  // Pomijamy żądania inne niż HTTP/HTTPS
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Zwróć z cache jeśli istnieje
        if (cachedResponse) {
          console.log('📂 Zasób z cache:', event.request.url);
          return cachedResponse;
        }

        // W przeciwnym razie pobierz z network
        return fetch(event.request)
          .then((networkResponse) => {
            // Sprawdź czy otrzymaliśmy prawidłową odpowiedź
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Klonuj odpowiedź bo może być użyta tylko raz
            const responseToCache = networkResponse.clone();

            // Dodaj do dynamicznego cache
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                console.log('💾 Dodawanie do dynamic cache:', event.request.url);
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('⚠️ Nie udało się dodać do cache:', error);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.log('🌐 Błąd sieci, próba fallback...');
            
            // Fallback dla stron - zwróć stronę główną
            if (event.request.destination === 'document') {
              return caches.match('/')
                .then((cachedHome) => {
                  if (cachedHome) {
                    console.log('🏠 Fallback do strony głównej');
                    return cachedHome;
                  }
                  // Fallback offline page
                  return new Response(
                    `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Senior-Easy - Tryb Offline</title>
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <style>
                        body {
                          font-family: Arial, sans-serif;
                          text-align: center;
                          padding: 50px;
                          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                        }
                        .container {
                          max-width: 500px;
                          margin: 0 auto;
                          background: rgba(255,255,255,0.1);
                          padding: 30px;
                          border-radius: 20px;
                          backdrop-filter: blur(10px);
                        }
                        h1 { font-size: 2.5em; margin-bottom: 20px; }
                        p { font-size: 1.2em; margin-bottom: 20px; }
                        .emoji { font-size: 4em; margin: 20px 0; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <div class="emoji">📶</div>
                        <h1>Brak połączenia</h1>
                        <p>Aplikacja Senior-Easy działa w trybie offline. Niektóre funkcje mogą być niedostępne.</p>
                        <p>Po przywróceniu połączenia aplikacja wróci do pełnej funkcjonalności.</p>
                        <div class="emoji">💊👵📞</div>
                      </div>
                    </body>
                    </html>
                    `,
                    {
                      headers: { 'Content-Type': 'text/html' }
                    }
                  );
                });
            }
            
            // Dla innych zasobów zwróć błąd
            return new Response('Zasób niedostępny w trybie offline', {
              status: 408,
              statusText: 'Offline'
            });
          });
      })
  );
});

// Background Sync dla danych
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      syncData()
        .then(() => {
          console.log('✅ Synchronizacja zakończona');
          // Wyślij powiadomienie o sukcesie
          self.registration.showNotification('Senior-Easy', {
            body: 'Dane zostały zsynchronizowane',
            icon: '/icon-192.png',
            badge: '/icon-192.png'
          });
        })
        .catch((error) => {
          console.error('❌ Błąd synchronizacji:', error);
        })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('📨 Push notification otrzymane');
  
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Nowa wiadomość z Senior-Easy',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image,
    data: data.url,
    actions: [
      {
        action: 'open',
        title: 'Otwórz aplikację'
      },
      {
        action: 'close',
        title: 'Zamknij'
      }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Senior-Easy', options)
  );
});

// Kliknięcie w powiadomienie
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Kliknięto powiadomienie:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Szukaj otwartego okna
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          // Otwórz nowe okno jeśli nie znaleziono
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// Funkcja synchronizacji danych
async function syncData() {
  try {
    // Tutaj można dodać logikę synchronizacji z serwerem
    console.log('🔄 Synchronizacja danych w tle...');
    
    // Przykładowa synchronizacja
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      await processPendingAction(action);
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Błąd synchronizacji:', error);
    return Promise.reject(error);
  }
}

// Pobierz oczekujące akcje (do implementacji)
async function getPendingActions() {
  // W przyszłości można tu dodać pobieranie akcji z IndexedDB
  return [];
}

// Przetwórz oczekującą akcję (do implementacji)
async function processPendingAction(action) {
  // W przyszłości można tu dodać wysyłanie danych do serwera
  console.log('📤 Przetwarzanie akcji:', action);
  return Promise.resolve();
}

// Periodic Sync (dla przyszłych wersji)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-sync') {
    console.log('🕒 Periodic Sync uruchomiony');
    event.waitUntil(syncData());
  }
});

// Obsługa komunikatów
self.addEventListener('message', (event) => {
  console.log('💬 Otrzymano wiadomość:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: '4.0',
      cache: CACHE_NAME
    });
  }
});

console.log('🚀 Service Worker Senior-Easy został załadowany');