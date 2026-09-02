// Сервис-воркер приложения: офлайн-оболочка и кеш статики.
// Версию менять при изменении логики и при подмене файлов, имя которых не
// меняется (иконки, шрифты) — старые кеши подчищаются на активации.
// v5 — новая иконка приложения: имена png те же, поэтому без смены версии
// установленное приложение продолжало бы отдавать старую из кеша.
const VERSION = 'stt-v5';

// Список собранных файлов подставляет сборка: их имена содержат хеш и заранее
// неизвестны. Без предварительного кеширования офлайн не работал до третьего
// захода: на первом визите воркер ещё не управляет страницей, и её бандл
// загружается мимо него, а значит в кеш не попадает.
// В режиме разработки список пуст — там воркер и не регистрируется.
const BUILD_ASSETS = [];
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

// Пути относительные: воркер лежит рядом с приложением, а оно может быть
// как в корне домена, так и в подпапке GitHub Pages
// Абсолютные адреса оболочки — для кеша нужны именно они
const SHELL_URL = new URL('./index.html', self.location).href;
const SHELL_ROOT = new URL('./', self.location).href;

const SHELL = ['./', './index.html', './manifest.webmanifest', './wave.svg', './icon-192.png', './icon-512.png'];

// Рукописные шрифты темы Handwriting: без них тема теряет смысл, поэтому кладём
// их в кеш заранее, а не при первом показе — иначе офлайн покажет запасной шрифт
const FONTS = [
  './fonts/neucha-latin.woff2',
  './fonts/neucha-cyrillic.woff2',
  './fonts/caveat-latin.woff2',
  './fonts/caveat-latin-ext.woff2',
  './fonts/caveat-cyrillic.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE)
        // Отдельные промахи (например, ещё не собранная иконка) не должны валить установку
        .then(cache => Promise.allSettled([...SHELL, ...FONTS].map(url => cache.add(url)))),
      caches.open(ASSET_CACHE)
        .then(cache => Promise.allSettled(BUILD_ASSETS.map(url => cache.add(url))))
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => !key.startsWith(VERSION)).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Чужие домены (Supabase, YouTube) не кешируем — только своя статика
  if (url.origin !== self.location.origin) return;

  // Переходы по страницам: сначала сеть, офлайн — сохранённая оболочка
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put(SHELL_URL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL_URL).then(cached => cached || caches.match(SHELL_ROOT)))
    );
    return;
  }

  // Собранные файлы содержат хеш в имени, поэтому берём из кеша сразу
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(ASSET_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
