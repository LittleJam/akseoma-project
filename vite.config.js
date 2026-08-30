import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// GitHub Pages отдаёт сайт репозитория из подпапки, а не с корня домена,
// поэтому все ссылки на файлы должны быть относительно неё.
const BASE = '/akseoma-project/'

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

export default defineConfig({
  base: BASE,
  plugins: [react(), spaFallback()],
})
