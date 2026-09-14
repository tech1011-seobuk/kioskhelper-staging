const CACHE_NAME = 'photoism-helper-staging-v30';
const OWN_CACHE_PATTERN = /^photoism-helper-staging-v[0-9]+$/;
const APP_SCOPE = new URL('./', self.location.href);
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
const URLS_TO_CACHE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const STATIC_URLS = new Set(URLS_TO_CACHE.map(path => new URL(path, APP_SCOPE).href));
const PAGE_URLS = new Set([APP_SCOPE.href, new URL('index.html', APP_SCOPE).href]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // A failed core download keeps the previous working version installed.
    await cache.addAll(URLS_TO_CACHE);
    try { await cache.add(SDK_URL); } catch { /* SDK can be cached on its next successful request. */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // GitHub Pages repositories share an origin. Preserve other apps' caches.
    await Promise.all(keys.filter(key => key !== CACHE_NAME && OWN_CACHE_PATTERN.test(key))
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const baseURL = url.origin + url.pathname;
  const isPage = PAGE_URLS.has(baseURL) && event.request.mode === 'navigate';
  // Do not intercept Supabase, authentication, or any other private API response.
  if (!isPage && !STATIC_URLS.has(url.href) && url.href !== SDK_URL) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (isPage) {
      // Recovery links contain tokens. Never use their query strings as cache keys.
      const pageKey = new URL('index.html', APP_SCOPE).href;
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          try { await cache.put(pageKey, response.clone()); } catch { /* Storage full: serve network response. */ }
          return response;
        }
        return (await cache.match(pageKey)) || response;
      } catch {
        return (await cache.match(pageKey)) || Response.error();
      }
    }
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) {
      try { await cache.put(event.request, response.clone()); } catch { /* Storage full: serve network response. */ }
    }
    return response;
  })());
});
