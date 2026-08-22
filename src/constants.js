// light/dark — пастельная полупрозрачная заливка колонки (для доски и превью в настройках)
// dot — насыщенный сплошной цвет для маленького индикатора в свотч-пикере
export const COLUMN_COLORS = {
  purple: { label: 'Purple', light: 'bg-purple-200/40', dark: 'bg-purple-500/15', dot: 'bg-purple-500' },
  gray: { label: 'Gray', light: 'bg-gray-300/40', dark: 'bg-gray-400/10', dot: 'bg-gray-400' },
  blue: { label: 'Blue', light: 'bg-blue-200/40', dark: 'bg-blue-500/15', dot: 'bg-blue-500' },
  green: { label: 'Green', light: 'bg-green-200/40', dark: 'bg-green-500/15', dot: 'bg-green-500' },
  yellow: { label: 'Yellow', light: 'bg-yellow-200/40', dark: 'bg-yellow-500/15', dot: 'bg-yellow-500' },
  red: { label: 'Red', light: 'bg-red-200/40', dark: 'bg-red-500/15', dot: 'bg-red-500' },
  pink: { label: 'Pink', light: 'bg-pink-200/40', dark: 'bg-pink-500/15', dot: 'bg-pink-500' },
  indigo: { label: 'Indigo', light: 'bg-indigo-200/40', dark: 'bg-indigo-500/15', dot: 'bg-indigo-500' }
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
  'jira-wishlist',
  'jira-notes',
  'jira-collapsed-subtasks',
  'jira-darkMode',
  'jira-currentProject',
  'jira-currentPage'
];

// Эмодзи-стикеры для задач, сгруппированные по смыслу (порядок групп = порядок в пикере)
export const STICKER_GROUPS = [
  { label: 'Status', emojis: ['🔥', '⭐', '✅', '❌', '⚠️', '⏰', '📌', '🎯', '🚀', '💡', '🐛', '🔒'] },
  { label: 'Mood', emojis: ['😀', '😎', '🥳', '🤔', '😴', '😭', '😡', '🤯', '🙏', '🤝', '👍', '👎'] },
  { label: 'Work', emojis: ['💻', '📱', '🎨', '📝', '📊', '📎', '🗂️', '💰', '📦', '🔧', '🧪', '🧭'] },
  { label: 'Life', emojis: ['🏄', '🌊', '☀️', '🌙', '🍕', '☕', '🎁', '🎉', '❤️', '🏆', '🌱', '✈️'] }
];
