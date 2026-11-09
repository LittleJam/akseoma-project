// Отложенная запись в localStorage.
//
// Запись туда синхронная, и обходится она не в один вызов: это JSON.stringify
// всего списка плюс обращение к диску — всё в основном потоке. Раньше это
// делалось на каждое изменение состояния, то есть на каждое нажатие клавиши
// в заметке пересохранялся весь список заметок целиком. На диск при этом
// попадает только последнее состояние: промежуточные версии не нужны никому.
//
// Поэтому значения копятся по ключу и уходят одной пачкой, а в строку
// превращаются только перед самой записью. Задержка маленькая: это сохранение
// данных, а не кеш, и ждать дольше одной паузы в наборе нечего.
//
// Перед уходом приложения в фон и перед выгрузкой страницы пачка пишется
// немедленно: после этого систему уже ничто не обязывает дать таймеру
// сработать — приложение могут выгрузить из памяти прямо там.
const DELAY = 400;

const pending = new Map();
let timer = null;
let onError = null;

// Переполнение хранилища показывает баннер — обработчик приходит из App
export const setPersistErrorHandler = (handler) => {
  onError = handler;
};

export const flushPersist = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending.size === 0) return;

  const batch = [...pending];
  pending.clear();
  batch.forEach(([key, value]) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
      onError?.(error);
    }
  });
};

export const persistItem = (key, value) => {
  pending.set(key, value);
  if (!timer) timer = setTimeout(flushPersist, DELAY);
};

// Сброс данных: то, что ещё не записано, писать уже нельзя — отложенная пачка
// воскресила бы только что удалённые ключи
export const dropPending = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  pending.clear();
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist();
  });
  // В Safari и в установленном приложении unload не приходит вовсе —
  // последний надёжный момент именно pagehide
  window.addEventListener('pagehide', flushPersist);
}
