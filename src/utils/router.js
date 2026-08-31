// Мини-роутер: пять плоских разделов и опциональный проект у доски.
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

// Возвращает { page, projectSlug } — null там, где в адресе ничего нет
export const parseLocation = () => {
  const [page, projectSlug] = stripBase(window.location.pathname).split('/');
  return {
    page: PAGES.includes(page) ? page : null,
    projectSlug: projectSlug ? decodeURIComponent(projectSlug) : null
  };
};

export const buildPath = (page, projectSlug) =>
  `${BASE}${page}${page === 'kanban' && projectSlug ? `/${encodeURIComponent(projectSlug)}` : ''}`;

export const navigate = (page, projectSlug, { replace = false } = {}) => {
  const path = buildPath(page, projectSlug);
  if (window.location.pathname === path) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
};

// На Android «назад» в установленном PWA закрывает приложение, если в истории
// ничего нет. Подписка на popstate — то, ради чего роутер и заводился.
export const onRouteChange = handler => {
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
};
