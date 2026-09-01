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
// width='prose' — узкая колонка по центру: формы и настройки. Правило простое —
//   сетка заполняет ширину, форма нет.
//
// flushTop      — верхний отступ тела страница даёт себе сама. Нужно там, где
//   внутри есть липкие заголовки: padding-top у скроллера оставляет над ними
//   полосу, в которой видно уезжающие карточки.
export default function PageShell({
  darkMode,
  title,
  width = 'grid',
  variant = 'default',
  actions,
  subheader,
  flushTop = false,
  children
}) {
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';

  if (variant === 'focus') {
    return (
      <div data-page className={`relative overflow-hidden flex-1 flex items-center justify-center ${bgClass}`}>
        {children}
      </div>
    );
  }

  const borderClass = darkMode ? 'border-gray-800' : 'border-gray-200';
  const titleClass = darkMode ? 'text-white' : 'text-gray-800';

  // Кнопки страницы всегда в нижней полосе шапки — рядом с подзаголовком,
  // а если его нет, то с заголовком, который в этом случае сам стоит внизу
  const actionsRow = <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>;

  return (
    <div data-page className={`flex-1 flex flex-col overflow-hidden ${bgClass}`}>
      {/* Шапка не уезжает при скролле, поэтому нижняя граница нужна:
          без неё контент подъезжает под заголовок без видимого рубежа.
          Высота фиксирована токеном --shell-header-h: граница обязана лечь ровно
          на линию под блоком пользователя в сайдбаре, одинаково на всех страницах
          независимо от того, есть подзаголовок или нет. Не height, а min-height —
          если панель под заголовком перенесётся на вторую строку на узком экране,
          шапка вырастет, а не обрежет содержимое.

          Сайдбар слева делит ту же высоту на две полосы — логотип и пользователь,
          и шапка выкладывает содержимое по ним. Есть подзаголовок — заголовок
          идёт по логотипу, подзаголовок прижат к низу и встаёт по пользователю.
          Нет подзаголовка — по пользователю идёт сам заголовок: висеть ему
          наверху с пустотой под собой незачем. Кнопки страницы в обоих случаях
          прижаты к правому краю нижней полосы. */}
      {/* Высота шапки задана токеном только с sm: рубеж должен совпасть с линией
          под блоком пользователя в сайдбаре, а на телефоне сайдбара нет — там
          эти 129px были бы пустой полосой поперёк и без того короткого экрана */}
      <div className={`flex-shrink-0 sm:min-h-[var(--shell-header-h)] flex flex-col border-b ${borderClass} px-6 sm:px-8 ${subheader ? 'pt-4 sm:pt-6 pb-4 sm:pb-5' : 'py-3 sm:py-0'}`}>
        <div
          className={`flex items-center justify-between gap-4 ${
            subheader ? '' : 'mt-auto flex-shrink-0 sm:h-[var(--user-h)]'
          }`}
        >
          {/* Заголовком может быть не только строка, но и элемент — например,
              переключатель проектов на телефоне. Обрезку в этом случае не
              навязываем: overflow срезал бы его выпадающий список */}
          <h2 className={`text-title sm:text-title-lg min-w-0 ${typeof title === 'string' ? 'truncate' : ''} ${titleClass}`}>
            {title}
          </h2>
          {actions && !subheader && actionsRow}
        </div>
        {subheader && (
          <div className="mt-auto pt-4 sm:pt-5 flex items-center justify-between gap-4">
            {/* flex-1 обязателен вместе с min-w-0: без него полоса под заголовком
                занимает ширину своего содержимого и на телефоне вылезает за экран,
                утаскивая за собой всю страницу */}
            <div className="flex-1 min-w-0">{subheader}</div>
            {actions && actionsRow}
          </div>
        )}
      </div>

      {/* Обёртку добавляем только для узкой колонки: у сеток она разорвала бы
          цепочку высот (канбану нужен min-h-full до самого низа) */}
      <div className={`flex-1 min-h-0 overflow-auto px-6 sm:px-8 pb-4 sm:pb-8 ${flushTop ? '' : 'pt-4 sm:pt-6'}`}>
        {width === 'prose' ? <div className="max-w-prose mx-auto">{children}</div> : children}
      </div>
    </div>
  );
}
