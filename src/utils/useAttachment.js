import { useEffect, useState } from 'react';
import { getAttachmentBlob } from './attachmentStore';

// Доступ к байтам вложения из компонентов. Строка заметки хранит только
// ссылку (ref), сами байты лежат в attachmentStore. Вложения, добавленные до
// переезда хранилища, держат data URL прямо в src — их отдаём как есть,
// чтобы заметка осталась читаемой и до того, как перенос до неё дошёл

// Ссылка для <img>: живёт ровно столько, сколько показывается картинка
export const useAttachmentUrl = (line) => {
  const ref = line?.ref || null;
  const legacy = typeof line?.src === 'string' ? line.src : null;
  const [url, setUrl] = useState(legacy);

  useEffect(() => {
    if (legacy) {
      setUrl(legacy);
      return;
    }
    if (!ref) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let created = null;
    setUrl(null);

    getAttachmentBlob(ref).then(blob => {
      if (cancelled || !blob) return;
      created = URL.createObjectURL(blob);
      setUrl(created);
    });

    return () => {
      cancelled = true;
      // Без revokeObjectURL блоб держится в памяти до перезагрузки страницы
      if (created) URL.revokeObjectURL(created);
    };
  }, [ref, legacy]);

  return url;
};

// Сами байты — их ждут просмотрщики PDF и текста
export const useAttachmentBytes = (line) => {
  const ref = line?.ref || null;
  const legacy = typeof line?.src === 'string' ? line.src : null;
  const [state, setState] = useState({ status: 'loading', bytes: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', bytes: null });

    (async () => {
      try {
        if (legacy) {
          const comma = legacy.indexOf(',');
          if (comma === -1) throw new Error('broken data url');
          const binary = atob(legacy.slice(comma + 1));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          if (!cancelled) setState({ status: 'ready', bytes });
          return;
        }

        if (!ref) throw new Error('no attachment');

        const blob = await getAttachmentBlob(ref);
        if (cancelled) return;
        if (!blob) {
          // Вложение есть в заметке, а байтов нет: их не догнала синхронизация
          // с того устройства, где файл прикрепили
          setState({ status: 'missing', bytes: null });
          return;
        }
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (!cancelled) setState({ status: 'ready', bytes });
      } catch (error) {
        console.error('Attachment read error:', error);
        if (!cancelled) setState({ status: 'missing', bytes: null });
      }
    })();

    return () => { cancelled = true; };
  }, [ref, legacy]);

  return state;
};
