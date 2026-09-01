// dot — насыщенный цвет-метка колонки: маленькая точка в заголовке и свотч в настройках.
// Заливка всей колонки убрана: точки достаточно, чтобы опознать колонку, а полотно остаётся спокойным
export const COLUMN_COLORS = {
  purple: { label: 'Purple', dot: 'bg-purple-500' },
  gray: { label: 'Gray', dot: 'bg-gray-400' },
  blue: { label: 'Blue', dot: 'bg-blue-500' },
  green: { label: 'Green', dot: 'bg-green-500' },
  yellow: { label: 'Yellow', dot: 'bg-yellow-500' },
  red: { label: 'Red', dot: 'bg-red-500' },
  pink: { label: 'Pink', dot: 'bg-pink-500' },
  indigo: { label: 'Indigo', dot: 'bg-indigo-500' }
};

export const DEFAULT_COLUMNS = [
  { id: 'idea', title: 'IDEA', color: 'gray' },
  { id: 'todo', title: 'TO DO', color: 'gray' },
  { id: 'in-progress', title: 'IN PROGRESS', color: 'gray' },
  { id: 'done', title: 'DONE', color: 'gray' }
];

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Все ключи localStorage приложения — используются при сбросе к дефолтным настройкам
export const STORAGE_KEYS = [
  'jira-projects',
  'jira-tasks',
  'jira-columns',
  'jira-weekly-tasks',
  'jira-wishlist', // раздел удалён, ключ оставлен, чтобы сброс подчистил старые данные
  'jira-notes',
  'jira-collapsed-subtasks',
  'jira-darkMode',
  'jira-theme',
  'jira-chill-music',
  'jira-feature-flags',
  'jira-project-likes',
  'jira-currentProject',
  'jira-currentPage'
];

// Цвета заметок. Тинты намеренно бледные: цвет помечает заметку, а не забивает страницу.
// swatch — насыщенная точка для выбора в пикере
export const NOTE_COLORS = {
  default: {
    label: 'No color',
    swatch: 'bg-gray-300',
    light: 'bg-white border-gray-200',
    dark: 'bg-gray-800/40 border-gray-800'
  },
  yellow: {
    label: 'Yellow',
    swatch: 'bg-amber-400',
    light: 'bg-amber-50 border-amber-200',
    dark: 'bg-amber-500/10 border-amber-500/25'
  },
  green: {
    label: 'Green',
    swatch: 'bg-green-500',
    light: 'bg-green-50 border-green-200',
    dark: 'bg-green-500/10 border-green-500/25'
  },
  blue: {
    label: 'Blue',
    swatch: 'bg-blue-500',
    light: 'bg-blue-50 border-blue-200',
    dark: 'bg-blue-500/10 border-blue-500/25'
  },
  purple: {
    label: 'Purple',
    swatch: 'bg-purple-500',
    light: 'bg-purple-50 border-purple-200',
    dark: 'bg-purple-500/10 border-purple-500/25'
  },
  pink: {
    label: 'Pink',
    swatch: 'bg-pink-500',
    light: 'bg-pink-50 border-pink-200',
    dark: 'bg-pink-500/10 border-pink-500/25'
  }
};

// Режимы заметки: свободный текст, чек-лист или маркированный список.
// items общие для todo и bullet — переключение между ними ничего не теряет
// Режим заметки решает только вид маркера списка: текст в заметке есть всегда,
// рядом со списком. Раньше режимов было три и они были взаимоисключающими —
// чтобы дописать пояснение к списку, приходилось заводить вторую заметку.
// Старые заметки с mode: 'text' показываются как список с точками.
export const NOTE_MODES = [
  { key: 'todo', label: 'Checklist' },
  { key: 'bullet', label: 'Bullets' }
];

// Лейблы задач. Цвет выбирается по самому тексту, поэтому один и тот же лейбл
// всегда выглядит одинаково и не нужно ничего хранить отдельно
export const LABEL_COLORS = [
  { light: 'bg-blue-100 text-blue-800 border-blue-200', dark: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { light: 'bg-purple-100 text-purple-800 border-purple-200', dark: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { light: 'bg-amber-100 text-amber-800 border-amber-200', dark: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { light: 'bg-teal-100 text-teal-800 border-teal-200', dark: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  { light: 'bg-pink-100 text-pink-800 border-pink-200', dark: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  { light: 'bg-indigo-100 text-indigo-800 border-indigo-200', dark: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  { light: 'bg-lime-100 text-lime-800 border-lime-200', dark: 'bg-lime-500/15 text-lime-300 border-lime-500/30' },
  { light: 'bg-rose-100 text-rose-800 border-rose-200', dark: 'bg-rose-500/15 text-rose-300 border-rose-500/30' }
];

export const getLabelColor = (label, darkMode) => {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) hash = (hash * 31 + label.charCodeAt(i)) % 9973;
  const palette = LABEL_COLORS[hash % LABEL_COLORS.length];
  return darkMode ? palette.dark : palette.light;
};

// Приводим лейбл к единому виду, чтобы «Bug» и «bug » не расходились
export const normalizeLabel = (label) => label.trim().replace(/\s+/g, ' ').slice(0, 24);
