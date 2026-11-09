import React, { useEffect, useRef } from 'react';
import { useBackClose } from '../utils/backClose';

// Общее окно поверх страницы. Всё, что раньше было написано по-разному
// в каждом окне, задано здесь один раз: затемнение, слой, центрирование,
// закрытие по Escape и по клику мимо, блокировка скролла под окном, анимация.
const SIZES = {
  sm: 'max-w-md',      // короткий диалог: вопрос и две кнопки
  md: 'max-w-2xl',     // заметка
  lg: 'max-w-modal',   // редактор задачи
  full: 'max-w-none'
};

export default function Modal({
  onClose,
  size = 'md',
  layer = 'modal',            // 'modal' | 'viewer' — просмотрщик картинок лежит выше окна
  // Разворачиваться ли во весь экран на телефоне. Окно в окне со своим скроллом
  // внутри скролла страницы на 390px читается плохо, поэтому редакторы заметки
  // и задачи занимают экран целиком. Короткие диалоги — нет: вопрос с двумя
  // кнопками во весь экран выглядел бы как отдельная страница
  sheet = false,
  // Подгонять ли высоту карточки под клавиатуру. Включено только у открытой
  // заметки: там курсор стоит в contentEditable-строке у самого низа длинного
  // текста, и без подгонки его не видно. У редактора задачи всё в порядке и
  // без этого — поведение там остаётся прежним
  fitsKeyboard = false,
  closeOnEsc = true,          // выключается там, где окно закрывает слои по одному
  closeOnBackdrop = true,
  // Закрывать ли окно системным «назад». Выключается там, где окно и так живёт
  // в адресе (открытая заметка, гороскоп): там запись в истории уже есть
  backCloses = true,
  overlayProps = {},          // например, обработчики перетаскивания файлов
  overlayClassName = '',
  panelClassName = '',
  children
}) {
  // Системный «назад» на телефоне закрывает окно — как Escape на клавиатуре
  useBackClose(backCloses && Boolean(onClose), onClose);

  useEffect(() => {
    if (!closeOnEsc || !onClose) return;
    const handleKeyDown = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEsc, onClose]);

  // Пока окно открыто, страница под ним не должна прокручиваться
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const panelRef = useRef(null);
  const overlayRef = useRef(null);

  // Высота карточки окна на телефоне подогнана под клавиатуру, а не только
  // под экран. index.html держит interactive-widget=overlays-content нарочно
  // — иначе от клавиатуры прыгают борд и нижняя навигация (см. коммит «Экран
  // не прыгает при наборе»), — и поэтому обычный 100%/100dvh о клавиатуре
  // знать не может: карточка как была высотой в целый экран, так и остаётся,
  // даже когда снизу выросла клавиатура. WebKit же видит курсор скрытым и сам
  // решает прокрутить ближайшего прокручиваемого предка, чтобы его показать —
  // и тогда всё окно уезжает вверх вместе с шапкой.
  //
  // Ужимать нужно саму карточку, а не подложку под ней: подложка остаётся
  // во весь физический экран (inset-0) и закрывает собой то, что снизу —
  // список заметок со своей нижней навигацией. Если ужать подложку, между
  // её нижним краем и настоящим низом экрана открывается щель, и чужая
  // навигация всплывает прямо над клавиатурой
  useEffect(() => {
    if (!sheet) return;
    const vv = window.visualViewport;
    const el = panelRef.current;
    if (!vv || !el) return;

    if (!fitsKeyboard) {
      const update = () => { el.style.height = `${vv.height}px`; };
      update();
      vv.addEventListener('resize', update);
      return () => {
        vv.removeEventListener('resize', update);
        el.style.height = '';
      };
    }

    // Карточку под клавиатуру НЕ ужимаем: она остаётся во весь экран, а
    // клавиатура ложится поверх неё. Так ничего не прыгает в момент её
    // появления, шапка заметки стоит на месте, а до строк, оказавшихся под
    // клавиатурой, текст доносит прокрутка — ей для этого добавлен запас
    // снизу (см. NoteModal) и ограничение по видимой области (caretScroll).
    //
    // Подложка приклеена к раскладочной области (fixed inset-0), а iOS при
    // поднятой клавиатуре двигает видимую область внутри неё — сам, чтобы
    // показать курсор. Раскладочная при этом не меняется, поэтому окно
    // уезжало бы вверх целиком, вместе с шапкой. Двигаем подложку следом.
    // top вместо transform: transform на этом же элементе занят свайпом
    // назад от края (nativeSwipe.js), и они затирали бы друг друга.
    //
    // Высота подложки — во весь экран, не по видимой области. Ужатая
    // открывала щель между своим нижним краем и клавиатурой: туда попадает
    // панель предиктивного ввода, она полупрозрачная, и сквозь неё
    // просвечивал список заметок под окном
    const update = () => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      overlay.style.top = `${vv.offsetTop}px`;
      overlay.style.height = `${window.innerHeight}px`;
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.style.top = '';
        overlay.style.height = '';
      }
    };
  }, [sheet, fitsKeyboard]);

  // Подстройка высоты выше срабатывает по событию resize у visualViewport —
  // а WebKit решает прокрутить что-нибудь под курсором раньше, ещё в момент
  // фокуса, до того как клавиатура вообще успела появиться и это событие
  // прилетело. Гонка, и в ней documentElement иногда успевает уехать первым.
  // Здесь — грубая подстраховка: пока клавиатура анимируется, каждый кадр
  // силой возвращаем документ на место. Затрагивает только сам документ
  // (body/html), не .overscroll-contain внутри заметки — её скролл трогать
  // как раз не нужно
  useEffect(() => {
    if (!sheet) return;
    const panel = panelRef.current;
    if (!panel) return;

    let rafId = null;
    let stopAt = 0;

    const resetDocumentScroll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      const root = document.scrollingElement;
      if (root && root.scrollTop !== 0) root.scrollTop = 0;
    };

    const tick = () => {
      resetDocumentScroll();
      rafId = performance.now() < stopAt ? requestAnimationFrame(tick) : null;
    };

    // 600мс с запасом перекрывает и анимацию появления клавиатуры (обычно
    // ~250–350мс), и задержку до первого resize у visualViewport
    const onFocusIn = () => {
      stopAt = performance.now() + 600;
      if (rafId === null) tick();
    };

    panel.addEventListener('focusin', onFocusIn);
    return () => {
      panel.removeEventListener('focusin', onFocusIn);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [sheet]);

  const isViewer = layer === 'viewer';

  return (
    <div
      ref={overlayRef}
      {...overlayProps}
      onClick={closeOnBackdrop && onClose ? onClose : undefined}
      /* Хук для свайпа назад от края на iOS (см. utils/nativeSwipe.js):
         во время жеста нативный слой двигает это окно transform'ом вслед за
         пальцем — сам жест распознаётся в MainViewController.swift */
      data-swipe-panel
      /* sheet-backdrop делает подложку сплошной на телефоне: цвета заметок в
         тёмных темах полупрозрачные, и сквозь развёрнутое окно просвечивал
         список под ним. С sm правило не действует, там снова затемнение */
      className={`fixed inset-0 ${isViewer ? 'z-viewer bg-black/80' : 'z-modal bg-black/40'} ${
        sheet ? 'sheet-backdrop' : ''
      } flex items-start sm:items-center justify-center ${
        sheet ? 'p-0 sm:p-6' : 'p-3 sm:p-6'
      } ${
        /* На телефоне у sheet-окна (заметка, редактор задачи) панель ровно
           высотой в экран, и своя прокрутка есть у текста внутри неё — эта
           подложка ей не нужна вовсе. Если оставить здесь overflow-y-auto,
           WebKit при открытии клавиатуры сам решает, что скроллить, чтобы
           курсор остался виден, и иногда выбирает именно эту подложку —
           тогда едет вся панель целиком, вместе с шапкой, а не текст внутри
           неё. С sm снова обычный диалог: панель растёт под контент и сама
           не скроллится, скроллит именно подложка */
        sheet ? 'overflow-hidden sm:overflow-y-auto' : 'overflow-y-auto'
      } animate-fade-in ${overlayClassName}`}
    >
      {/* Клик внутри окна не должен его закрывать */}
      <div
        ref={panelRef}
        onClick={e => e.stopPropagation()}
        /* Хук для тем: окно — поверхность для чтения, а не карточка на
           странице. Темы делают карточки полупрозрачными нарочно, но сквозь
           окно не должно просвечивать то, что под ним */
        data-dialog
        /* isolate — свой слой у окна. Без него цветная подложка заметки,
           лежащая под содержимым, пропадала бы, как только доиграет анимация
           появления: она и создавала слой, а вместе с ней исчезал бы и он.
           Окно во весь экран — fixed и потому вне отступа #root под вырез:
           тот действует только на обычный, не зафиксированный контент. На
           телефоне шапка окна сама отступает от полосы с часами и батареей,
           а подвал — от полосы-указателя внизу: без этого кнопки «Сохранить»
           и «Добавить» лежали прямо под ней и попадали под жест системы */
        /* my-0 на телефоне у окна, которое ужимается под клавиатуру: авто-поля
           по вертикали съедают свободное место и пересиливают items-start у
           подложки. Свободное место появляется ровно тогда, когда карточка
           стала ниже подложки — то есть когда поднялась клавиатура, — и
           карточка отцентрировалась бы, открыв щель над шапкой */
        className={`relative isolate w-full ${sheet ? 'min-h-full sm:min-h-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0' : ''} ${SIZES[size]} ${fitsKeyboard ? 'my-0 sm:my-auto' : 'my-auto'} flex flex-col animate-dialog-in ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
