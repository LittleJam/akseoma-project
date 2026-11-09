import React from 'react';
import { useAttachmentUrl } from '../utils/useAttachment';

// Картинка вложения. Отдельным компонентом, потому что ссылку на байты даёт
// хук, а картинки рисуются списком — внутри map хук не вызвать.
// Пока байты достают из хранилища, на месте картинки стоит заглушка того же
// размера: без неё ряд подпрыгивал бы на каждое открытие заметки
export default function AttachmentImage({ line, alt = '', className, fallbackClassName, ...rest }) {
  const url = useAttachmentUrl(line);

  if (!url) return <div className={fallbackClassName || className} aria-hidden="true" />;
  return <img src={url} alt={alt} className={className} {...rest} />;
}
