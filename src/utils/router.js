// Мини-роутер: пять плоских разделов и опциональный второй сегмент адреса —
// проект у доски, открытая заметка у заметок.
// Библиотека тут не окупается — вложенности, параметров пути и защищённых
// маршрутов нет, а зависимостей в проекте всего четыре.
//
// Адрес — источник правды. Сохранённое значение (jira-currentPage) нужно
// только когда раздела в адресе нет: так выглядит заход по иконке PWA,
// её start_url ведёт в корень.

const BASE = import.meta.env.BASE_URL;

export const PAGES = ['kanban', 'weekly', 'notes', 'chill', 'settings'];

const stripBase = pathname => {
  const withoutBase = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\/+/, '');
  return withoutBase.replace(/^\/+|\/+$/g, '');
};

// Возвращает { page, detail } — null там, где в адресе ничего нет.
// Что значит detail, решает раздел: у доски это адрес проекта, у заметок — id
// открытой заметки. Открытая заметка — отдельный адрес, а не окно поверх
// списка: без своей записи в истории системный «назад» в установленном
// приложении закрывал бы не её, а весь раздел
export const parseLocation = () => {
  const [page, detail] = stripBase(window.location.pathname).split('/');
  return {
    page: PAGES.includes(page) ? page : null,
    detail: detail ? decodeURIComponent(detail) : null
  };
};

export const buildPath = (page, detail) =>
  `${BASE}${page}${detail ? `/${encodeURIComponent(detail)}` : ''}`;

export const navigate = (page, detail, { replace = false } = {}) => {
  const path = buildPath(page, detail);
  if (window.location.pathname === path) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
};

// На Android «назад» в установленном PWA закрывает приложение, если в истории
// ничего нет. Подписка на popstate — то, ради чего роутер и заводился.
export const onRouteChange = handler => {
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
};
