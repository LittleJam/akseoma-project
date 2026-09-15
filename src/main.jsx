import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Сервис-воркер только в собранной версии для веба: в dev он мешал бы горячей
// перезагрузке, а внутри нативной оболочки не нужен вовсе — файлы уже лежат
// в самом приложении, и кеш поверх них лишь добавил бы шанс показать старую
// сборку после обновления из App Store
if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(error => {
      console.error('Service worker registration failed:', error)
    })
  })
}
