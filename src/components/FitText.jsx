import React, { useLayoutEffect, useRef } from 'react';

// Текст, который уменьшается, чтобы уместиться в одну строку.
//
// Нужен там, где строка — часть композиции, а не абзац: название заметки на
// обложке стоит в углу, и перенос на вторую строку ломает картинку сильнее,
// чем чуть меньший кегль.
//
// Меняем именно размер шрифта, а не transform: масштаб растянул бы и толщину
// штриха, у мелкого текста это заметно. Ширину меряем у самого элемента: он
// блочный, поэтому clientWidth — это отведённое место, а scrollWidth — сколько
// на самом деле занимает строка.
//
// min — предел уменьшения, доля от исходного кегля. Ниже него не опускаемся:
// нечитаемая строка не лучше перенесённой, поэтому если и на минимуме не
// влезло, разрешаем вторую строку.
export default function FitText({ children, className = '', min = 0.7 }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.whiteSpace = 'nowrap';
      el.style.fontSize = '';

      const base = parseFloat(window.getComputedStyle(el).fontSize) || 12;
      if (!el.clientWidth) return;

      // Кегль убавляем пропорционально переполнению. Метрики шрифта почти
      // линейны по размеру, поэтому второго прохода хватает на округления
      for (let pass = 0; pass < 2; pass += 1) {
        if (el.scrollWidth <= el.clientWidth) break;
        const current = parseFloat(el.style.fontSize) || base;
        const next = Math.max(current * (el.clientWidth / el.scrollWidth), base * min);
        el.style.fontSize = `${next}px`;
        if (next <= base * min) break;
      }

      el.style.whiteSpace = el.scrollWidth > el.clientWidth + 1 ? 'normal' : 'nowrap';
    };

    fit();

    // Следим за родителем, а не за собой: мы сами меняем размер текста, и
    // наблюдение за собственной шириной закрутило бы петлю
    const parent = el.parentElement;
    const observer = parent ? new ResizeObserver(fit) : null;
    observer?.observe(parent);
    // Шрифт темы приезжает позже первой отрисовки и меняет ширину строки
    document.fonts?.ready.then(fit).catch(() => {});

    return () => observer?.disconnect();
  }, [children, min]);

  return (
    <span ref={ref} className={`block overflow-hidden ${className}`}>
      {children}
    </span>
  );
}
