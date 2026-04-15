// sw.js - Service Worker for Offline Functionality

const CACHE_NAME = 'tahqeeq369-cache-v1';
// **مهم:** أضف هنا كل الملفات التي تريد أن تعمل بدون إنترنت
const urlsToCache = [
    '/tahqeeq369/',
    '/tahqeeq369/index.html',
    '/tahqeeq369/style.css',
    '/tahqeeq369/script.js',
    '/tahqeeq369/manifest.json',
    '/tahqeeq369/icons/icon-192x192.png',
    '/tahqeeq369/icons/icon-512x512.png'
];


// Install event: cache all the essential files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event: serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache - fetch from network
                return fetch(event.request);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
