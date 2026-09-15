import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

// GitHub Pages отдаёт сайт репозитория из подпапки, а не с корня домена,
// поэтому все ссылки на файлы должны быть относительно неё.
const BASE = '/akseoma-project/'

// Внутри нативной оболочки (iOS) страница живёт в корне своего скрытого
// сервера, а подпапки Pages там нет. Отсюда второй режим сборки:
//   npm run build        — сайт для Pages
//   npm run build:native — то же приложение для Capacitor
// Отличий три: корневые пути, отсутствие 404.html (внутри оболочки некому его
// отдавать) и отсутствие сервис-воркера — файлы и так лежат в самом приложении,
// а кеш поверх них означал бы только шанс показать вчерашнюю сборку.

// Pages не умеет отдавать index.html на неизвестный путь, а чистым адресам
// вроде /notes это нужно. Обходим копией: на любой неизвестный путь Pages
// отдаёт 404.html, приложение стартует из него и читает адрес само.
const spaFallback = () => ({
  name: 'spa-fallback-404',
  closeBundle() {
    const out = resolve(process.cwd(), 'dist')
    copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'))
  }
})

// Имена собранных файлов содержат хеш, поэтому список для сервис-воркера может
// составить только сборка. Без него офлайн начинал работать лишь с третьего
// захода: воркер не управляет страницей, которая его установила, и её бандл
// проходит мимо кеша. Заодно версия кеша получает суффикс сборки — при выкладке
// новой версии старые файлы подчищаются сами.
const precacheAssets = () => ({
  name: 'sw-precache-assets',
  closeBundle() {
    const out = resolve(process.cwd(), 'dist')
    const swPath = resolve(out, 'sw.js')
    const html = readFileSync(resolve(out, 'index.html'), 'utf8')

    const assets = [...html.matchAll(/(?:src|href)="([^"]+\/assets\/[^"]+)"/g)].map(m => m[1])
    if (assets.length === 0) throw new Error('sw-precache: в index.html не нашлось файлов сборки')

    // Отпечаток сборки берём из имён файлов: они меняются вместе с содержимым
    const buildId = createHash('sha1').update(assets.join('|')).digest('hex').slice(0, 8)

    const sw = readFileSync(swPath, 'utf8')
      .replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = ${JSON.stringify(assets)};`)
      .replace(/const VERSION = '([^']+)';/, `const VERSION = '$1-${buildId}';`)
    writeFileSync(swPath, sw)
  }
})

// Сервис-воркер лежит в public и попадает в сборку сам. Нативной сборке он не
// нужен, а лишний файл в приложении — лишний повод для путаницы
const dropServiceWorker = () => ({
  name: 'drop-service-worker',
  closeBundle() {
    rmSync(resolve(process.cwd(), 'dist', 'sw.js'), { force: true })
  }
})

export default defineConfig(({ mode }) => {
  const native = mode === 'native'

  return {
    base: native ? '/' : BASE,
    plugins: native
      ? [react(), dropServiceWorker()]
      : [react(), spaFallback(), precacheAssets()]
  }
})
