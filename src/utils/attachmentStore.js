import { supabase, isSupabaseConfigured } from './supabaseClient';

// Хранилище байтов вложений — отдельно от всего остального состояния.
//
// Раньше картинка и файл лежали base64-строкой прямо в заметке, а заметки
// целиком — одной строкой в localStorage. Квота там около пяти мегабайт на всё
// приложение разом, а base64 раздувает файл на треть: одно вложение способно
// переполнить её целиком, и тогда переставало сохраняться вообще всё, включая
// задачи из соседнего ключа.
//
// Теперь в заметке остаётся только ссылка (ref, имя, размер, тип), а байты
// живут в двух местах: IndexedDB на устройстве — у неё квота на порядки больше
// и она умеет хранить Blob как есть, без перекодирования, — и Storage-бакет
// Supabase, чтобы вложение доезжало до других устройств. Локальная копия
// первична: она появляется сразу и работает без сети, отправка идёт следом.

const DB_NAME = 'jira-attachments';
const DB_VERSION = 1;
const STORE = 'blobs';
export const ATTACHMENT_BUCKET = 'attachments';

let counter = 0;
// Идентификатор вложения — он же ключ в IndexedDB и имя файла в бакете.
// Время плюс счётчик плюс случайный хвост: несколько файлов выбирают разом,
// в пределах одной миллисекунды, а угадывать чужой путь в бакете не должно
// быть возможно
export const newAttachmentRef = () => {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `att_${Date.now().toString(36)}${counter.toString(36)}_${random}`;
};

const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'ref' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// Одна транзакция — один вызов. Соединение не держим открытым: вкладок может
// быть несколько, а висящее соединение блокирует обновление версии базы
const withStore = async (mode, run) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        transaction.oncomplete = () => resolve();
      }
    });
  } finally {
    db.close();
  }
};

// uploaded: false — байты есть только здесь, отправку ещё ждут. Флаг живёт
// рядом с самими байтами, а не отдельным списком: так очередь не разъезжается
// с содержимым, даже если приложение закрыли в неудачный момент
export const putAttachment = async ({ ref, blob, mime, name, size }) => {
  await withStore('readwrite', store => store.put({
    ref, blob, mime, name, size, uploaded: false, savedAt: Date.now()
  }));
  return ref;
};

export const readAttachment = (ref) => withStore('readonly', store => store.get(ref));

export const deleteAttachment = (ref) => withStore('readwrite', store => store.delete(ref));

export const allAttachments = () => withStore('readonly', store => store.getAll());

const markUploaded = async (ref) => {
  const record = await readAttachment(ref);
  if (!record) return;
  await withStore('readwrite', store => store.put({ ...record, uploaded: true }));
};

const remote = () => (isSupabaseConfigured && supabase ? supabase.storage.from(ATTACHMENT_BUCKET) : null);

// Отправка отложенных. Зовётся при запуске и после каждого добавления:
// неудача здесь не беда — вложение уже на устройстве, попробуем в следующий раз
export const uploadPendingAttachments = async () => {
  const bucket = remote();
  if (!bucket) return;

  let records;
  try {
    records = await allAttachments();
  } catch (error) {
    console.error('Attachment store read error:', error);
    return;
  }

  for (const record of records.filter(item => !item.uploaded)) {
    try {
      const { error } = await bucket.upload(record.ref, record.blob, {
        contentType: record.mime || 'application/octet-stream',
        upsert: true
      });
      if (error) throw error;
      await markUploaded(record.ref);
    } catch (error) {
      console.error('Attachment upload error:', error);
      // Дальше по списку: один упрямый файл не должен держать остальные
    }
  }
};

// Байты вложения. Сначала своё устройство, потом облако — и то, что пришло
// из облака, тут же оседает локально: следующий раз откроется без сети
export const getAttachmentBlob = async (ref) => {
  if (!ref) return null;

  try {
    const record = await readAttachment(ref);
    if (record?.blob) return record.blob;
  } catch (error) {
    console.error('Attachment store read error:', error);
  }

  const bucket = remote();
  if (!bucket) return null;

  try {
    const { data, error } = await bucket.download(ref);
    if (error) throw error;
    if (!data) return null;
    await withStore('readwrite', store => store.put({
      ref, blob: data, mime: data.type, uploaded: true, savedAt: Date.now()
    })).catch(() => {});
    return data;
  } catch (error) {
    console.error('Attachment download error:', error);
    return null;
  }
};

// Уборка: байты, на которые больше никто не ссылается. Вложение удаляют
// вместе со строкой заметки, но сами байты при этом остаются лежать
export const collectAttachmentGarbage = async (usedRefs) => {
  const used = usedRefs instanceof Set ? usedRefs : new Set(usedRefs);

  let records;
  try {
    records = await allAttachments();
  } catch (error) {
    console.error('Attachment store read error:', error);
    return;
  }

  const orphans = records.filter(record => !used.has(record.ref));
  if (orphans.length === 0) return;

  const bucket = remote();
  for (const record of orphans) {
    try {
      await deleteAttachment(record.ref);
      // В облаке чистим только то, что туда доехало
      if (bucket && record.uploaded) await bucket.remove([record.ref]);
    } catch (error) {
      console.error('Attachment cleanup error:', error);
    }
  }
};
