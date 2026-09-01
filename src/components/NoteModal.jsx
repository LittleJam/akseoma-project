import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { X, Eye, EyeOff, Palette, List, Image as ImageIcon, Trash2 } from 'lucide-react';
import { NOTE_COLORS } from '../constants';
import { getNoteLines, isListLine, isImageLine, emptyLine, newLineId, LINE_TEXT, LINE_IMAGE } from '../utils/noteLines';
import { compressImage } from '../utils/imageCompression';
import Modal from './Modal';


// Позиция курсора внутри строки в символах: у contentEditable её приходится
// считать самому — своего selectionStart, как у input, у него нет
const caretOffset = (el) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  const measured = range.cloneRange();
  measured.selectNodeContents(el);
  measured.setEnd(range.endContainer, range.endOffset);
  return measured.toString().length;
};

const placeCaret = (el, offset) => {
  el.focus();
  const range = document.createRange();
  const textNode = el.firstChild;
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    range.setStart(textNode, Math.min(offset, textNode.textContent.length));
  } else {
    range.setStart(el, 0);
  }
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

export default function NoteModal({
  note,
  updateNoteLines,
  updateNoteTitle,
  setNoteColor,
  deleteNote,
  toggleNoteBlur,
  onClose,
  darkMode
}) {
  const [openMenu, setOpenMenu] = useState(null); // сейчас только 'color'
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // Индекс картинки, открытой на весь экран (null — просмотрщик закрыт)
  const [viewerIndex, setViewerIndex] = useState(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      // Escape закрывает по одному слою за раз: просмотрщик → меню → само окно
      if (viewerIndex !== null) setViewerIndex(null);
      else if (openMenu) setOpenMenu(null);
      else onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openMenu, viewerIndex, onClose]);

  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  // Общий путь для всех способов добавить картинку: кнопка, drag & drop и вставка из буфера
  // Картинка встаёт сразу после строки, в которой стоял курсор, а не в конец
  // заметки: вставляют её обычно по ходу текста, к тому месту, о котором пишут
  const attachFiles = async (files) => {
    const picked = files.filter(f => f.type.startsWith('image/'));
    if (picked.length === 0) return;
    setIsUploading(true);
    try {
      const compressed = await Promise.all(picked.map(file => compressImage(file)));
      const added = compressed.map(src => ({ id: newLineId(), type: LINE_IMAGE, text: '', src }));
      const current = getNoteLines(note);
      const at = current.findIndex(line => line.id === focusedLine.current);
      const insertAt = at === -1 ? current.length : at + 1;
      const next = [...current.slice(0, insertAt), ...added, ...current.slice(insertAt)];
      // Ниже картинки всегда должна остаться строка, иначе дописывать некуда
      if (!next[insertAt + added.length]) next.push(emptyLine());
      updateNoteLines(note.id, next);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageInput = async (e) => {
    const files = Array.from(e.target.files || []);
    await attachFiles(files);
    e.target.value = '';
  };

  const handleImageDrop = (e) => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    attachFiles(Array.from(e.dataTransfer.files));
  };

  // Вставка скриншота из буфера: работает, пока окно заметки открыто
  useEffect(() => {
    const handlePaste = (e) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (!files.some(f => f.type.startsWith('image/'))) return;
      e.preventDefault();
      attachFiles(files);
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  });

  const palette = NOTE_COLORS[note.color] || NOTE_COLORS.default;
  const lines = getNoteLines(note);
  // Только картинки — по ним листает просмотрщик
  const imageLines = lines.filter(isImageLine);

  const mutedText = darkMode ? 'text-gray-500' : 'text-gray-400';
  const iconHover = darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600';
  const menuSurface = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200';

  // Строки редактируются в contentEditable, а не в input: только так выделение
  // тянется через несколько строк сразу, а без этого «сделать выделенное списком»
  // работало бы ровно на одну строку
  const lineRefs = useRef({});
  // Куда поставить курсор после того, как строки перестроились: {id, offset}
  const pendingCaret = useRef(null);
  // Строка, в которой последний раз стоял курсор — точка вставки картинки
  const focusedLine = useRef(null);

  const setLineEl = (id) => (el) => {
    if (el) lineRefs.current[id] = el;
    else delete lineRefs.current[id];
  };

  // Текст в contentEditable кладём мимо React: перерисовка на каждое нажатие
  // сбрасывала бы курсор в начало. Поэтому только выравниваем расхождения и
  // никогда не трогаем строку, в которой сейчас печатают
  useLayoutEffect(() => {
    const pending = pendingCaret.current;

    lines.filter(line => !isImageLine(line)).forEach(line => {
      const el = lineRefs.current[line.id];
      if (!el || el.textContent === line.text) return;
      // Строку, в которой печатают, не трогаем: запись textContent сбросила бы
      // курсор в начало. Но когда строки только что перестроились — поделили по
      // Enter или склеили по Backspace, — курсор всё равно ставится заново, и
      // текст обязан обновиться во всех строках, включая ту, где он стоял:
      // иначе половина разделённой строки остаётся на экране старой
      if (!pending && el === document.activeElement) return;
      el.textContent = line.text;
    });

    if (pending) {
      pendingCaret.current = null;
      const el = lineRefs.current[pending.id];
      if (el) placeCaret(el, pending.offset);
    }
  });

  const commit = (next) => updateNoteLines(note.id, next);

  const replaceLine = (id, patch) =>
    commit(lines.map(line => (line.id === id ? { ...line, ...patch } : line)));

  // Строки, которых касается выделение. Схлопнутое выделение — это одна строка,
  // в которой стоит курсор
  const selectedLineIds = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [];
    const range = selection.getRangeAt(0);
    return lines
      .filter(line => {
        const el = lineRefs.current[line.id];
        return el && range.intersectsNode(el);
      })
      .map(line => line.id);
  };

  // Виды строки по кругу: обычный текст → точка → галочка → снова текст.
  // Так один контрол заменяет и превращение в список, и выбор маркера
  const NEXT_TYPE = { text: 'bullet', bullet: 'todo', todo: LINE_TEXT };

  const cycleSelection = () => {
    const ids = selectedLineIds();
    if (ids.length === 0) return;
    const touched = lines.filter(line => ids.includes(line.id));
    // Вид берём от первой выделенной строки и назначаем всем сразу: иначе
    // смешанное выделение расползлось бы на три разных состояния
    const next = NEXT_TYPE[touched[0].type] || 'bullet';
    commit(lines.map(line => (
      ids.includes(line.id)
        ? { ...line, type: next, checked: next === 'todo' ? !!line.checked : undefined }
        : line
    )));
  };

  const handleLineInput = (id) => (e) => {
    const text = e.currentTarget.textContent;
    // Правим не через commit: перерисовывать строку, в которой печатают, нельзя,
    // а остальным её новый текст всё равно нужен только при сохранении
    commit(lines.map(line => (line.id === id ? { ...line, text } : line)));
  };

  const handleLineKeyDown = (index) => (e) => {
    const line = lines[index];
    const el = e.currentTarget;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const offset = caretOffset(el);
      const text = el.textContent;
      const created = {
        id: newLineId(),
        // Новая строка продолжает список, если делили пункт, и остаётся текстом
        // в тексте — так список набирается подряд, без лишних нажатий
        type: line.type,
        text: text.slice(offset),
        checked: false
      };
      const next = lines.map(l => (l.id === line.id ? { ...l, text: text.slice(0, offset) } : l));
      next.splice(index + 1, 0, created);
      pendingCaret.current = { id: created.id, offset: 0 };
      commit(next);
      return;
    }

    if (e.key === 'Backspace' && caretOffset(el) === 0 && window.getSelection()?.isCollapsed) {
      // Пункт в начале строки сначала разворачивается в текст: убрать маркер —
      // более частое намерение, чем склеить строку с предыдущей
      if (isListLine(line)) {
        e.preventDefault();
        replaceLine(line.id, { type: LINE_TEXT, checked: undefined });
        return;
      }
      if (index === 0) return;
      e.preventDefault();
      const previous = lines[index - 1];
      const next = lines
        .map(l => (l.id === previous.id ? { ...l, text: previous.text + el.textContent } : l))
        .filter(l => l.id !== line.id);
      pendingCaret.current = { id: previous.id, offset: previous.text.length };
      commit(next);
    }
  };

  const handleDelete = () => {
    deleteNote(note.id);
    onClose();
  };

  const body = (
    <div className="flex-1 flex flex-col min-h-[50vh]">
      <div className="flex-1 space-y-0.5">
        {lines.map((line, index) => (
          <div key={line.id} className="flex items-start gap-2.5 group/line">
            {line.type === 'todo' && (
              <input
                type="checkbox"
                checked={!!line.checked}
                onChange={() => replaceLine(line.id, { checked: !line.checked })}
                className={`w-4 h-4 mt-[3px] cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
                  line.checked ? 'animate-check-pop' : ''
                }`}
              />
            )}
            {line.type === 'bullet' && (
              <span className={`w-1 h-1 mt-[9px] rounded-full flex-shrink-0 mx-[6px] ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`} />
            )}

            {isImageLine(line) ? (
              <div className="relative group/img w-full my-1">
                <img
                  src={line.src}
                  alt=""
                  onClick={() => setViewerIndex(imageLines.findIndex(l => l.id === line.id))}
                  className="max-h-64 w-auto max-w-full rounded-lg cursor-zoom-in transition duration-150 hover:brightness-95"
                />
                <button
                  onClick={() => commit(lines.filter(l => l.id !== line.id))}
                  title="Remove image"
                  aria-label="Remove image"
                  /* На телефоне наведения нет — крестик виден сразу */
                  className="absolute top-1 left-1 p-1.5 rounded-full bg-black/55 text-white opacity-100 sm:opacity-0 sm:group-hover/img:opacity-100 press-icon"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
            <div
              ref={setLineEl(line.id)}
              contentEditable={!note.blurred}
              suppressContentEditableWarning
              onFocus={() => { focusedLine.current = line.id; }}
              onInput={handleLineInput(line.id)}
              onKeyDown={handleLineKeyDown(index)}
              data-placeholder={lines.length === 1 && !line.text ? 'Write a note...' : ''}
              className={`flex-1 min-w-0 text-sm leading-relaxed py-0.5 whitespace-pre-wrap break-words focus:outline-none empty:before:content-[attr(data-placeholder)] ${
                line.checked
                  ? darkMode ? 'text-gray-500 line-through' : 'text-gray-400 line-through'
                  : darkMode ? 'text-gray-200' : 'text-gray-700'
              } ${darkMode ? 'before:text-gray-500' : 'before:text-gray-400'}`}
            />
            )}

          </div>
        ))}
      </div>

      {/* Клик по пустому месту под строками продолжает заметку с новой строки */}
      <div
        onClick={() => {
          const last = lines[lines.length - 1];
          if (last && !last.text) {
            const el = lineRefs.current[last.id];
            if (el) placeCaret(el, 0);
            return;
          }
          const created = emptyLine(LINE_TEXT);
          pendingCaret.current = { id: created.id, offset: 0 };
          commit([...lines, created]);
        }}
        className="flex-1 min-h-[3rem] cursor-text"
      />
    </div>
  );

  return (
    <Modal
      onClose={onClose}
      size="md"
      sheet
      closeOnEsc={false}
      overlayProps={{
        // Перетаскивание файла куда угодно поверх открытой заметки — это добавление
        // картинки, иначе браузер просто откроет файл вместо окна
        onDragOver: e => {
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setIsDragOver(true);
        },
        onDragLeave: e => {
          if (e.currentTarget.contains(e.relatedTarget)) return;
          setIsDragOver(false);
        },
        onDrop: handleImageDrop
      }}
      /* h-[100dvh] на телефоне: заметка занимает экран целиком и всегда одного
         размера. Без него окно росло под содержимое — короткая заметка была
         одной высоты, длинная другой, и прокручивалось всё окно вместе с
         шапкой. Теперь прокручивается только текст внутри */
      panelClassName={`h-[100dvh] sm:h-auto overflow-hidden rounded-none sm:rounded-xl border-0 sm:border shadow-xl ${darkMode ? palette.dark : palette.light} ${isDragOver ? 'ring-2 ring-green-600' : ''}`}
    >
        {/* Подсказка появляется только когда над окном тащат файл */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 rounded-xl bg-black/40 flex items-center justify-center pointer-events-none animate-fade-in">
            <span className="text-sm font-medium text-white">Drop images here</span>
          </div>
        )}
        <div className="flex items-center gap-1 p-4 pb-2">
          <input
            type="text"
            value={note.title || ''}
            onChange={e => updateNoteTitle(note.id, e.target.value)}
            placeholder="Title"
            className={`flex-1 min-w-0 text-base font-medium bg-transparent focus:outline-none ${
              darkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-800 placeholder-gray-300'
            }`}
          />

          {/* Картинки */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageInput}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title={isUploading ? 'Processing images...' : 'Add image'}
            className={`p-2 sm:p-1 rounded press-icon flex-shrink-0 disabled:opacity-40 ${mutedText} ${iconHover}`}
          >
            <ImageIcon size={16} />
          </button>

          {/* Одна кнопка на все виды строки вместо кнопки превращения и меню
              выбора маркера рядом с ней: нажатия гоняют выделенное по кругу
              текст → точки → галочки → текст. onMouseDown гасим — без него
              нажатие уводит фокус из текста и выделение пропадает */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={cycleSelection}
            title="Text → bullets → checkboxes"
            aria-label="Change line type"
            className={`p-2 sm:p-1 rounded press-icon flex-shrink-0 ${mutedText} ${iconHover}`}
          >
            <List size={16} />
          </button>

          {/* Цвет */}
          <div className="relative flex-shrink-0" ref={openMenu === 'color' ? menuRef : null}>
            <button
              onClick={() => setOpenMenu(prev => (prev === 'color' ? null : 'color'))}
              title="Note color"
              className={`p-2 sm:p-1 rounded press-icon ${mutedText} ${iconHover}`}
            >
              <Palette size={16} />
            </button>

            {openMenu === 'color' && (
              <div className={`absolute z-20 top-full mt-1 right-0 p-2 rounded-lg border shadow-lg origin-top-right animate-pop-in ${menuSurface}`}>
                <div className="flex items-center gap-1.5">
                  {Object.entries(NOTE_COLORS).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setNoteColor(note.id, key);
                        setOpenMenu(null);
                      }}
                      title={value.label}
                      className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full flex-shrink-0 transition duration-150 hover:scale-110 active:scale-90 ${value.swatch} ${
                        (note.color || 'default') === key
                          ? `ring-2 ring-offset-2 ${darkMode ? 'ring-gray-300 ring-offset-gray-700' : 'ring-gray-500 ring-offset-white'}`
                          : 'opacity-50 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => toggleNoteBlur(note.id)}
            title={note.blurred ? 'Show text' : 'Blur text'}
            className={`p-2 sm:p-1 rounded press-icon flex-shrink-0 ${mutedText} ${iconHover}`}
          >
            {note.blurred ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <button
            onClick={handleDelete}
            title="Delete note"
            aria-label="Delete note"
            className={`p-2 sm:p-1 rounded press-icon flex-shrink-0 ${mutedText} hover:text-red-500`}
          >
            <Trash2 size={16} />
          </button>

          {/* Крестик закрывает окно и ничего не удаляет — за удаление отвечает корзина */}
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className={`p-2 sm:p-1 rounded press-icon flex-shrink-0 ${mutedText} ${iconHover}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4">
          <span className={`text-[10px] ${mutedText}`}>{note.updatedAt}</span>
        </div>

        {/* Прокрутка одна на текст и вложения: шапка с кнопками остаётся на
            месте, а разъезжается только содержимое */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="flex-1 flex flex-col p-4 pt-2">
          {note.blurred ? (
            <div onClick={() => toggleNoteBlur(note.id)} className="flex-1 flex flex-col cursor-pointer">
              <div className="flex-1 flex flex-col blur-[5px] select-none pointer-events-none">
                {body}
              </div>
            </div>
          ) : (
            body
          )}
        </div>

        {isUploading && (
          <p className={`px-4 pb-4 text-xs animate-pulse ${mutedText}`}>Adding images…</p>
        )}
        </div>

      {/* Картинка на весь экран: клик в любом месте — закрыть */}
      {viewerIndex !== null && imageLines[viewerIndex] && (
        <Modal
          onClose={() => setViewerIndex(null)}
          layer="viewer"
          size="full"
          closeOnEsc={false}
          overlayClassName="cursor-zoom-out"
        >
          {/* Крестик закрытия. Клик мимо картинки тоже закрывает, но в установленном
              приложении промахнуться некуда: картинка занимает почти весь экран,
              а клавиши Escape на телефоне нет. Отступ сверху считает вырез */}
          <button
            onClick={() => setViewerIndex(null)}
            title="Close"
            aria-label="Close image"
            className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] p-2 rounded-full bg-black/55 text-white press"
          >
            <X size={20} />
          </button>
          {/* То же, что в редакторе задачи: без self-center flex-колонка окна
              растягивала картинку во всю ширину */}
          <img
            src={imageLines[viewerIndex].src}
            alt={`Attachment ${viewerIndex + 1}`}
            className="self-center max-w-full max-h-[85vh] rounded-lg"
          />
        </Modal>
      )}
    </Modal>
  );
}
