// Общий путь для любого способа прикрепить файл к заметке — кнопка в меню,
// перетаскивание и на карточку в списке, и на открытую заметку, и вставка из
// буфера. Картинки по-прежнему сжимаются и остаются картиночной строкой,
// всё остальное ложится файловой строкой как есть: имя, размер и сам файл
// в src (data URL), чтобы им можно было поделиться той же ссылкой на скачивание
import { Capacitor } from '@capacitor/core';
import { compressImage } from './imageCompression';
import { getNoteLines, newLineId, LINE_IMAGE, LINE_FILE } from './noteLines';
import { newAttachmentRef, putAttachment, uploadPendingAttachments, getAttachmentBlob } from './attachmentStore';

// Байты вложения в заметке больше не лежат — только ссылка, а сами файлы
// уходят в attachmentStore (IndexedDB на устройстве, Storage-бакет в облаке).
// Ограничение осталось, но теперь оно про разумность, а не про квоту: файл
// надо ещё и выгрузить, и скачать на другом устройстве
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// compressImage отдаёт data URL — в хранилище кладём уже двоичным Blob,
// иначе лишняя треть объёма переезжает вместе с картинкой
export const dataUrlToBlob = (dataUrl) => {
  const comma = String(dataUrl).indexOf(',');
  if (comma === -1) return null;
  const head = String(dataUrl).slice(0, comma);
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'application/octet-stream';
  const binary = atob(String(dataUrl).slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

// Положить байты в хранилище и вернуть строку заметки, которая на них ссылается
const storeAttachment = async ({ blob, type, name, mime }) => {
  const ref = newAttachmentRef();
  await putAttachment({ ref, blob, mime: mime || blob.type, name, size: blob.size });
  return { id: newLineId(), type, text: '', ref, name, size: blob.size, mime: mime || blob.type };
};

// files — любой перечислимый список File (FileList из инпута или буфера,
// массив из dataTransfer.files). Возвращает готовые строки для вставки в
// заметку и список файлов, которые не влезли в лимит и не попали в них
export const buildAttachmentLines = async (files) => {
  const list = Array.from(files || []);
  const images = list.filter(f => f.type.startsWith('image/'));
  const rest = list.filter(f => !f.type.startsWith('image/'));
  const oversized = rest.filter(f => f.size > MAX_ATTACHMENT_SIZE);
  const attachable = rest.filter(f => f.size <= MAX_ATTACHMENT_SIZE);

  const imageLines = await Promise.all(images.map(async file => {
    const blob = dataUrlToBlob(await compressImage(file));
    return storeAttachment({ blob, type: LINE_IMAGE, name: file.name, mime: blob?.type });
  }));

  const fileLines = await Promise.all(attachable.map(file => storeAttachment({
    blob: file, type: LINE_FILE, name: file.name, mime: file.type
  })));

  // Отправку в облако не ждём: вложение уже на устройстве и заметка готова,
  // а сеть может оказаться медленной или её может не быть вовсе
  uploadPendingAttachments().catch(error => console.error('Attachment upload error:', error));

  return { lines: [...imageLines, ...fileLines], oversized };
};

// Расширения, которые заведомо просто текст. Списком, а не по одному лишь
// mime: браузер и система отдают для них что угодно, вплоть до пустой строки
const TEXT_EXTENSIONS = /\.(txt|md|markdown|csv|tsv|log|json|xml|ya?ml|ini|conf|cfg|env|srt|vtt|sql|rtf)$/i;

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Что это за вложение и умеем ли мы его показать. Тип берём из трёх мест: у
// новых вложений есть сохранённый mime, у добавленных раньше его нет — тогда
// по самому data URL, а если и он не сохранил тип, то по расширению в имени.
// null означает «показать не умеем» — такой файл только отдаётся наружу
export const openableKind = (line) => {
  if (!line) return null;
  const name = line.name || '';
  const mime = line.mime || '';
  const src = typeof line.src === 'string' ? line.src : '';

  if (mime === 'application/pdf' || src.startsWith('data:application/pdf') || /\.pdf$/i.test(name)) {
    return 'pdf';
  }
  if (mime === DOCX_MIME || src.startsWith(`data:${DOCX_MIME}`) || /\.docx$/i.test(name)) {
    return 'docx';
  }
  if (mime.startsWith('text/') || src.startsWith('data:text/')) return 'text';
  if (mime === 'application/json' || mime === 'application/xml') return 'text';
  if (TEXT_EXTENSIONS.test(name)) return 'text';

  // .doc старого, двоичного образца (Word 97-2003) сюда намеренно не попадает:
  // разобрать его в браузере нечем, и честнее отдать файл системе
  return null;
};

// Перенос вложений, добавленных до появления отдельного хранилища: их байты
// лежат data URL'ом прямо в строке заметки и раздувают localStorage до отказа.
// Идём по заметкам один раз при запуске; заметки без вложений не трогаем вовсе,
// чтобы не материализовать строки там, где они до сих пор считаются лениво
export const migrateNoteAttachments = async (notes) => {
  if (!Array.isArray(notes)) return { notes, changed: false };

  const inline = (line) => typeof line.src === 'string' && line.src.startsWith('data:');
  let changed = false;
  const result = [];

  for (const note of notes) {
    const lines = getNoteLines(note);
    if (!lines.some(inline)) {
      result.push(note);
      continue;
    }

    const nextLines = [];
    for (const line of lines) {
      if (!inline(line)) {
        nextLines.push(line);
        continue;
      }

      const blob = dataUrlToBlob(line.src);
      if (!blob) {
        nextLines.push(line);
        continue;
      }

      const ref = newAttachmentRef();
      try {
        await putAttachment({ ref, blob, mime: blob.type, name: line.name, size: blob.size });
      } catch (error) {
        // Не получилось — оставляем как было. Заметка останется тяжёлой,
        // но вложение не пропадёт
        console.error('Attachment migration error:', error);
        nextLines.push(line);
        continue;
      }

      const { src, ...rest } = line;
      nextLines.push({ ...rest, ref, size: line.size ?? blob.size, mime: line.mime || blob.type });
      changed = true;
    }

    result.push({ ...note, lines: nextLines });
  }

  return { notes: changed ? result : notes, changed };
};

// Отдать вложение наружу. В браузере — обычная ссылка с download, а в
// нативной оболочке скачивания нет вовсе: WKWebView не умеет ни <a download>,
// ни blob-ссылку (тот же случай, что и с .ics в utils/ics.js). Там файл
// кладётся во временную папку приложения и отдаётся системному «Поделиться».
// Принимает строку заметки целиком: байты может понадобиться достать из
// хранилища, а у старых вложений они лежат прямо в src
export const downloadAttachment = async (line) => {
  const filename = line?.name || 'file';
  const legacy = typeof line?.src === 'string' ? line.src : null;

  const blob = legacy ? dataUrlToBlob(legacy) : await getAttachmentBlob(line?.ref);
  if (!blob) return;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      // Filesystem.writeFile ждёт base64 — ровно то, во что кодирует
      // readAsDataURL, поэтому и здесь через него
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64 = String(dataUrl).slice(String(dataUrl).indexOf(',') + 1);
      await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title: filename, url: uri });
    } catch (error) {
      // Отмена «Поделиться» тоже приходит ошибкой — это не сбой
      if (!/cancel/i.test(error?.message || '')) console.error('Attachment share error:', error);
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
