const CACHE_NAME = 'senior-easy-v4.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalacja Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Instalowanie...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Buforowanie plików...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Wszystkie pliki zostały pobuforowane');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Błąd podczas buforowania:', error);
      })
  );
});

// Aktywacja Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Aktywacja...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Usuwanie starej pamięci cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Aktywowany!');
      return self.clients.claim();
    })
  );
});

// Interceptowanie żądań
self.addEventListener('fetch', event => {
  // Pomijanie żądań innych niż HTTP
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Zwróć buforowaną wersję jeśli istnieje
        if (response) {
          return response;
        }

        // W przeciwnym razie wykonaj żądanie sieciowe
        return fetch(event.request)
          .then(response => {
            // Sprawdź czy otrzymaliśmy prawidłową odpowiedź
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Klonuj odpowiedź
            const responseToCache = response.clone();

            // Buforuj nowo pobrany plik
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('Service Worker: Błąd pobierania:', error);
            // Możesz zwrócić fallback tutaj
            return new Response('Aplikacja jest w trybie offline. Sprawdź swoje połączenie internetowe.', {
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Obsługa wiadomości
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
