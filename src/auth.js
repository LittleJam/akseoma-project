// Вход в приложение. Пароли не лежат в коде открытым текстом — сравниваем
// SHA-256 от «логин:пароль:соль». Это защита от случайного взгляда, а не настоящая:
// проверка идёт в браузере, поэтому обойти её при желании можно. Для настоящей
// защиты нужен сервер (например, Supabase Auth).
const SALT = 'surf-the-task';

export const USERS = [
  {
    username: 'a.kseoma',
    name: 'A. Kseoma',
    role: 'admin',
    hash: '3b43e6af29674f5753752ac5b4f94a5a13a80b7c6e16b7af237caf169d2b4b16'
  },
  {
    username: 'littlejam',
    name: 'LittleJam',
    role: 'user',
    hash: 'b752cd72c7e793e21f5b3c49ebe635b4628f0935c749a5023adafc97a607076d'
  }
];

export const AUTH_KEY = 'jira-auth';
export const FLAGS_KEY = 'jira-feature-flags';

const sha256 = async (text) => {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
};

// Возвращает пользователя без секретов или null
export const authenticate = async (username, password) => {
  const login = (username || '').trim().toLowerCase();
  const user = USERS.find(u => u.username === login);
  if (!user) return null;

  const hash = await sha256(`${user.username}:${password}:${SALT}`);
  if (hash !== user.hash) return null;

  return { username: user.username, name: user.name, role: user.role };
};

// Фичи, доступ к которым админ раздаёт из настроек.
// Разделы сайта и отдельные возможности описаны одинаково, чтобы список был один
export const FEATURES = [
  { key: 'kanban', label: 'Projects & board', hint: 'Kanban with tasks and subtasks' },
  { key: 'weekly', label: 'Schedule', hint: 'Weekly plan' },
  { key: 'notes', label: 'Notes', hint: 'Notes with images' },
  { key: 'chill', label: 'Chill', hint: 'Timer with lo-fi' },
  { key: 'likes', label: 'Likes on tasks', hint: 'Hearts on board cards, switched on per project' },
  { key: 'themes', label: 'Themes', hint: 'Switching the site theme' },
  { key: 'sync', label: 'Sync settings', hint: 'Cloud and file autosave controls' },
  { key: 'reset', label: 'Reset data', hint: 'Wiping all site data' }
];

export const DEFAULT_FLAGS = {
  kanban: true,
  weekly: true,
  notes: true,
  chill: true,
  likes: true,
  themes: true,
  sync: false,
  reset: false
};

// У админа доступно всё и всегда; флаги описывают только обычного пользователя
export const canUse = (feature, user, flags) => {
  if (user?.role === 'admin') return true;
  const value = { ...DEFAULT_FLAGS, ...(flags || {}) }[feature];
  return value !== false;
};

// Страницы в том порядке, в котором их предлагаем открыть после входа
export const PAGE_FEATURES = ['kanban', 'weekly', 'notes', 'chill'];
