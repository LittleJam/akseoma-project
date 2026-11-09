import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { X, ArrowLeft, ChevronRight, Eye, EyeOff, Palette, List, ListChecks, Image as ImageIcon, Paperclip, File as FileIcon, Trash2, Hourglass, Users as UsersIcon, MoreVertical, Check, Share2 } from 'lucide-react';
import { NOTE_COLORS } from '../constants';
import { themeIcon } from '../themes';
import { getNoteLines, isListLine, isImageLine, isFileLine, isTextual, emptyLine, newLineId, LINE_TEXT } from '../utils/noteLines';
import { buildAttachmentLines, formatFileSize, downloadAttachment, openableKind } from '../utils/fileAttachment';
import { scrollCaretIntoView } from '../utils/caretScroll';
import Modal from './Modal';
import PdfViewer from './PdfViewer';
import AttachmentImage from './AttachmentImage';
import { useAttachmentBytes } from '../utils/useAttachment';
import TextViewer from './TextViewer';
import useIsMobile from '../utils/useIsMobile';


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
  // Строки редактируемы по одной, и та, куда ставят курсор, может быть ещё
  // обычным текстом — такую не сфокусировать вовсе. Включаем правку здесь же;
  // React узнает об этом из onFocus
  if (!el.isContentEditable) el.contentEditable = 'true';
  // preventScroll: иначе фокус сам подкручивает контейнер к строке — по-своему
  // и до того, как строка встала на место. Поверх этого ложилась наша
  // прокрутка, и заметка на каждом Enter проматывалась от начала к курсору.
  // Куда прокручивать, решает только scrollCaretIntoView
  el.focus({ preventScroll: true });
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

// datetime-local отдаёт и ждёт строку без часового пояса — читает её как
// местное время. note.revealAt хранится ISO (в UTC), поэтому туда и обратно
// переводим через локальные компоненты даты, а не через toISOString уже
// готовой строки — он увёл бы отображаемое время в другой пояс
const toLocalInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function NoteModal({
  note,
  updateNoteLines,
  updateNoteTitle,
  setNoteColor,
  setNoteRevealAt,
  setNoteSharedWith,
  deleteNote,
  toggleNoteBlur,
  onClose,
  darkMode,
  currentUsername,
  users = [],
  theme
}) {
  // На телефоне часть кнопок шапки лишняя: там своё, системное закрытие
  const isMobile = useIsMobile();
  // Та же иконка папки, что и на плитках заметок — своя для каждой темы
  // Папку заметке меняют в самом списке — перетаскиванием карточки на папку,
  // как иконку на iOS. В меню этого пункта больше нет
  const [openMenu, setOpenMenu] = useState(null); // 'more' | 'color' | 'capsule' | 'share' — все виды делят один попап под кнопкой «…»
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // Индекс картинки, открытой на весь экран (null — просмотрщик закрыт)
  const [viewerIndex, setViewerIndex] = useState(null);
  // Открытая на весь экран строка вложения (null — просмотрщик закрыт)
  const [openFile, setOpenFile] = useState(null);
  // Режим выделения текста. Каждая строка заметки — свой contentEditable, а
  // выделение в вебе не выходит за пределы одного такого блока: на телефоне
  // это значит, что скопировать можно ровно одну строку за раз. Поэтому здесь
  // текст показывается одним куском и только для чтения — тогда выделение
  // тянется через всю заметку, как в любом обычном тексте
  const menuRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      // Escape закрывает по одному слою за раз: просмотрщик → меню → само окно
      if (openFile) setOpenFile(null);
      else if (viewerIndex !== null) setViewerIndex(null);
      else if (openMenu) setOpenMenu(null);
      else onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openMenu, viewerIndex, openFile, onClose]);

  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  // Общий путь для всех способов прикрепить что угодно: обе кнопки меню,
  // drag & drop и вставка из буфера. Картинки сжимаются и остаются
  // картиночной строкой, остальное — файловой, как есть (buildAttachmentLines).
  // Вложение встаёт сразу после строки, в которой стоял курсор, а не в конец
  // заметки: добавляют его обычно по ходу текста, к тому месту, о котором пишут
  const attachFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const { lines: added, oversized } = await buildAttachmentLines(files);
      if (oversized.length) {
        alert(`Too large to attach (5 MB max): ${oversized.map(f => f.name).join(', ')}`);
      }
      if (added.length === 0) return;
      const current = getNoteLines(note);
      const at = current.findIndex(line => line.id === focusedLine.current);
      const insertAt = at === -1 ? current.length : at + 1;
      const next = [...current.slice(0, insertAt), ...added, ...current.slice(insertAt)];
      // Ниже вложения всегда должна остаться строка, иначе дописывать некуда
      if (!next[insertAt + added.length]) next.push(emptyLine());
      updateNoteLines(note.id, next);
    } catch (err) {
      console.error('Attachment error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Оба скрытых инпута (картинки и любые файлы) заводят один и тот же путь —
  // тип файла attachFiles определит сама
  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    attachFiles(files);
  };

  const handleFileDrop = (e) => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    attachFiles(Array.from(e.dataTransfer.files));
  };

  // Вставка из буфера: скриншот или файл, скопированный в системе —
  // работает, пока окно заметки открыто
  useEffect(() => {
    const handlePaste = (e) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length === 0) return;
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
  // Байты открытого документа. Хук наверху, а не в разметке просмотрщика:
  // openFile — состояние, и когда он пуст, хук просто ничего не достаёт
  const openDoc = useAttachmentBytes(openFile);

  // Высота клавиатуры. Карточка заметки под неё не ужимается — клавиатура
  // ложится поверх, — поэтому низ текста оказывается под ней. Добавляем
  // прокрутке ровно столько запаса снизу, чтобы последняя строка могла
  // подняться над клавиатурой
  const [keyboardInset, setKeyboardInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setKeyboardInset(previous => (Math.abs(previous - inset) > 1 ? inset : previous));
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  // Перенос картинок местами на телефоне: тот же приём, что и у карточек
  // заметок в списке (Notes.jsx) — короткое касание открывает просмотрщик,
  // а удержание без движения означает «беру картинку». На мыши не нужен:
  // там достаточно клика, а порядок картинок трогают редко
  const IMG_HOLD_MS = 260;
  const IMG_HOLD_SLOP = 8;
  const [imgDrag, setImgDrag] = useState(null); // { id, dx, dy, overId }
  const imgHoldRef = useRef(null);
  // Отпускание пальца после переноса не должно ещё и открыть просмотрщик —
  // тот же клик приходит следом за pointerup
  const imgDraggedRef = useRef(false);

  const cancelImgHold = () => {
    if (imgHoldRef.current?.timer) clearTimeout(imgHoldRef.current.timer);
    imgHoldRef.current = null;
    setImgDrag(null);
  };

  const handleImgPointerDown = (e, id) => {
    imgDraggedRef.current = false;
    if (!isMobile || e.pointerType === 'mouse') return;
    const { clientX, clientY, pointerId, currentTarget } = e;
    imgHoldRef.current = {
      id,
      startX: clientX,
      startY: clientY,
      armed: false,
      timer: setTimeout(() => {
        if (!imgHoldRef.current) return;
        imgHoldRef.current.armed = true;
        imgDraggedRef.current = true;
        try { currentTarget.setPointerCapture(pointerId); } catch { /* уже отпущен */ }
        navigator.vibrate?.(10);
        setImgDrag({ id, dx: 0, dy: 0, overId: id });
      }, IMG_HOLD_MS)
    };
  };

  const handleImgPointerMove = (e) => {
    const hold = imgHoldRef.current;
    if (!hold) return;
    const dx = e.clientX - hold.startX;
    const dy = e.clientY - hold.startY;

    if (!hold.armed) {
      if (Math.abs(dx) > IMG_HOLD_SLOP || Math.abs(dy) > IMG_HOLD_SLOP) cancelImgHold();
      return;
    }

    // Картинка на это время сквозная (pointer-events: none в style ниже),
    // поэтому под пальцем отвечает та, что лежит под ней
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const imgEl = target?.closest('[data-image-id]');
    const overId = imgEl ? imgEl.dataset.imageId : hold.id;
    setImgDrag({ id: hold.id, dx, dy, overId });
  };

  const handleImgPointerUp = () => {
    const hold = imgHoldRef.current;
    const drag = imgDrag;
    cancelImgHold();
    if (!hold?.armed || !drag || drag.overId === drag.id) return;

    const fromIndex = lines.findIndex(l => l.id === drag.id);
    const toIndex = lines.findIndex(l => l.id === drag.overId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...lines];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    commit(next);
  };

  // Пока картинку несут, страница под пальцем стоять должна
  useEffect(() => {
    if (!imgDrag) return;
    const stopScroll = e => e.preventDefault();
    document.addEventListener('touchmove', stopScroll, { passive: false });
    return () => document.removeEventListener('touchmove', stopScroll);
  }, [Boolean(imgDrag)]);

  const mutedText = darkMode ? 'text-gray-500' : 'text-gray-400';
  const iconHover = darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600';
  const menuSurface = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200';

  // Строки редактируются в contentEditable, а не в input: только так выделение
  // тянется через несколько строк сразу, а без этого «сделать выделенное списком»
  // работало бы ровно на одну строку
  const lineRefs = useRef({});
  // Правку включает именно тап — короткое касание без ведения, — а не любое
  // прикосновение к строке. Долгое нажатие и протяжка остаются системному
  // выделению: пока строка не редактируется, она обычный текст, и выделение
  // тянется через всю заметку. Включи мы contentEditable на pointerdown, как
  // было раньше, WebKit запер бы выделение в границах одной строки — ради
  // этого и заводился отдельный режим «Select / copy text», который теперь
  // не нужен
  const TAP_MS = 400;
  const TAP_SLOP = 8;
  const lineTap = useRef(null);

  // Курсор ставим в точку касания, а не в начало строки, и фокус просим прямо
  // в обработчике жеста: для WebKit это такой же «настоящий» жест, как тап по
  // обычному полю, и клавиатура поднимается сама
  const startLineEdit = (el, x, y) => {
    el.contentEditable = 'true';
    el.focus();
    const range = document.caretRangeFromPoint?.(x, y);
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };
  // Куда поставить курсор после того, как строки перестроились: {id, offset}
  const pendingCaret = useRef(null);
  // Строка, в которой последний раз стоял курсор — точка вставки картинки
  const focusedLine = useRef(null);
  // Строка, которую сейчас правят. Редактируемой делается ровно одна: пока
  // строка обычный текст, выделение тянется через всю заметку, как в любом
  // тексте. Если бы contentEditable стоял на всех сразу, выделение упиралось
  // бы в границу своей строки — браузер не выпускает его за пределы одного
  // редактируемого блока, и скопировать две строки разом было нельзя
  const [editingLine, setEditingLine] = useState(null);
  // Фокус, который поставили мы сами после перестановки строк. Прокрутку там
  // уже попросили, и просить её ещё раз из onFocus значит дёрнуть заметку дважды
  const programmaticFocus = useRef(false);
  // Единственная прокрутка внутри заметки: к ней подводим курсор из-под
  // клавиатуры (см. utils/caretScroll.js)
  const scrollerRef = useRef(null);

  const setLineEl = (id) => (el) => {
    if (el) lineRefs.current[id] = el;
    else delete lineRefs.current[id];
  };

  // Текст в contentEditable кладём мимо React: перерисовка на каждое нажатие
  // сбрасывала бы курсор в начало. Поэтому только выравниваем расхождения и
  // никогда не трогаем строку, в которой сейчас печатают
  useLayoutEffect(() => {
    const pending = pendingCaret.current;

    lines.filter(isTextual).forEach(line => {
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
      if (el) {
        programmaticFocus.current = true;
        placeCaret(el, pending.offset);
        programmaticFocus.current = false;
        // Новая строка по Enter появляется ниже предыдущей и на последней
        // строке заметки уходит под клавиатуру — подтягиваем её к себе.
        // Только после placeCaret: до него выделение указывает на старую строку
        scrollCaretIntoView(scrollerRef.current);
      }
    }
  });

  // Клавиатура появилась — карточка окна ужалась (см. Modal.jsx), и курсор мог
  // оказаться ниже её нового нижнего края. Кадр отступа: высоту на этом же
  // событии ставит Modal, и карточке нужно время на раскладку
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let rafId = null;
    const onResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        scrollCaretIntoView(scrollerRef.current);
      });
    };
    vv.addEventListener('resize', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const commit = (next) => updateNoteLines(note.id, next);

  // Текст заметки одним куском: только текстовые строки, вложения пропускаем.
  // Маркеры списков не подставляем — копируют текст, а не его оформление

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

  // Маркер выделенных строк: «Bulleted list» и «Checklist» — два независимых
  // переключателя. Повторный выбор того же вида возвращает обычный текст, а
  // выбор другого просто меняет маркер, поэтому отдельного «убрать список» нет
  const setSelectionType = (type) => {
    const ids = selectedLineIds();
    if (ids.length === 0) return;
    const touched = lines.filter(line => ids.includes(line.id));
    // Вид назначаем всем выделенным сразу: смешанное выделение иначе
    // расползлось бы на разные состояния. Выключаем, только если уже все такие
    const next = touched.every(line => line.type === type) ? LINE_TEXT : type;
    commit(lines.map(line => (
      ids.includes(line.id)
        ? { ...line, type: next, checked: next === 'todo' ? !!line.checked : undefined }
        : line
    )));
  };

  // Что сейчас в выделении, для галочки в меню: вид, если он у всех строк один
  const selectionType = (() => {
    if (openMenu !== 'more') return null;
    const ids = selectedLineIds();
    const types = new Set(lines.filter(line => ids.includes(line.id)).map(line => line.type));
    return types.size === 1 ? [...types][0] : null;
  })();

  const handleLineInput = (id) => (e) => {
    const text = e.currentTarget.textContent;
    // Правим не через commit: перерисовывать строку, в которой печатают, нельзя,
    // а остальным её новый текст всё равно нужен только при сохранении
    commit(lines.map(line => (line.id === id ? { ...line, text } : line)));
    // Перенос по словам опускает курсор на новую видимую строку, и никакого
    // keydown под это нет — следим за ним прямо на вводе. Когда курсор и так
    // виден, проверка ничего не делает
    scrollCaretIntoView(scrollerRef.current);
  };

  // Клик по пустому месту заметки — как в любом текстовом редакторе: курсор
  // встаёт в конец написанного, клавиатура поднимается. Ниже последней строки
  // лежит пустое место контейнера, и раньше оно не делало ничего: чтобы начать
  // писать, приходилось целиться в саму строку, а у короткой заметки это
  // полоска в одну строку высотой у верхнего края экрана
  const focusNoteTail = () => {
    if (note.blurred) return;

    const last = lines[lines.length - 1];
    if (last && isTextual(last)) {
      programmaticFocus.current = true;
      const el = lineRefs.current[last.id];
      if (!el) return;
      placeCaret(el, last.text.length);
      programmaticFocus.current = false;
      scrollCaretIntoView(scrollerRef.current);
      return;
    }

    // Последняя строка — картинка или вложение, писать в неё нечего:
    // заводим новую, курсор в неё поставит тот же эффект, что и после Enter
    const created = emptyLine();
    pendingCaret.current = { id: created.id, offset: 0 };
    commit([...lines, created]);
  };

  // Тап по пустому месту, а не протяжка: вести пальцем здесь — это прокрутка
  // заметки, и ставить курсор по её окончании незачем
  const tailTap = useRef(null);

  // Долгое нажатие — это выделение текста. Пока строка остаётся редактируемой,
  // WebKit не выпускает выделение за её границы: тянется оно только внутри
  // одной строки, и «выделить с нескольких строк» не получалось как раз после
  // того, как в заметку поставили курсор. Поэтому, едва нажатие затянулось,
  // правку снимаем — раньше, чем система начнёт свой жест выделения (её порог
  // около полусекунды). Строки снова обычный текст, и выделение идёт насквозь
  const SELECT_RELEASE_MS = 250;
  const releaseTimer = useRef(null);

  const stopReleaseTimer = () => {
    clearTimeout(releaseTimer.current);
    releaseTimer.current = null;
  };

  const releaseEditingForSelection = () => {
    const el = document.activeElement;
    if (!el || !el.isContentEditable) return;
    el.contentEditable = 'false';
    el.blur();
  };

  const handleTailPointerDown = (e) => {
    tailTap.current = { x: e.clientX, y: e.clientY, at: Date.now(), target: e.target };
    stopReleaseTimer();
    releaseTimer.current = setTimeout(releaseEditingForSelection, SELECT_RELEASE_MS);
  };

  // Повели пальцем — это прокрутка, а не удержание: правку оставляем на месте
  const handleTailPointerMove = (e) => {
    const tap = tailTap.current;
    if (!tap || !releaseTimer.current) return;
    if (Math.abs(e.clientX - tap.x) > TAP_SLOP || Math.abs(e.clientY - tap.y) > TAP_SLOP) stopReleaseTimer();
  };

  const handleTailPointerUp = (e) => {
    stopReleaseTimer();
    const tap = tailTap.current;
    tailTap.current = null;
    if (!tap || tap.target !== e.target) return;
    if (Date.now() - tap.at > TAP_MS) return;
    if (Math.abs(e.clientX - tap.x) > TAP_SLOP || Math.abs(e.clientY - tap.y) > TAP_SLOP) return;
    // Попали в строку, кнопку, картинку — у них свои обработчики
    if (e.target.closest('[data-note-line], button, a, img, input, textarea, [role="button"]')) return;
    focusNoteTail();
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

  // Соседние картинки идут одной группой — рядом, в несколько в ряд, а не
  // друг под другом по одной. Остальные строки (текст, пункты, файлы)
  // по-прежнему каждая на своей строке, поэтому группировка — только вокруг
  // подряд идущих картинок, всё, что между ними, разбивает группу
  const renderGroups = [];
  for (let i = 0; i < lines.length;) {
    if (isImageLine(lines[i])) {
      const group = [];
      while (i < lines.length && isImageLine(lines[i])) {
        group.push(lines[i]);
        i += 1;
      }
      renderGroups.push({ type: 'images', lines: group });
    } else {
      renderGroups.push({ type: 'line', line: lines[i], index: i });
      i += 1;
    }
  }

  // Всё, что не картинка: маркер списка слева и сама строка — текстовая,
  // с чекбоксом или файловая. Картинки сюда не попадают, у них своя,
  // групповая раскладка выше
  const renderLine = (line, index) => (
    <>
      {line.type === 'todo' && (
        <input
          type="checkbox"
          checked={!!line.checked}
          onChange={() => replaceLine(line.id, { checked: !line.checked })}
          /* Текст рядом — leading-relaxed с py-0.5, первая строка визуально
             начинается на ~5px ниже верха строки: чекбокс подгоняем под неё,
             а не под верх строки целиком */
          className={`w-4 h-4 mt-[5px] cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
            line.checked ? 'animate-check-pop' : ''
          }`}
        />
      )}
      {line.type === 'bullet' && (
        <span className={`w-1 h-1 mt-[9px] rounded-full flex-shrink-0 mx-[6px] ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`} />
      )}

      {isFileLine(line) ? (
        <div className={`flex items-center gap-2 w-full my-1 px-3 py-2 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'}`}>
          <FileIcon size={18} className={`flex-shrink-0 ${mutedText}`} />
          {/* PDF открывается прямо в заметке, всё остальное уходит наружу:
              показать произвольный файл приложение всё равно не умеет.
              Не <a download> — в нативной оболочке он не работает вовсе
              (см. utils/fileAttachment.js), поэтому и в браузере тот же путь */}
          <button
            type="button"
            onClick={() => (openableKind(line) ? setOpenFile(line) : downloadAttachment(line))}
            title={line.name}
            className={`flex-1 min-w-0 text-sm text-left truncate hover:underline ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}
          >
            {line.name || 'File'}
          </button>
          <span className={`text-xs flex-shrink-0 ${mutedText}`}>{formatFileSize(line.size)}</span>
          <button
            onClick={() => commit(lines.filter(l => l.id !== line.id))}
            title="Remove file"
            aria-label="Remove file"
            className={`p-1 rounded-full flex-shrink-0 press-icon ${mutedText} ${iconHover}`}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div
          ref={setLineEl(line.id)}
          data-note-line=""
          contentEditable={!note.blurred && editingLine === line.id}
          suppressContentEditableWarning
          /* Правку включает тап по отпусканию, а не касание по нажатию:
             долгое нажатие и протяжка — это выделение текста, и строка
             обязана остаться на это время обычным текстом. Состояние
             догоняет в onFocus */
          onPointerDown={e => {
            lineTap.current = { x: e.clientX, y: e.clientY, at: Date.now(), id: line.id };
          }}
          onPointerUp={e => {
            const tap = lineTap.current;
            lineTap.current = null;
            if (note.blurred || !tap || tap.id !== line.id) return;
            if (e.currentTarget.isContentEditable) return;
            // Держали или вели пальцем — это выделение или прокрутка, не правка
            if (Date.now() - tap.at > TAP_MS) return;
            if (Math.abs(e.clientX - tap.x) > TAP_SLOP || Math.abs(e.clientY - tap.y) > TAP_SLOP) return;
            startLineEdit(e.currentTarget, e.clientX, e.clientY);
          }}
          onPointerCancel={() => { lineTap.current = null; }}
          onBlur={e => {
            e.currentTarget.contentEditable = 'false';
            setEditingLine(previous => (previous === line.id ? null : previous));
          }}
          onFocus={() => {
            setEditingLine(line.id);
            focusedLine.current = line.id;
            if (programmaticFocus.current) return;
            // Тап по другой строке при уже поднятой клавиатуре: resize у
            // visualViewport не придёт, подводить курсор некому. Кадр отступа —
            // на случай, если выделение встало ещё не окончательно
            requestAnimationFrame(() => scrollCaretIntoView(scrollerRef.current));
          }}
          onInput={handleLineInput(line.id)}
          onKeyDown={handleLineKeyDown(index)}
          data-placeholder={lines.length === 1 && !line.text ? 'Write a note...' : ''}
          /* text-base на телефоне, а не text-sm: ровно 16px, которые строке
             всё равно ставит правило против автозума (см. index.css), как
             только она становится редактируемой. Пока кегль был 14px, текст
             подрастал в момент тапа и съёживался обратно на уходе курсора —
             заметка дёргалась на каждое начало и окончание набора */
          className={`flex-1 min-w-0 text-base sm:text-sm leading-relaxed py-0.5 whitespace-pre-wrap break-words plain-field focus:outline-none empty:before:content-[attr(data-placeholder)] ${
            line.checked
              ? darkMode ? 'text-gray-500 line-through' : 'text-gray-400 line-through'
              : darkMode ? 'text-gray-200' : 'text-gray-700'
          } ${darkMode ? 'before:text-gray-500' : 'before:text-gray-400'}`}
        />
      )}
    </>
  );

  // Без min-h: flex-1 и так растягивает тело на всю высоту прокручиваемого
  // контейнера, а высота в vh считалась бы от раскладочной области — она от
  // клавиатуры не уменьшается, и у короткой заметки снизу появилась бы пустота
  // в пол-экрана, за которую уезжала бы единственная строка
  const body = (
    <div className="flex-1 flex flex-col">
      {/* select-text явно: строки здесь обычный текст, и выделение должно
          тянуться через них насквозь — ради этого правка и включается по
          одной строке за раз */}
      <div className="flex-1 space-y-0.5 select-text">
        {renderGroups.map(group => group.type === 'images' ? (
          <div key={`images-${group.lines[0].id}`} className="flex flex-wrap gap-2 my-1">
            {group.lines.map(line => {
              const isCarried = imgDrag?.id === line.id;
              const isDropTarget = imgDrag && imgDrag.id !== line.id && imgDrag.overId === line.id;
              return (
                <div
                  key={line.id}
                  data-image-id={line.id}
                  onPointerDown={e => handleImgPointerDown(e, line.id)}
                  onPointerMove={handleImgPointerMove}
                  onPointerUp={handleImgPointerUp}
                  onPointerCancel={cancelImgHold}
                  /* Пока картинку несут, она едет за пальцем и не мешает искать,
                     над какой оказалась: pointer-events снимаем, события всё
                     равно приходят через захват указателя (setPointerCapture) */
                  style={isCarried ? {
                    transform: `translate(${imgDrag.dx}px, ${imgDrag.dy}px) scale(1.05)`,
                    pointerEvents: 'none',
                    zIndex: 20,
                    position: 'relative'
                  } : undefined}
                  className={`relative group/img rounded-lg transition duration-150 ${
                    isCarried ? 'shadow-xl' : isDropTarget ? 'ring-2 ring-green-600 scale-[1.02]' : ''
                  }`}
                >
                  <AttachmentImage
                    line={line}
                    onClick={() => {
                      // Тем же касанием картинку могли нести — тогда это не клик
                      if (imgDraggedRef.current) return;
                      setViewerIndex(imageLines.findIndex(l => l.id === line.id));
                    }}
                    /* Один фиксированный размер у всех картинок, невзирая на
                       ориентацию — так несколько ложатся рядом ровным рядом.
                       object-cover, а не contain: с contain разные пропорции
                       вписывались каждая в своё пустое поле и визуально
                       выглядели разного размера — ровно то, чего быть не
                       должно. Обрезка по краям — цена за то, чтобы все
                       квадраты были заполнены и правда выглядели одинаково.
                       Смотреть на картинку без обрезки по-прежнему можно
                       через просмотрщик на весь экран — тапом по ней */
                    className="block w-[130px] h-[130px] rounded-lg cursor-zoom-in transition duration-150 hover:brightness-95 object-cover"
                    fallbackClassName="block w-[130px] h-[130px] rounded-lg bg-black/5 animate-pulse"
                  />
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (imgDraggedRef.current) return;
                      commit(lines.filter(l => l.id !== line.id));
                    }}
                    title="Remove image"
                    aria-label="Remove image"
                    /* На телефоне наведения нет — крестик виден сразу */
                    className="absolute top-1 left-1 p-1.5 rounded-full bg-black/55 text-white opacity-100 sm:opacity-0 sm:group-hover/img:opacity-100 press-icon"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div key={group.line.id} className="flex items-start gap-2.5 group/line">
            {renderLine(group.line, group.index)}
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

  // Шапка закреплена над прокручиваемой областью: заголовок и «…» доступны
  // из любого места длинной заметки
  const noteHeader = (
    <>
        <div className="flex items-center gap-1 p-4 pb-2 flex-shrink-0">
          {/* Возврат к списку. На телефоне окно занимает весь экран, и стрелка
              «назад» — то, что там ищут первым; крестика в шапке нет.
              Закрывает тем же путём, что системный жест: заметка открыта своим
              адресом, и onClose снимает его */}
          {isMobile && (
            <button
              onClick={onClose}
              title="Back to notes"
              aria-label="Back to notes"
              className={`p-2 -ml-2 mr-0.5 rounded press-icon flex-shrink-0 ${mutedText} ${iconHover}`}
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <input
            type="text"
            value={note.title || ''}
            onChange={e => updateNoteTitle(note.id, e.target.value)}
            placeholder="Title"
            className={`flex-1 min-w-0 text-base font-medium bg-transparent plain-field focus:outline-none ${
              darkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-800 placeholder-gray-300'
            }`}
          />

          {/* Оба инпута всегда в DOM, открывают их пункты меню ниже. Раздельные —
              у инпута картинок остаётся свой accept, чтобы галерея на телефоне
              не показывала документы вперемешку с фото */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Все второстепенные действия собраны в одно меню по кнопке «…»:
              рядом с заголовком остаются только заметка и закрытие. Цвет,
              капсула и шаринг открываются вложенными видами того же попапа —
              переключает их openMenu, а не отдельные рефы на каждую кнопку */}
          <div className="relative flex-shrink-0" ref={openMenu ? menuRef : null}>
            <button
              // Гасим mousedown, а не только click: иначе открытие меню уже
              // снимает выделение текста, и «Text → bullets» внутри него
              // отработает не по тому, что было выделено
              onMouseDown={e => e.preventDefault()}
              onClick={() => setOpenMenu(prev => (prev ? null : 'more'))}
              title="More options"
              aria-label="More options"
              className={`p-2 sm:p-1 rounded press-icon ${mutedText} ${iconHover}`}
            >
              <MoreVertical size={16} />
            </button>

            {openMenu === 'more' && (
              <div className={`absolute z-20 top-full mt-1 right-0 w-60 py-1 rounded-lg border shadow-lg origin-top-right animate-pop-in ${menuSurface}`}>
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { imageInputRef.current?.click(); setOpenMenu(null); }}
                  disabled={isUploading}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition disabled:opacity-40 ${darkMode ? 'text-gray-200 hover:bg-gray-600/60' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <ImageIcon size={16} className={mutedText} />
                  {isUploading ? 'Adding...' : 'Add image'}
                </button>

                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { fileInputRef.current?.click(); setOpenMenu(null); }}
                  disabled={isUploading}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition disabled:opacity-40 ${darkMode ? 'text-gray-200 hover:bg-gray-600/60' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <Paperclip size={16} className={mutedText} />
                  {isUploading ? 'Adding...' : 'Add file'}
                </button>

                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setSelectionType('bullet'); setOpenMenu(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${darkMode ? 'text-gray-200 hover:bg-gray-600/60' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <List size={16} className={mutedText} />
                  <span className="flex-1">Bulleted list</span>
                  {selectionType === 'bullet' && <Check size={14} className="text-green-600 flex-shrink-0" />}
                </button>

                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setSelectionType('todo'); setOpenMenu(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${darkMode ? 'text-gray-200 hover:bg-gray-600/60' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <ListChecks size={16} className={mutedText} />
                  <span className="flex-1">Checklist</span>
                  {selectionType === 'todo' && <Check size={14} className="text-green-600 flex-shrink-0" />}
                </button>

                <button
                  onClick={() => setOpenMenu('color')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${darkMode ? 'text-gray-200 hover:bg-gray-600/60' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <Palette size={16} className={mutedText} />
                  <span className="flex-1">Color</span>
                  <ChevronRight size={14} className={mutedText} />
                </button>

                {setNoteRevealAt && (
                  <button
                    onClick={() => setOpenMenu('capsule')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${darkMode ? 'text-gray-200 hover:bg-gray-600/60' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <Hourglass size={16} className={note.revealAt ? 'text-amber-500' : mutedText} />
                    <span className="flex-1">{note.revealAt ? 'Time capsule set' : 'Time capsule'}</span>
                    <ChevronRight size={14} className={mutedText} />
                  </button>
                )}

                {setNoteSharedWith && users.length > 1 && (!note.ownerUsername || note.ownerUsername === currentUsername) && (
                  <button
                    onClick={() => setOpenMenu('share')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${darkMode ? 'text-gray-200 hover:bg-gray-600/60' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <UsersIcon size={16} className={note.sharedWith?.length ? 'text-blue-500' : mutedText} />
                    <span className="flex-1">{note.sharedWith?.length ? `Shared with ${note.sharedWith.length}` : 'Share'}</span>
                    <ChevronRight size={14} className={mutedText} />
                  </button>
                )}

                <div className={`my-1 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`} />

                <button
                  onClick={() => { toggleNoteBlur(note.id); setOpenMenu(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${darkMode ? 'text-gray-200 hover:bg-gray-600/60' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {note.blurred ? <EyeOff size={16} className={mutedText} /> : <Eye size={16} className={mutedText} />}
                  {note.blurred ? 'Show text' : 'Blur text'}
                </button>

                <button
                  onClick={handleDelete}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${darkMode ? 'text-gray-200 hover:bg-gray-600/60 hover:text-red-400' : 'text-gray-700 hover:bg-gray-100 hover:text-red-500'}`}
                >
                  <Trash2 size={16} />
                  Delete note
                </button>
              </div>
            )}

            {openMenu === 'color' && (
              <div className={`absolute z-20 top-full mt-1 right-0 p-2 rounded-lg border shadow-lg origin-top-right animate-pop-in ${menuSurface}`}>
                <button
                  onClick={() => setOpenMenu('more')}
                  className={`flex items-center gap-1.5 px-1 pb-2 text-xs font-medium ${mutedText} ${iconHover}`}
                >
                  <ArrowLeft size={13} /> Color
                </button>
                {/* Сетка, а не строка: двенадцать кружков в ряд не помещались
                    на телефоне и уезжали за край выпадающего меню */}
                <div className="grid grid-cols-6 gap-1.5 w-max px-1">
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

            {/* Капсула времени: заметка запечатана до выбранного момента —
                видна в списке заметкой без содержимого, пока время не пришло */}
            {openMenu === 'capsule' && (
              <div className={`absolute z-20 top-full mt-1 right-0 p-3 w-64 rounded-lg border shadow-lg origin-top-right animate-pop-in ${menuSurface}`}>
                <button
                  onClick={() => setOpenMenu('more')}
                  className={`flex items-center gap-1.5 pb-2 text-xs font-medium ${mutedText} ${iconHover}`}
                >
                  <ArrowLeft size={13} /> Time capsule
                </button>
                <p className={`text-xs mb-2 ${mutedText}`}>
                  Sealed until this moment — hidden from the list until then.
                </p>
                <input
                  type="datetime-local"
                  value={toLocalInputValue(note.revealAt)}
                  min={toLocalInputValue(new Date().toISOString())}
                  onChange={e => {
                    const value = e.target.value;
                    setNoteRevealAt(note.id, value ? new Date(value).toISOString() : null);
                  }}
                  className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:border-green-500 ${
                    darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                {note.revealAt && (
                  <button
                    onClick={() => { setNoteRevealAt(note.id, null); setOpenMenu(null); }}
                    className={`mt-2 text-xs font-medium ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Remove capsule
                  </button>
                )}
              </div>
            )}

            {/* Заметки личные по умолчанию — видны только автору. Управляет
                этим сам автор; тот, с кем уже поделились, дальше не расшаривает */}
            {openMenu === 'share' && (
              <div className={`absolute z-20 top-full mt-1 right-0 p-3 w-56 rounded-lg border shadow-lg origin-top-right animate-pop-in ${menuSurface}`}>
                <button
                  onClick={() => setOpenMenu('more')}
                  className={`flex items-center gap-1.5 pb-2 text-xs font-medium ${mutedText} ${iconHover}`}
                >
                  <ArrowLeft size={13} /> Share
                </button>
                <p className={`text-xs mb-2 ${mutedText}`}>
                  Private by default — visible only to whoever it's shared with.
                </p>
                <div className="space-y-1.5">
                  {users.filter(u => u.username !== currentUsername).map(u => {
                    const shared = (note.sharedWith || []).includes(u.username);
                    return (
                      <label key={u.username} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shared}
                          onChange={() => {
                            const next = shared
                              ? (note.sharedWith || []).filter(name => name !== u.username)
                              : [...(note.sharedWith || []), u.username];
                            setNoteSharedWith(note.id, next);
                          }}
                          className="w-4 h-4 cursor-pointer flex-shrink-0 accent-green-700"
                        />
                        <span className="text-sm">{u.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Крестик закрывает окно и ничего не удаляет — за удаление отвечает
              корзина. На телефоне его нет: заметка открыта своим адресом, и
              закрывает её системный «назад», которым там и пользуются */}
          {!isMobile && (
            <button
              onClick={onClose}
              title="Close"
              aria-label="Close"
              className={`p-2 sm:p-1 rounded press-icon flex-shrink-0 ${mutedText} ${iconHover}`}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="px-4 flex-shrink-0">
          <span className={`text-[10px] ${mutedText}`}>{note.updatedAt}</span>
        </div>
    </>
  );

  return (
    <Modal
      onClose={onClose}
      size="md"
      sheet
      // Курсор в заметке стоит в contentEditable-строке у самого низа длинного
      // текста — карточка обязана ужиматься под клавиатуру, иначе его не видно
      fitsKeyboard
      closeOnEsc={false}
      /* Открытая заметка — отдельный адрес, запись в истории у неё уже есть */
      backCloses={false}
      overlayProps={{
        // Перетаскивание файла куда угодно поверх открытой заметки — это
        // добавление вложения, иначе браузер просто откроет файл вместо окна
        onDragOver: e => {
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setIsDragOver(true);
        },
        onDragLeave: e => {
          if (e.currentTarget.contains(e.relatedTarget)) return;
          setIsDragOver(false);
        },
        onDrop: handleFileDrop
      }}
      /* h-[100dvh] на телефоне: заметка занимает экран целиком и всегда одного
         размера. Без него окно росло под содержимое — короткая заметка была
         одной высоты, длинная другой, и прокручивалось всё окно вместе с
         шапкой. Теперь прокручивается только текст внутри.
         h-full, а не 100dvh: окно ровно по подложке, и она сама не прокручивается
         — иначе шапка уезжала бы вместе с ней. Когда поднимается клавиатура,
         высоту перебивает fitsKeyboard (см. Modal.jsx) */
      /* Основа окна плотная, а цвет заметки ложится на неё отдельным слоем
         ниже: сами цвета полупрозрачны — они задуманы для карточек на сетке, —
         и окном сквозь них просвечивал бы список под ним */
      panelClassName={`h-full sm:h-auto overflow-hidden rounded-none sm:rounded-xl border-0 sm:border shadow-xl ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      } ${isDragOver ? 'ring-2 ring-green-600' : ''}`}
    >
        {/* Цвет заметки. Слой лежит под содержимым (-z-10) и поверх плотной
            основы, поэтому цвет виден, а просвечивать нечему */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 pointer-events-none ${darkMode ? palette.dark : palette.light}`}
        />
        {/* Подсказка появляется только когда над окном тащат файл */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 rounded-xl bg-black/40 flex items-center justify-center pointer-events-none animate-fade-in">
            <span className="text-sm font-medium text-white">Drop files here</span>
          </div>
        )}
        {noteHeader}

        {/* Прокрутка одна на текст и вложения: шапка с кнопками остаётся на
            месте, а разъезжается только содержимое */}
        <div
          ref={scrollerRef}
          style={{ paddingBottom: keyboardInset }}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col"
        >
        {/* Обработчики на всей площади тела, а не только на списке строк:
            в пустое место под текстом входят и отступы этой обёртки */}
        <div
          className="flex-1 flex flex-col p-4 pt-2"
          onPointerDown={handleTailPointerDown}
          onPointerMove={handleTailPointerMove}
          onPointerUp={handleTailPointerUp}
          onPointerCancel={stopReleaseTimer}
        >
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
          <p className={`px-4 pb-4 text-xs animate-pulse ${mutedText}`}>Adding attachment…</p>
        )}
        </div>

      {/* Вложение открывается отдельным экраном поверх заметки: своя шапка
          с именем файла, назад и «поделиться», а под ней сам документ —
          PDF постранично (PdfViewer), текст и .docx как текст (TextViewer).
          Что именно умеем показать, решает openableKind. Не карточкой
          поверх заметки: документ читают, а для чтения нужен весь экран.
          Клик мимо не закрывает — мимо тут некуда, экран занят целиком */}
      {openFile && (
        <Modal
          onClose={() => setOpenFile(null)}
          layer="viewer"
          size="full"
          sheet
          closeOnEsc={false}
          closeOnBackdrop={false}
          panelClassName={`h-full sm:h-[85vh] overflow-hidden rounded-none sm:rounded-xl border-0 sm:border shadow-xl ${
            darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className={`flex items-center gap-1 p-2 flex-shrink-0 border-b ${
            darkMode ? 'border-gray-800' : 'border-gray-200'
          }`}>
            {/* Стрелка, а не крестик: это ещё один экран поверх заметки,
                и уходят с него назад — тем же жестом и той же кнопкой */}
            <button
              onClick={() => setOpenFile(null)}
              title="Back"
              aria-label="Close file"
              className={`p-2 rounded-full press-icon ${mutedText} ${iconHover}`}
            >
              <ArrowLeft size={20} />
            </button>
            <span className={`flex-1 min-w-0 truncate text-sm font-medium ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              {openFile.name || 'File'}
            </span>
            {/* Просмотрщик только показывает — отдать файл наружу по-прежнему можно */}
            <button
              onClick={() => downloadAttachment(openFile)}
              title="Share"
              aria-label="Share file"
              className={`p-2 rounded-full press-icon ${mutedText} ${iconHover}`}
            >
              <Share2 size={18} />
            </button>
          </div>
          {openDoc.status === 'missing' ? (
            <p className={`p-4 text-sm ${mutedText}`}>
              This attachment has not reached this device yet. Open the note again once it syncs.
            </p>
          ) : openableKind(openFile) === 'pdf' ? (
            <PdfViewer bytes={openDoc.bytes} darkMode={darkMode} />
          ) : (
            <TextViewer bytes={openDoc.bytes} kind={openableKind(openFile)} darkMode={darkMode} />
          )}
        </Modal>
      )}

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
          <AttachmentImage
            line={imageLines[viewerIndex]}
            alt={`Attachment ${viewerIndex + 1}`}
            className="self-center max-w-full max-h-[85vh] rounded-lg"
            fallbackClassName="self-center w-40 h-40 rounded-lg bg-white/10 animate-pulse"
          />
        </Modal>
      )}
    </Modal>
  );
}
