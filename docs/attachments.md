# Вложения: где лежат байты

Картинки и файлы заметок больше не хранятся внутри самой заметки.

Раньше вложение лежало base64-строкой в `note.lines[].src`, а все заметки —
одной JSON-строкой в `localStorage`. Квота там около пяти мегабайт **на всё
приложение разом**, а base64 раздувает файл на треть: одного вложения хватало,
чтобы переполнить её целиком. После этого переставало сохраняться вообще всё,
включая задачи из соседнего ключа, — молча, потому что состояние в памяти
менялось как ни в чём не бывало.

Теперь в строке заметки остаётся только ссылка:

```js
{ id, type: 'image' | 'file', text: '', ref, name, size, mime }
```

а байты живут в двух местах (`src/utils/attachmentStore.js`):

- **IndexedDB** на устройстве — квота на порядки больше, и `Blob` хранится как
  есть, без перекодирования. Появляется сразу, работает без сети;
- **Storage-бакет Supabase** — чтобы вложение доезжало до других устройств.
  Отправка идёт следом за сохранением и переживает неудачу: у записи есть флаг
  `uploaded`, и недоотправленное досылается при следующем запуске.

Чтение (`getAttachmentBlob`) идёт сначала в IndexedDB, потом в бакет, и то, что
приехало из облака, тут же оседает локально.

Вложения, добавленные до переезда, переносятся один раз при запуске —
`migrateNoteAttachments` в `src/utils/fileAttachment.js`.

## Что нужно создать в Supabase

Без бакета приложение работает, но вложения остаются только на том устройстве,
где их добавили (ошибки выгрузки уходят в консоль). Выполнить один раз в SQL
Editor проекта:

```sql
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'attachments');

create policy "attachments insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'attachments');

-- upsert при повторной отправке идёт как update
create policy "attachments update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'attachments');

create policy "attachments delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'attachments');
```

Бакет закрытый: файлы читаются через `download()` под политикой, а не по
публичной ссылке. Имя объекта — это `ref` вида `att_<время><счётчик>_<случайное>`,
угадать чужой путь нельзя.

## Уборка

`collectAttachmentGarbage` при запуске удаляет байты, на которые не ссылается ни
одна заметка, — и локально, и в бакете. Она ждёт ответа облака: пока удалённое
состояние не приехало, список заметок неполон, и уборка по нему стёрла бы
вложения, добавленные с другого устройства.

## Чего это пока не касается

Картинки **задач** (`task.images`, см. `TaskEditor.jsx`) по-прежнему лежат
data URL'ами в общем JSON и переполняют хранилище точно так же. Переезд им нужен
тот же самый.
