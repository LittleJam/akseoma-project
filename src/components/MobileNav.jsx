import React from 'react';
import { themeIcon } from '../themes';

// Нижняя навигация телефона — замена сайдбару, который на 390px закрывал бы
// две трети экрана. Разделы те же и в том же порядке, что в сайдбаре, иначе
// приложение ощущалось бы двумя разными приложениями.
//
// Панель лежит в потоке, а не поверх содержимого: так под неё не нужен ни
// отступ у страниц, ни отдельный учёт выреза — #root уже отдал нижнюю
// безопасную зону паддингом.
const ITEMS = [
  { page: 'kanban', feature: 'kanban', icon: 'projects', label: 'Projects' },
  { page: 'weekly', feature: 'weekly', icon: 'schedule', label: 'Schedule' },
  { page: 'notes', feature: 'notes', icon: 'notes', label: 'Notes' },
  { page: 'chill', feature: 'chill', icon: 'chill', label: 'Chill' },
  // Настройки доступны всегда: там же выход из приложения
  { page: 'settings', feature: null, icon: 'settings', label: 'Settings' }
];

export default function MobileNav({ darkMode, theme, currentPage, setCurrentPage, allowed = () => true }) {
  const visible = ITEMS.filter(item => !item.feature || allowed(item.feature));

  return (
    <nav
      /* data-sidebar — тот же хук, по которому темы оформляют боковую панель.
         Панель на телефоне скрыта, и без него millenial терял свою синюю полосу
         Luna: нижняя навигация оставалась белой, а тема — неузнаваемой */
      data-sidebar
      className={`sm:hidden flex-shrink-0 h-[var(--mobile-nav-h)] flex items-stretch border-t ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      {visible.map(item => {
        const Icon = themeIcon(theme, item.icon);
        const active = currentPage === item.page;
        return (
          <button
            key={item.page}
            onClick={() => setCurrentPage(item.page)}
            aria-current={active ? 'page' : undefined}
            /* Подпись под иконкой: значков тем шесть наборов, и без слова
               «свиток» и «ракушка» опознаются не всеми */
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 press ${
              active
                ? darkMode ? 'text-green-400' : 'text-green-700'
                : darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] leading-none truncate max-w-full px-1">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
