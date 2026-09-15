import { Capacitor } from '@capacitor/core';

// Мелочи нативной оболочки, которых нет у вкладки браузера.
//
// Всё здесь безопасно вызывать и в вебе: на сайте функции просто ничего не
// делают, поэтому компонентам не приходится знать, где они запущены.

export const isNative = () => Capacitor.isNativePlatform();

// Строка состояния телефона. В вебе её цвет задаёт <meta name="theme-color">,
// внутри приложения meta не действует: там часы и значки рисует система.
// Просим у неё только стиль — светлые значки на тёмной теме и наоборот;
// цвет фона под ними на iOS не задаётся, его берёт сама страница
export const applyNativeStatusBar = (darkMode) => {
  if (!isNative()) return;

  import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: darkMode ? Style.Dark : Style.Light }))
    .catch(error => console.error('Status bar style error:', error));
};
