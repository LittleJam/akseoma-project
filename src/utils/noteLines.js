// Заметка хранится строками: [{ id, type, text, checked }]. Тип у каждой свой,
// поэтому текст и пункты списка идут в любом порядке и вперемешку.
//
// Раньше полей было два — content со всем текстом и items со всеми пунктами, —
// и заметка могла быть либо тем, либо другим: дописать абзац между пунктами было
// негде. Переключение режима перегоняло одно в другое целиком.
export const LINE_TEXT = 'text';
export const LINE_TODO = 'todo';
export const LINE_BULLET = 'bullet';
// Картинка — такая же строка заметки, как текст или пункт. Раньше вложения
// лежали отдельным полем images и показывались сеткой внизу: вставить снимок
// между двумя абзацами было некуда, он всё равно уезжал в конец
export const LINE_IMAGE = 'image';

export const isListLine = line => line.type === LINE_TODO || line.type === LINE_BULLET;
export const isImageLine = line => line.type === LINE_IMAGE;
// Строки, в которых стоит курсор и которые можно печатать
export const isTextual = line => !isImageLine(line);

// Счётчик добавлен к времени: строки нередко появляются пачкой в один
// миллисекундный тик (перенос списка, разбиение абзаца), и Date.now() сам по
// себе выдал бы им одинаковые id
let seq = 0;
export const newLineId = () => `${Date.now().toString(36)}-${(seq += 1).toString(36)}`;

export const emptyLine = (type = LINE_TEXT) => ({ id: newLineId(), type, text: '' });

// Строки старой заметки. Данные не переписываем при загрузке: заметки лежат в
// облаке и в бэкапах, и разовая миграция всех сразу — лишний риск. Вместо этого
// разбираем на лету, а новая форма сохраняется при первой же правке.
export const getNoteLines = (note) => {
  if (Array.isArray(note?.lines)) return note.lines;

  const marker = (note?.mode || 'bullet') === LINE_TODO ? LINE_TODO : LINE_BULLET;

  const textLines = (note?.content || '')
    .split('\n')
    .map((text, index) => ({ id: `legacy-text-${index}`, type: LINE_TEXT, text }));

  // Хвостовые пустые строки старого текста не переносим: в поле их не было видно,
  // а строками они станут заметными
  while (textLines.length && !textLines[textLines.length - 1].text.trim()) textLines.pop();

  const itemLines = (note?.items || []).map(item => ({
    id: `legacy-item-${item.id}`,
    type: marker,
    text: item.text || '',
    checked: !!item.checked
  }));

  // Старые вложения встают в конец: где именно они были задуманы, из прежней
  // формы не восстановить — там у них не было места в тексте
  const imageLines = (note?.images || []).map((src, index) => ({
    id: `legacy-image-${index}`,
    type: LINE_IMAGE,
    text: '',
    src
  }));

  const lines = [...textLines, ...itemLines, ...imageLines];
  return lines.length ? lines : [emptyLine()];
};

// Текст заметки одной строкой — для превью и поиска глазами по карточке
export const linesToText = lines => lines.map(l => l.text).join('\n');
