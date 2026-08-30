import React from 'react';

// Общая обвязка страницы: отступы, заголовок, скролл и ширина контента —
// заданы здесь один раз, а не скопированы в каждую страницу.
//
// variant='default' — шапка прибита сверху, скроллится только тело. Так уже
//   работает канбан: у него колонки со своим скроллом и иначе он не может,
//   поэтому именно он задаёт стандарт для остальных.
// variant='focus'  — страница без шапки, контент по центру экрана. Это Chill:
//   странице для дыхания панель управления не нужна.
//
// width='grid'  — контент во всю ширину: доски, сетки карточек.
// width='prose' — узкая колонка: формы и настройки. Правило простое —
//   сетка заполняет ширину, форма нет.
export default function PageShell({
  darkMode,
  title,
  width = 'grid',
  variant = 'default',
  actions,
  subheader,
  children
}) {
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';

  if (variant === 'focus') {
    return (
      <div className={`relative overflow-hidden flex-1 flex items-center justify-center ${bgClass}`}>
        {children}
      </div>
    );
  }

  const borderClass = darkMode ? 'border-gray-800' : 'border-gray-200';
  const titleClass = darkMode ? 'text-white' : 'text-gray-800';

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${bgClass}`}>
      {/* Шапка не уезжает при скролле, поэтому нижняя граница нужна:
          без неё контент подъезжает под заголовок без видимого рубежа */}
      <div className={`flex-shrink-0 border-b ${borderClass} px-4 sm:px-8 pt-4 sm:pt-6 pb-4 sm:pb-5`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className={`text-title sm:text-title-lg truncate ${titleClass}`}>{title}</h2>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
        {subheader && <div className="mt-4 sm:mt-5">{subheader}</div>}
      </div>

      {/* Обёртку добавляем только для узкой колонки: у сеток она разорвала бы
          цепочку высот (канбану нужен min-h-full до самого низа) */}
      <div className="flex-1 min-h-0 overflow-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-4 sm:pb-8">
        {width === 'prose' ? <div className="max-w-prose">{children}</div> : children}
      </div>
    </div>
  );
}
