import React, { useEffect } from 'react';

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
  closeOnEsc = true,          // выключается там, где окно закрывает слои по одному
  closeOnBackdrop = true,
  overlayProps = {},          // например, обработчики перетаскивания файлов
  overlayClassName = '',
  panelClassName = '',
  children
}) {
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

  const isViewer = layer === 'viewer';

  return (
    <div
      {...overlayProps}
      onClick={closeOnBackdrop && onClose ? onClose : undefined}
      /* sheet-backdrop делает подложку сплошной на телефоне: цвета заметок в
         тёмных темах полупрозрачные, и сквозь развёрнутое окно просвечивал
         список под ним. С sm правило не действует, там снова затемнение */
      className={`fixed inset-0 ${isViewer ? 'z-viewer bg-black/80' : 'z-modal bg-black/40'} ${
        sheet ? 'sheet-backdrop' : ''
      } flex items-start sm:items-center justify-center ${
        sheet ? 'p-0 sm:p-6' : 'p-3 sm:p-6'
      } overflow-y-auto animate-fade-in ${overlayClassName}`}
    >
      {/* Клик внутри окна не должен его закрывать */}
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full ${sheet ? 'min-h-full sm:min-h-0' : ''} ${SIZES[size]} my-auto flex flex-col animate-dialog-in ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
