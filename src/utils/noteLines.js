// Заметка хранится строками: [{ id, type, text, checked }]. Тип у каждой свой,
// поэтому текст и пункты списка идут в любом порядке и вперемешку.
//
// Раньше полей было два — content со всем текстом и items со всеми пунктами, —
// и заметка могла быть либо тем, либо другим: дописать абзац между пунктами было
// негде. Переключение режима перегоняло одно в другое целиком.
export const LINE_TEXT = 'text';
export const LINE_TODO = 'todo';
export const LINE_BULLET = 'bullet';

export const isListLine = line => line.type === LINE_TODO || line.type === LINE_BULLET;

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

  const lines = [...textLines, ...itemLines];
  return lines.length ? lines : [emptyLine()];
};

// Текст заметки одной строкой — для превью и поиска глазами по карточке
export const linesToText = lines => lines.map(l => l.text).join('\n');
