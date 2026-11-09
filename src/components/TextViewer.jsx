import React, { useEffect, useState } from 'react';
// Текстовые вложения и .docx.
//
// Простой текст показываем как есть, моноширинным и с переносами по ширине
// экрана: горизонтальная прокрутка в документе на телефоне бесполезна.
// .docx — это zip с разметкой, сам по себе он нечитаем, поэтому его переводит
// в HTML mammoth. Он, как и pdf.js, подгружается отдельным куском и только
// тогда, когда такой файл действительно открыли

// Дальше этого не показываем: заметка и так ограничена пятью мегабайтами,
// но текстовый файл такого размера — это миллионы символов, и разом на
// странице они кладут отрисовку
const MAX_CHARS = 400000;

export default function TextViewer({ bytes, kind, darkMode }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    // Байты ещё достают из хранилища — ждём, эффект перезапустится
    if (!bytes) return undefined;

    (async () => {
      try {
        if (kind === 'docx') {
          const mammoth = await import('mammoth');
          // Мы уже держим файл в памяти — arrayBuffer, а не путь
          const { value } = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
          if (!cancelled) setState({ status: 'ready', html: value });
          return;
        }

        // fatal: false — файл мог быть сохранён не в UTF-8; лучше показать
        // текст с несколькими испорченными знаками, чем не показать ничего
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        if (!cancelled) {
          setState({
            status: 'ready',
            text: text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text,
            truncated: text.length > MAX_CHARS
          });
        }
      } catch (error) {
        console.error('Text open error:', error);
        if (!cancelled) setState({ status: 'error' });
      }
    })();

    return () => { cancelled = true; };
  }, [bytes, kind]);

  const muted = darkMode ? 'text-gray-500' : 'text-gray-400';
  const body = darkMode ? 'text-gray-200' : 'text-gray-700';

  return (
    <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {state.status === 'loading' && (
        <p className={`p-4 text-sm animate-pulse ${muted}`}>Opening…</p>
      )}
      {state.status === 'error' && (
        <p className={`p-4 text-sm ${muted}`}>This file could not be opened. Use Share to open it elsewhere.</p>
      )}
      {state.status === 'ready' && state.html !== undefined && (
        /* Разметку отдаёт mammoth из самого файла — это текст документа,
           который пользователь сам и приложил, не чужая страница */
        <div
          className={`p-4 text-sm leading-relaxed break-words note-document ${body}`}
          dangerouslySetInnerHTML={{ __html: state.html }}
        />
      )}
      {state.status === 'ready' && state.text !== undefined && (
        <pre className={`p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words ${body}`}>
          {state.text}
        </pre>
      )}
      {state.truncated && (
        <p className={`px-4 pb-4 text-xs ${muted}`}>File is too long — showing the beginning only.</p>
      )}
    </div>
  );
}
