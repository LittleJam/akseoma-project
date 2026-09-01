import {
  Sun, Moon, Wand, Wand2, Waves, Castle, ScrollText, BookOpenText, Sparkles, Feather,
  Compass, CalendarDays, Shell, Palmtree, Anchor, Plus, Home, Calendar, StickyNote,
  Coffee, Settings, RefreshCw, Monitor, FolderOpen, FileText, Music2, Wrench,
  PenLine, Notebook, NotebookPen, Pencil, Highlighter, Paperclip, SlidersHorizontal
} from 'lucide-react';
import SurferIcon from './components/SurferIcon';

// Светлые темы держат обычную палитру Tailwind, тёмные — набор для darkMode.
// wizard тёмный (ночь Хогвартса), surf светлый (день на океане)
export const DARK_THEMES = ['dark', 'wizard'];

export const THEME_OPTIONS = [
  { key: 'light', label: 'Light', Icon: Sun, hint: 'Light theme' },
  { key: 'dark', label: 'Dark', Icon: Moon, hint: 'Dark theme' },
  { key: 'wizard', label: 'Wizard', Icon: Wand2, hint: 'Harry Potter — Prisoner of Azkaban' },
  { key: 'surf', label: 'Surf', Icon: Waves, hint: 'Indian ocean & surf' },
  { key: 'millenial', label: 'Millenial', Icon: Monitor, hint: 'Windows XP, 2001' },
  { key: 'handwriting', label: 'Handwriting', Icon: PenLine, hint: 'A paper notebook' }
];

// Иконки описаны ролями («раздел с проектами»), а не картинками, поэтому тема
// подменяет их целиком, а компоненты просто спрашивают иконку по роли
const DEFAULT_ICONS = {
  projects: Home,
  schedule: Calendar,
  notes: StickyNote,
  chill: Coffee,
  settings: Settings,
  add: Plus,
  refresh: RefreshCw,
  mascot: Sparkles
};

const THEME_ICONS = {
  wizard: {
    projects: Castle,
    schedule: ScrollText,
    notes: BookOpenText,
    chill: Sparkles,
    settings: Wand2,
    add: Feather,
    refresh: Sparkles,
    // По квадрату дыхания ходит палочка, а не сова: движение по периметру
    // читается как взмах, и это ближе к теме, чем птица
    mascot: Wand
  },
  handwriting: {
    projects: Notebook,
    schedule: CalendarDays,
    notes: NotebookPen,
    chill: Coffee,
    settings: Pencil,
    add: Pencil,
    refresh: Highlighter,
    mascot: Paperclip
  },
  millenial: {
    projects: FolderOpen,
    schedule: CalendarDays,
    notes: FileText,
    chill: Music2,
    settings: Wrench,
    add: Plus,
    refresh: RefreshCw,
    mascot: Monitor
  },
  surf: {
    projects: Compass,
    schedule: CalendarDays,
    notes: Shell,
    chill: Palmtree,
    // Якорь читался как «морская тема», а не как настройки — ползунки понятнее
    settings: SlidersHorizontal,
    add: Plus,
    refresh: Waves,
    // Сёрфер на доске вместо рыбы: он идёт по сторонам квадрата как по волне
    mascot: SurferIcon
  }
};

export const themeIcon = (theme, role) =>
  THEME_ICONS[theme]?.[role] || DEFAULT_ICONS[role];

// Цвет строки состояния в установленном приложении — под фон текущей темы
export const THEME_COLORS = {
  light: '#f9fafb',
  dark: '#111827',
  wizard: '#0a1418',
  surf: '#eaf7fb',
  millenial: '#245edb',
  handwriting: '#faf6ec'
};

// Заголовок вкладки Chill — маленькая деталь, но именно она задаёт настроение странице
export const CHILL_BADGE = {
  light: '🌿',
  dark: '🌿',
  wizard: '🕯️',
  surf: '🌊',
  millenial: '💿',
  handwriting: '✏️'
};
