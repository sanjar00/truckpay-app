self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open('truckpay-cache').then(cache => cache.add('/'))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage('SYNC_QUEUE'));
      })
    );
  }
});
