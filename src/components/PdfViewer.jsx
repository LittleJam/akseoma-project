import React, { useEffect, useRef, useState } from 'react';
// Все страницы PDF, каждая по ширине экрана.
//
// Встроенный просмотрщик WKWebView сюда не годится: во вложенном документе
// (<iframe>, <object>) он отдаёт только первую страницу и не умеет вписывать
// её в ширину. Поэтому страницы рисуем сами, на canvas: сколько их в файле,
// столько и будет, одна под другой, а ширина всегда равна ширине контейнера —
// и при повороте экрана они перерисовываются под новую.
//
// pdf.js подгружается динамически, отдельным куском: он весит больше всего
// остального приложения вместе взятого, а нужен только тому, кто открыл PDF

// Больше двух точек на пиксель не рисуем: на глаз уже неотличимо, а память
// на длинном документе такой холст съедает быстро
const MAX_PIXEL_RATIO = 2;

export default function PdfViewer({ bytes, darkMode }) {
  const hostRef = useRef(null);
  const docRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Ширина контейнера — она же ширина страницы. ResizeObserver, а не событие
  // поворота: контейнер меняет размер и когда окно просто пересобралось
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(entries => {
      const next = Math.round(entries[0].contentRect.width);
      setWidth(previous => (Math.abs(previous - next) > 1 ? next : previous));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // Разбор файла — один раз на вложение
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    docRef.current = null;
    // Байты ещё достают из хранилища — ждём, эффект перезапустится
    if (!bytes) return undefined;

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        // Воркер отдельным файлом: без него pdf.js разбирает документ прямо
        // в основном потоке и подвешивает интерфейс на время открытия
        const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        // Копию, а не сами байты: pdf.js забирает буфер себе, и повторное
        // открытие того же вложения получило бы пустой
        const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        docRef.current = doc;
        setStatus('ready');
      } catch (error) {
        console.error('PDF open error:', error);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      const doc = docRef.current;
      docRef.current = null;
      // Уборки эффектов идут в порядке объявления: документ уничтожается
      // раньше, чем отменится отрисовка страницы ниже, и pdf.js на это
      // ругается — и синхронно, и отложенно. Ни то, ни другое не должно
      // ронять приложение: мы и так уходим с экрана
      if (!doc) return;
      try {
        const done = doc.destroy();
        if (done && typeof done.catch === 'function') done.catch(() => {});
      } catch {
        // уже уничтожен
      }
    };
  }, [bytes]);

  // Отрисовка всех страниц под текущую ширину
  useEffect(() => {
    const host = hostRef.current;
    const doc = docRef.current;
    if (status !== 'ready' || !host || !doc || width <= 0) return;

    let cancelled = false;
    let task = null;
    host.replaceChildren();

    (async () => {
      try {
        const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

        for (let number = 1; number <= doc.numPages; number += 1) {
          if (cancelled) return;
          const page = await doc.getPage(number);
          if (cancelled) return;

          // Масштаб считаем от страницы в её собственных единицах: так лист
          // любого формата — хоть A4, хоть альбомный — ложится ровно в ширину
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          // Пикселей в холсте больше, чем на экране — размер на странице
          // задаём отдельно, иначе лист вылезет за край во всю свою плотность
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.className = darkMode ? 'rounded-lg shadow-lg' : 'rounded-lg shadow';
          host.appendChild(canvas);

          task = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
          await task.promise;
          // Законченную задачу отменять нельзя — в pdf.js её внутренности уже
          // разобраны, и cancel() на ней бросает
          task = null;
        }
      } catch (error) {
        // Уход с экрана посреди отрисовки — обычное дело: и getPage, и сам
        // render после этого отказывают. Это не сбой, и ошибкой наружу
        // выходить не должно
        if (!cancelled) console.error('PDF render error:', error);
      }
    })();

    return () => {
      cancelled = true;
      const pending = task;
      task = null;
      if (!pending) return;
      try {
        pending.cancel();
      } catch {
        // уже завершилась
      }
    };
  }, [status, width, darkMode]);

  const muted = darkMode ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${darkMode ? 'bg-gray-950' : 'bg-gray-100'}`}>
      {status === 'loading' && (
        <p className={`p-4 text-sm animate-pulse ${muted}`}>Opening…</p>
      )}
      {status === 'error' && (
        <p className={`p-4 text-sm ${muted}`}>This file could not be opened. Use Share to open it elsewhere.</p>
      )}
      {/* Страницы кладём сюда напрямую, мимо React: перерисовывать холсты
          на каждый повод — лишняя работа, а рисует их всё равно pdf.js */}
      <div ref={hostRef} className="flex flex-col gap-3 p-3" />
    </div>
  );
}
