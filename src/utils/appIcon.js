// Иконка установленного приложения. Список icons в манифесте статичен, и
// подменить его на ходу нечем — поэтому у каждого варианта свой манифест, а
// приложение переставляет ссылки в <head>: rel=icon (вкладка браузера),
// rel=apple-touch-icon (домашний экран iOS) и rel=manifest (Android).
//
// Файлы вариантов лежат в public/icons и собраны из <id>.svg и <id>-maskable.svg
// (команды выписаны в самих svg). Вариант surf — те же файлы, что стояли в
// index.html с самого начала, поэтому у уже установленных приложений иконка
// не меняется, пока её не сменят руками.
//
// Важно про сроки: страница читает манифест при загрузке, так что иконка
// установленного приложения меняется не в тот же миг. Android подхватывает её
// при следующих запусках, а iOS — только если добавить приложение на экран
// заново. Фавиконка вкладки меняется сразу.

const BASE = import.meta.env.BASE_URL;

export const APP_ICONS = [
  {
    id: 'surf',
    label: 'Surf',
    hint: 'Green — a tick riding the wave, same as the name',
    preview: `${BASE}wave.svg`,
    apple: `${BASE}apple-touch-icon.png`,
    manifest: `${BASE}manifest.webmanifest`
  },
  {
    id: 'paper',
    label: 'Paper',
    hint: 'Cream and ink — the notebook look',
    preview: `${BASE}icons/paper.svg`,
    apple: `${BASE}icons/paper-180.png`,
    manifest: `${BASE}manifest-paper.webmanifest`
  },
  {
    id: 'tide',
    label: 'Tide',
    hint: 'Teal — the wave alone, no tick',
    preview: `${BASE}icons/tide.svg`,
    apple: `${BASE}icons/tide-180.png`,
    manifest: `${BASE}manifest-tide.webmanifest`
  },
  {
    id: 'board',
    label: 'Board',
    hint: 'Slate — three columns of a board',
    preview: `${BASE}icons/board.svg`,
    apple: `${BASE}icons/board-180.png`,
    manifest: `${BASE}manifest-board.webmanifest`
  }
];

export const DEFAULT_APP_ICON = APP_ICONS[0].id;

export const getAppIcon = (id) => APP_ICONS.find(icon => icon.id === id) || APP_ICONS[0];

const setLink = (rel, href, type) => {
  let link = document.head.querySelector(`link[rel="${rel}"]`);

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }

  if (type) link.type = type;
  link.href = href;
};

// Возвращает id того варианта, который на самом деле применён: сохранённое
// значение могло остаться от варианта, которого больше нет
export const applyAppIcon = (id) => {
  const variant = getAppIcon(id);

  setLink('icon', variant.preview, 'image/svg+xml');
  setLink('apple-touch-icon', variant.apple);
  setLink('manifest', variant.manifest);

  return variant.id;
};
