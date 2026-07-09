'use strict';

/* Service Worker für Mein Training:
   - Kern-Dateien und alle Übungsfotos werden beim Installieren
     heruntergeladen, damit die App im Gym auch OHNE Internet läuft.
   - Kern-Dateien: erst Netz versuchen (damit Updates ankommen),
     bei Offline aus dem Cache.
   - Fotos: direkt aus dem Cache (ändern sich nie). */

const CACHE = 'mein-training-v4';

const CORE = [
  '.',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/coach.js',
  'js/app.js',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return fetch('asset-list.json')
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; })
        .then(function (images) {
          return cache.addAll(CORE.concat(images));
        });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* Übungsfotos: Cache zuerst (schnell und offline) */
  if (url.pathname.indexOf('/img/exercises/') !== -1) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  /* Alles andere: Netz zuerst (Updates), Cache als Offline-Fallback */
  event.respondWith(
    fetch(req).then(function (res) {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('index.html');
      });
    })
  );
});
