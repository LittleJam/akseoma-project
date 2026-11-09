import React, { useEffect, useRef, useState } from 'react';
import { X, EyeOff, ImageIcon, Paperclip, Hourglass, FolderPlus, Pencil, ArrowLeft } from 'lucide-react';
import { NOTE_COLORS } from '../constants';
import { getNoteLines, isImageLine, isFileLine } from '../utils/noteLines';
import { buildAttachmentLines } from '../utils/fileAttachment';
import { themeIcon } from '../themes';
import useIsMobile from '../utils/useIsMobile';
import { useBackClose } from '../utils/backClose';
import FitText from './FitText';
import NoteModal from './NoteModal';
import PageShell from './PageShell';

const PREVIEW_ITEMS = 6;
// Сколько держать перетаскиваемую заметку над другой, прежде чем это
// считается «сложить в папку», а не «поменять местами» — то же самое
// различие жестов, что на iOS у иконок приложений
const HOVER_MERGE_MS = 700;

// Первая непустая строка — то, что видно на карточке вместо «Untitled»,
// если название не задано. Обрезаем сами: заголовку не всё равно, сколько
// в нём символов, а строка заметки может быть какой угодно длины
const notePreviewText = (lines) => {
  const line = (lines || []).find(l => l.text?.trim());
  if (!line) return '';
  const text = line.text.trim();
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
};

export default function Notes({
  notes,
  addNote,
  expandedNoteId,
  setExpandedNoteId,
  updateNoteLines,
  updateNoteTitle,
  setNoteColor,
  setNoteRevealAt,
  setNoteSharedWith,
  deleteNote,
  toggleNoteBlur,
  reorderNotes,
  folders = [],
  addNoteFolder,
  renameNoteFolder,
  deleteNoteFolder,
  setNoteFolder,
  mergeNotesIntoFolder,
  darkMode,
  theme,
  currentUsername,
  users = []
}) {
  const AddIcon = themeIcon(theme, 'add');
  const FolderIcon = themeIcon(theme, 'noteFolder');
  // Капсулы времени сверяют себя с этим моментом, а не с Date.now() напрямую
  // в рендере — иначе заметка не распечаталась бы сама, пока вкладку не
  // перезагрузят. Раз в полминуты достаточно: секундная точность здесь не нужна
  const [now, setNow] = useState(() => Date.now());
  // Тикаем только когда есть чему распечатываться. Без капсул пересчитывать
  // нечего, а каждый тик — это перерисовка всей сетки заметок впустую, раз в
  // полминуты всё время, пока раздел открыт. Смотрим по всем заметкам, а не
  // по видимым: капсула может лежать в закрытой папке и дойти до срока, пока
  // мы стоим на верхнем уровне
  const hasSealed = notes.some(note => note.revealAt && new Date(note.revealAt).getTime() > now);
  useEffect(() => {
    if (!hasSealed) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [hasSealed]);
  // На телефоне закрытая заметка — обложка с одним названием, а не превью
  // строк: это разные наборы элементов, и прятать один классом нельзя
  const isMobile = useIsMobile();
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  // Наведение на папку — свой, отдельный от заметок, хайлайт: сюда кладут
  // сразу, без задержки на «может, это перестановка»
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  // Перетаскивание пальцем. Обычное HTML5-перетаскивание на телефоне не
  // работает вовсе, а стрелок «вверх-вниз» на обложке больше нет, поэтому
  // порядок меняют так: карточку удерживают, дальше она едет за пальцем и на
  // отпускании встаёт на место той, над которой оказалась
  const [touchDrag, setTouchDrag] = useState(null); // { index, dx, dy, overIndex, overFolderId }
  const holdRef = useRef(null);
  // Перетаскивание заканчивается тем же касанием, что и клик, — без этой
  // отметки отпускание пальца открывало бы заметку
  const draggedRef = useRef(false);
  // id заметки, над которой держат перетаскиваемый файл
  const [fileOverId, setFileOverId] = useState(null);

  // Заметку задержали над другой дольше HOVER_MERGE_MS — обе складываются
  // в папку. Короткая задержка — обычная перестановка, как и было раньше
  const mergeHoverRef = useRef({ noteId: null, timer: null });
  const [mergeReadyNoteId, setMergeReadyNoteId] = useState(null);

  const armNoteMergeHover = (noteId) => {
    if (!noteId || mergeHoverRef.current.noteId === noteId) return;
    clearTimeout(mergeHoverRef.current.timer);
    mergeHoverRef.current.noteId = noteId;
    mergeHoverRef.current.timer = setTimeout(() => setMergeReadyNoteId(noteId), HOVER_MERGE_MS);
  };

  const clearNoteMergeHover = () => {
    clearTimeout(mergeHoverRef.current.timer);
    mergeHoverRef.current = { noteId: null, timer: null };
    setMergeReadyNoteId(null);
  };

  // Открытая папка — 'all' значит «на верхнем уровне», иначе id папки
  const [activeFolderId, setActiveFolderId] = useState('all');
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Папку могли удалить, пока она была открыта — тогда возвращаемся на верхний уровень
  useEffect(() => {
    if (activeFolderId === 'all') return;
    if (!folders.some(f => f.id === activeFolderId)) setActiveFolderId('all');
  }, [folders, activeFolderId]);

  const openedFolder = activeFolderId === 'all' ? null : folders.find(f => f.id === activeFolderId) || null;

  // Открытая папка — такой же слой, как окно: системный «назад» на Android и
  // свайп от края на iOS должны уводить из неё обратно к списку, а не из
  // раздела целиком. Своего адреса у папки нет, поэтому слой заводится здесь
  useBackClose(Boolean(openedFolder), () => setActiveFolderId('all'));

  // Переход между уровнями показываем так же, как открытие заметки: вход в
  // папку приезжает справа, возврат выезжает слева — видно, что страница
  // сменилась на предыдущую, а не просто перерисовалась
  const [folderAnim, setFolderAnim] = useState(null);
  const previousFolder = useRef(activeFolderId);
  useEffect(() => {
    if (previousFolder.current === activeFolderId) return;
    setFolderAnim(activeFolderId === 'all' ? 'back' : 'in');
    previousFolder.current = activeFolderId;
  }, [activeFolderId]);

  // На верхнем уровне видны папки и заметки без папки — как иконки и папки
  // вперемешку на iOS. Внутри открытой папки видны только её заметки
  const topLevelNotes = activeFolderId === 'all'
    ? notes.filter(n => !n.folderId)
    : notes.filter(n => n.folderId === activeFolderId);

  const submitNewFolder = () => {
    if (!newFolderName.trim()) return;
    addNoteFolder(newFolderName);
    setNewFolderName('');
    setAddingFolder(false);
  };

  const submitFolderRename = () => {
    if (editingFolderName.trim()) renameNoteFolder(editingFolderId, editingFolderName);
    setEditingFolderId(null);
  };

  // Слияние двух заметок — общее и для мыши, и для пальца: заводит папку
  // (или кладёт в существующую) и, если папка только что создана, сразу
  // открывает её с полем переименования — то же самое, что делает iOS
  const mergeNotes = (sourceId, targetId) => {
    if (!mergeNotesIntoFolder || sourceId === targetId) return;
    const result = mergeNotesIntoFolder(sourceId, targetId);
    if (result?.created) {
      setActiveFolderId(result.folderId);
      setEditingFolderId(result.folderId);
      setEditingFolderName('New Folder');
    }
  };

  // Ищем заметку в списке каждый раз, чтобы окно показывало свежие правки,
  // а удаление заметки закрывало окно само
  const expandedNote = notes.find(n => n.id === expandedNoteId) || null;

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('noteIndex', index.toString());
  };

  const handleDragOver = (e, index, noteId) => {
    // Файл из системы кидают, чтобы прикрепить вложение; карточку — чтобы поменять порядок
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setFileOverId(noteId);
      return;
    }
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
    if (dragIndex !== index) armNoteMergeHover(noteId);
    else clearNoteMergeHover();
  };

  const handleDrop = async (e, index, noteId) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) {
      resetDrag();
      try {
        const { lines: added, oversized } = await buildAttachmentLines(files);
        if (oversized.length) {
          alert(`Too large to attach (5 MB max): ${oversized.map(f => f.name).join(', ')}`);
        }
        if (added.length) {
          const note = notes.find(n => n.id === noteId);
          const lines = getNoteLines(note);
          updateNoteLines(noteId, [...lines, ...added]);
        }
      } catch (err) {
        console.error('Attachment error:', err);
      }
      return;
    }
    const fromIndex = parseInt(e.dataTransfer.getData('noteIndex'), 10);
    if (!Number.isNaN(fromIndex)) {
      const draggedNote = notes[fromIndex];
      if (mergeReadyNoteId === noteId && draggedNote) {
        mergeNotes(draggedNote.id, noteId);
      } else {
        reorderNotes(fromIndex, index);
      }
    }
    resetDrag();
  };

  const handleFolderDragOver = (e, folderId) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleFolderDrop = (e, folderId) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('noteIndex'), 10);
    const note = !Number.isNaN(fromIndex) ? notes[fromIndex] : null;
    if (note) setNoteFolder(note.id, folderId);
    resetDrag();
  };

  const resetDrag = () => {
    setFileOverId(null);
    setDragIndex(null);
    setDragOverIndex(null);
    setDragOverFolderId(null);
    clearNoteMergeHover();
  };

  // ── Перетаскивание пальцем ────────────────────────────────────────────────
  // Карточку надо подержать: короткое касание — это открыть заметку, а
  // движение сразу после касания — прокрутка списка. Только удержание без
  // движения означает «беру карточку»
  const HOLD_MS = 260;
  const HOLD_SLOP = 8;
  // Полоса у края списка, в которой он начинает ехать сам, и скорость у самого
  // края. Без неё заметку не унести дальше экрана: вести пальцем некуда, а
  // список стоит — в сетке из пятнадцати плиток это половина мест
  const EDGE_ZONE = 80;
  const EDGE_SPEED = 16;

  // Где палец сейчас. Нужно и обычному движению, и автопрокрутке: пока список
  // едет сам, палец стоит, а пересчитывать положение всё равно надо
  const dragPoint = useRef({ x: 0, y: 0 });
  const autoScrollRaf = useRef(0);

  // Ближайший предок, который на самом деле прокручивается. Искать его по
  // классу — привязаться к вёрстке каркаса, поэтому спрашиваем у стилей
  const scrollParent = (el) => {
    for (let node = el?.parentElement; node; node = node.parentElement) {
      const { overflowY } = window.getComputedStyle(node);
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    }
    return null;
  };

  const stopAutoScroll = () => {
    if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
    autoScrollRaf.current = 0;
  };

  const cancelHold = () => {
    if (holdRef.current?.timer) clearTimeout(holdRef.current.timer);
    holdRef.current = null;
    stopAutoScroll();
    setTouchDrag(null);
  };

  // Насколько карточка уехала и над кем оказалась. Считается от движения
  // пальца и от того, насколько успел уехать список: во время автопрокрутки
  // карточка обязана остаться ровно под пальцем, а не всплыть вместе с сеткой
  const updateDrag = () => {
    const hold = holdRef.current;
    if (!hold?.armed) return;

    const { x, y } = dragPoint.current;
    const scrolled = hold.scroller ? hold.scroller.scrollTop - hold.startScrollTop : 0;
    const dx = x - hold.startX;
    const dy = y - hold.startY + scrolled;

    // Что под пальцем, спрашиваем у документа: сама карточка на это время
    // сквозная (pointer-events: none), поэтому отвечает та, что под ней
    const target = document.elementFromPoint(x, y);
    const folderEl = target?.closest('[data-folder-id]');
    const noteEl = target?.closest('[data-note-index]');

    if (folderEl) {
      clearNoteMergeHover();
      setTouchDrag({ index: hold.index, dx, dy, overIndex: hold.index, overFolderId: folderEl.dataset.folderId });
      return;
    }

    const overIndex = noteEl ? Number(noteEl.dataset.noteIndex) : hold.index;
    if (overIndex !== hold.index) armNoteMergeHover(notes[overIndex]?.id);
    else clearNoteMergeHover();
    setTouchDrag({ index: hold.index, dx, dy, overIndex, overFolderId: null });
  };

  // Чем ближе палец к краю, тем быстрее едет список — так же, как при переносе
  // файла в Finder. Кадр за кадром, пока палец держат у края
  const runAutoScroll = () => {
    const hold = holdRef.current;
    const scroller = hold?.armed ? hold.scroller : null;
    if (!scroller) {
      stopAutoScroll();
      return;
    }

    const box = scroller.getBoundingClientRect();
    const { y } = dragPoint.current;
    let speed = 0;
    if (y < box.top + EDGE_ZONE) speed = -EDGE_SPEED * Math.min(1, (box.top + EDGE_ZONE - y) / EDGE_ZONE);
    else if (y > box.bottom - EDGE_ZONE) speed = EDGE_SPEED * Math.min(1, (y - (box.bottom - EDGE_ZONE)) / EDGE_ZONE);

    if (speed) {
      const before = scroller.scrollTop;
      scroller.scrollTop = before + speed;
      // Упёрлись в конец списка — дальше считать нечего
      if (scroller.scrollTop !== before) updateDrag();
    }

    autoScrollRaf.current = requestAnimationFrame(runAutoScroll);
  };

  const handlePointerDown = (e, index) => {
    // Новое касание начинается начисто: прошлый перенос уже отработал
    draggedRef.current = false;
    if (!isMobile || e.pointerType === 'mouse') return;
    const { clientX, clientY, pointerId, currentTarget } = e;
    dragPoint.current = { x: clientX, y: clientY };
    // Список запоминаем сразу: пока карточку несут, его прокрутку нужно
    // вычитать из смещения, иначе карточка уедет из-под пальца
    const scroller = scrollParent(currentTarget);

    holdRef.current = {
      index,
      startX: clientX,
      startY: clientY,
      scroller,
      startScrollTop: scroller ? scroller.scrollTop : 0,
      armed: false,
      timer: setTimeout(() => {
        if (!holdRef.current) return;
        holdRef.current.armed = true;
        holdRef.current.startScrollTop = scroller ? scroller.scrollTop : 0;
        // Карточку взяли — значит это перенос, а не тап: клик по отпусканию
        // гасим независимо от того, сдвинули её потом или нет
        draggedRef.current = true;
        // Дальше палец ведёт карточку, а не список: события забираем себе,
        // иначе они уйдут тому, над кем палец окажется
        try { currentTarget.setPointerCapture(pointerId); } catch { /* уже отпущен */ }
        navigator.vibrate?.(10);
        setTouchDrag({ index, dx: 0, dy: 0, overIndex: index, overFolderId: null });
        autoScrollRaf.current = requestAnimationFrame(runAutoScroll);
      }, HOLD_MS)
    };
  };

  const handlePointerMove = (e) => {
    const hold = holdRef.current;
    if (!hold) return;
    dragPoint.current = { x: e.clientX, y: e.clientY };

    if (!hold.armed) {
      // Повели пальцем, не дождавшись, — это прокрутка, карточку не берём
      if (Math.abs(e.clientX - hold.startX) > HOLD_SLOP || Math.abs(e.clientY - hold.startY) > HOLD_SLOP) cancelHold();
      return;
    }

    updateDrag();
  };

  const handlePointerUp = () => {
    const hold = holdRef.current;
    const drag = touchDrag;
    const readyNoteId = mergeReadyNoteId;
    cancelHold();
    clearNoteMergeHover();

    if (!hold?.armed || !drag) return;

    if (drag.overFolderId) {
      const note = notes[drag.index];
      if (note) setNoteFolder(note.id, drag.overFolderId);
      return;
    }
    if (readyNoteId) {
      const source = notes[drag.index];
      if (source) mergeNotes(source.id, readyNoteId);
      return;
    }
    if (drag.overIndex !== drag.index) reorderNotes(drag.index, drag.overIndex);
    // draggedRef снимет следующее касание: клик после отпускания приходит
    // позже и должен застать отметку на месте
  };

  // Пока карточку несут, страница под пальцем стоять должна. touch-action
  // здесь не помогает: он читается в начале касания, а мы решаем позже,
  // поэтому глушим прокрутку не-пассивным обработчиком
  useEffect(() => {
    if (!touchDrag) return;
    const stopScroll = e => e.preventDefault();
    document.addEventListener('touchmove', stopScroll, { passive: false });
    return () => document.removeEventListener('touchmove', stopScroll);
  }, [Boolean(touchDrag)]);

  const mutedText = darkMode ? 'text-gray-500' : 'text-gray-400';
  const iconHover = darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600';

  // Заголовок — сама страница или открытая папка со стрелкой назад, как при
  // переходе внутрь папки на iOS
  const pageTitle = openedFolder ? (
    <span className="flex items-center gap-2 min-w-0">
      <button
        onClick={() => setActiveFolderId('all')}
        title="Back to all notes"
        aria-label="Back to all notes"
        className={`p-1 -ml-1 rounded press-icon flex-shrink-0 ${mutedText} ${iconHover}`}
      >
        <ArrowLeft size={18} />
      </button>
      {editingFolderId === openedFolder.id ? (
        <input
          type="text"
          value={editingFolderName}
          onChange={e => setEditingFolderName(e.target.value)}
          onBlur={submitFolderRename}
          onKeyDown={e => {
            if (e.key === 'Enter') submitFolderRename();
            if (e.key === 'Escape') setEditingFolderId(null);
          }}
          autoFocus
          className={`min-w-0 px-1 -mx-1 text-title sm:text-title-lg font-semibold bg-transparent border-b focus:outline-none ${
            darkMode ? 'text-white border-gray-600' : 'text-gray-800 border-gray-300'
          }`}
        />
      ) : (
        <span className="truncate">{openedFolder.name}</span>
      )}
    </span>
  ) : 'Notes';

  // «Новая заметка» — всегда; внутри папки к ней добавляются переименование
  // и удаление папки, на верхнем уровне — добавление папки
  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={addNote}
        title="New note"
        aria-label="New note"
        /* На телефоне у кнопки только значок: «плюс» в расписании и на борде
           тоже без подписи, а одно и то же действие не должно выглядеть на
           каждой странице по-своему. На десктопе место под слово есть, и там
           подпись остаётся */
        className={`h-control w-control sm:w-auto flex items-center justify-center sm:gap-1.5 sm:px-3 text-body rounded-lg border press ${
          darkMode
            ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
      >
        <AddIcon size={16} />
        <span className="hidden sm:inline">New note</span>
      </button>

      {openedFolder ? (
        <>
          <button
            onClick={() => { setEditingFolderId(openedFolder.id); setEditingFolderName(openedFolder.name); }}
            title="Rename folder"
            aria-label="Rename folder"
            className={`h-control w-control flex items-center justify-center rounded-lg border press ${
              darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete folder "${openedFolder.name}"? Notes in it stay, just unfiled.`)) {
                deleteNoteFolder(openedFolder.id);
                setActiveFolderId('all');
              }
            }}
            title="Delete folder"
            aria-label="Delete folder"
            className={`h-control w-control flex items-center justify-center rounded-lg border press ${
              darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-red-400' : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-red-500'
            }`}
          >
            <X size={15} />
          </button>
        </>
      ) : addingFolder ? (
        <input
          type="text"
          value={newFolderName}
          onChange={e => setNewFolderName(e.target.value)}
          onBlur={() => { if (!newFolderName.trim()) setAddingFolder(false); else submitNewFolder(); }}
          onKeyDown={e => {
            if (e.key === 'Enter') submitNewFolder();
            if (e.key === 'Escape') { setNewFolderName(''); setAddingFolder(false); }
          }}
          placeholder="Folder name..."
          autoFocus
          className={`h-control w-32 px-2.5 text-sm rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 placeholder-gray-400'
          }`}
        />
      ) : (
        <button
          onClick={() => setAddingFolder(true)}
          title="New folder"
          aria-label="New folder"
          className={`h-control w-control flex items-center justify-center rounded-lg border press ${
            darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FolderPlus size={16} />
        </button>
      )}
    </div>
  );

  const isEmpty = topLevelNotes.length === 0 && (activeFolderId !== 'all' || folders.length === 0);

  return (
    <>
      <PageShell darkMode={darkMode} title={pageTitle} actions={headerActions}>
        {isEmpty ? (
          <p className={`text-sm text-center py-12 ${mutedText}`}>
            {notes.length === 0 ? 'No notes yet — add your first one' : 'No notes in this folder'}
          </p>
        ) : (
          // Карточки квадратные, поэтому на широком экране добавляем колонки,
          // а не растягиваем плитки: иначе три штуки раздуваются на пол-экрана.
          // На телефоне колонки три: обложке нужно только название, и в такой
          // плитке список виден почти целиком, без листания.
          // Зазор шире самих плиток по краям: в Surf заметку держит скотч, он
          // выступает за лист, и на тесной сетке соседи налезали друг на друга
          <div
            /* key по папке: без него React переиспользует ту же сетку, и
               анимация перехода не проигрывается заново */
            key={activeFolderId}
            /* Пока открыта папка, её содержимое едет за пальцем при свайпе от
               края — так же, как окна (см. utils/nativeSwipe.js). Вне папки
               метки нет: уводить жестом было бы некуда */
            {...(openedFolder ? { 'data-swipe-panel': '' } : {})}
            className={`grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 wide:grid-cols-4 ultra:grid-cols-5 gap-4 sm:gap-5 ${
              folderAnim === 'in' ? 'animate-page-in-right' : folderAnim === 'back' ? 'animate-page-in-left' : ''
            }`}
          >
            {/* Папки — только на верхнем уровне, вперемешку с заметками без
                папки, как иконки и папки на iOS. Сами папки не перетаскиваются
                между собой — только заметки в них и между ними */}
            {activeFolderId === 'all' && folders.map(folder => {
              const isOver = dragOverFolderId === folder.id || touchDrag?.overFolderId === folder.id;
              return (
                <button
                  key={folder.id}
                  data-folder-id={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  onDragOver={e => handleFolderDragOver(e, folder.id)}
                  onDragLeave={e => {
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    setDragOverFolderId(prev => (prev === folder.id ? null : prev));
                  }}
                  onDrop={e => handleFolderDrop(e, folder.id)}
                  className={`aspect-[4/3] sm:aspect-square self-start min-h-0 rounded-lg border p-3 flex flex-col items-center justify-center gap-1.5 text-center transition duration-150 ${
                    isOver ? 'ring-2 ring-green-600 scale-[1.02]' : ''
                  } ${
                    darkMode ? 'border-gray-700 bg-gray-800/60 hover:bg-gray-800' : 'border-gray-200 bg-white/70 hover:bg-white'
                  }`}
                >
                  <FolderIcon size={28} className={darkMode ? 'text-gray-400' : 'text-gray-400'} />
                  <span className={`text-xs font-medium truncate max-w-full ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {folder.name}
                  </span>
                </button>
              );
            })}

            {topLevelNotes.map((note) => {
              // Перетаскивание меняет местами позиции в полном списке заметок,
              // а не в отфильтрованном по папке — своей сортировки у папки нет
              const index = notes.indexOf(note);
              const isDragging = dragIndex === index;
              const isDropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index;
              // Задержались над этой карточкой достаточно, чтобы сложить обе
              // в папку — вместо обычной перестановки местами
              const isMergeReady = mergeReadyNoteId === note.id;
              const palette = NOTE_COLORS[note.color] || NOTE_COLORS.default;
              const lines = getNoteLines(note);
              // Пустые строки в превью не показываем: на карточке они выглядели бы
              // случайными пропусками, а места на ней и так немного
              const filled = lines.filter(line => line.text.trim());
              const images = lines.filter(isImageLine);
              const attachments = lines.filter(isFileLine);
              const hiddenItems = filled.length - PREVIEW_ITEMS;
              const blurClass = note.blurred ? 'blur-[5px] select-none' : '';
              // Без названия на карточке видно начало текста, а не голое
              // «Untitled» — так заметку узнают, даже если её не подписали.
              // Заблюренную заметку это не касается: показывать текст там,
              // где его специально спрятали, не дело
              const displayTitle = note.title || (note.blurred ? '' : notePreviewText(lines));
              // Капсула времени: запечатана, пока не наступил выбранный момент —
              // содержимого на карточке не видно вовсе, вскрыть раньше срока нельзя
              const sealed = note.revealAt && new Date(note.revealAt).getTime() > now;
              // Эту карточку несут пальцем; эта — под ней, на её место и встанет
              const carried = touchDrag?.index === index;
              const isTouchTarget = touchDrag?.overIndex === index && touchDrag.overIndex !== touchDrag.index && !touchDrag.overFolderId;
              const isTouchMergeReady = isTouchTarget && isMergeReady;

              // Кнопка карточки: удаление. Нужна обеим раскладкам — и превью
              // на десктопе, и обложке на телефоне, поэтому собрана здесь.
              // Стрелок «вверх-вниз» нет: порядок на телефоне меняют, унося
              // карточку пальцем
              const controls = (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    // Карточку могли понести, взяв её как раз за эту кнопку —
                    // отпускание пальца не должно оказаться удалением
                    if (draggedRef.current) return;
                    deleteNote(note.id);
                  }}
                  title="Delete note"
                  /* Видно сразу на телефоне: наведения там не бывает */
                  className={`p-1 sm:p-0.5 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 press-icon flex-shrink-0 ${mutedText} hover:text-red-500`}
                >
                  <X size={13} />
                </button>
              );

              // Пометки заметки: спрятанная и число картинок
              const flags = (
                <>
                  {note.blurred && <EyeOff size={12} className={`flex-shrink-0 ${mutedText}`} />}
                  {/* Сами картинки на закрытой карточке не показываем — они
                      съедали всю плитку. Остаётся отметка, что они есть */}
                  {images.length > 0 && (
                    <span className={`flex items-center gap-0.5 text-[10px] flex-shrink-0 ${mutedText}`}>
                      <ImageIcon size={11} /> {images.length}
                    </span>
                  )}
                  {attachments.length > 0 && (
                    <span className={`flex items-center gap-0.5 text-[10px] flex-shrink-0 ${mutedText}`}>
                      <Paperclip size={11} /> {attachments.length}
                    </span>
                  )}
                </>
              );

              return (
                <div
                  key={note.id}
                  // Хук для тем: в Handwriting карточка становится листком из блокнота
                  data-card="note"
                  // Индекс в разметке: по нему находится карточка под пальцем
                  data-note-index={index}
                  /* Тащить можно за любое место карточки; обычный клик по-прежнему
                     открывает заметку. На телефоне атрибута нет совсем: пальцем
                     HTML5-перенос всё равно не работает, а WebKit на долгое
                     нажатие по draggable-элементу поднимает свой собственный
                     перенос — с системной «лупой» и выделением текста поверх
                     нашего жеста. Отсюда и бралось выделение на обложке */
                  draggable={!isMobile}
                  onDragStart={e => handleDragStart(e, index)}
                  onDragEnd={resetDrag}
                  onDragOver={e => handleDragOver(e, index, note.id)}
                  onDragLeave={e => {
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    setFileOverId(null);
                  }}
                  onDrop={e => handleDrop(e, index, note.id)}
                  onPointerDown={e => handlePointerDown(e, index)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={cancelHold}
                  onClick={() => {
                    // Тем же касанием карточку могли нести — тогда это не клик
                    if (draggedRef.current) return;
                    // Запечатанную капсулу открыть нечем — только ждать
                    if (sealed) return;
                    setExpandedNoteId(note.id);
                  }}
                  /* Пока карточку несут, она едет за пальцем и не мешает
                     искать, над кем оказалась: pointer-events снимаем, события
                     всё равно приходят через захват указателя */
                  style={carried ? {
                    transform: `translate(${touchDrag.dx}px, ${touchDrag.dy}px) scale(1.04)`,
                    pointerEvents: 'none',
                    zIndex: 20,
                    position: 'relative'
                  } : undefined}
                  /* Квадрат держит сетку ровной на широком экране. На телефоне
                     плитка ниже квадрата: в две колонки квадрат уходил ниже
                     половины экрана. Соотношение задано и обложке: по нему
                     считается угол диагонали, вдоль которой пишется название */
                  className={`aspect-[4/3] sm:aspect-square self-start min-h-0 overflow-hidden rounded-lg border p-1.5 sm:p-3 flex flex-col group ${
                    sealed ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    isDragging ? 'opacity-40 transition duration-150' : carried ? 'shadow-xl' : 'lift'
                  } ${darkMode ? palette.dark : palette.light} ${
                    isMergeReady || isTouchMergeReady
                      ? 'ring-2 ring-blue-500 scale-[1.03] transition duration-150'
                      : isDropTarget || isTouchTarget || fileOverId === note.id ? 'ring-2 ring-green-600' : ''
                  }`}
                >
                  {sealed ? (
                    /* Капсула ещё закрыта: ни превью, ни названия целиком —
                       только когда и что распечатается, плюс удаление, если
                       передумали. Удалить капсулу можно, прочитать раньше
                       срока — нет */
                    <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-1.5 px-2">
                      <div className="absolute top-0 right-0">{controls}</div>
                      <Hourglass size={20} className={mutedText} aria-hidden="true" />
                      {note.title && (
                        <span className={`text-xs font-medium truncate max-w-full ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {note.title}
                        </span>
                      )}
                      <span className={`text-[10px] ${mutedText}`}>
                        Opens {new Date(note.revealAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ) : isMobile ? (
                    /* Обложка: пустая плитка с названием в правом нижнем
                       углу. Превью строк на плитке в пол-экрана всё равно
                       обрывалось на второй, а название — то, по чему заметку
                       узнают. Служебное по углам: пометки сверху слева,
                       название снизу слева, удаление снизу справа */
                    <div className="relative flex-1 min-h-0">
                      {/* Дату с обложки убрали: заметку ищут по названию, а
                          не по времени правки, и на плитке она только шумела */}
                      <div className="absolute top-0 left-0 flex items-center gap-1 min-w-0">
                        {flags}
                      </div>

                      {/* Название в левом нижнем углу, удаление — в правом:
                          два дальних друг от друга угла, поэтому промахнуться
                          по крестику, читая название, не выйдет. Длинное
                          название занимает две строки и растёт вправо */}
                      <div className="absolute bottom-0 left-0 right-6 pointer-events-none">
                        {/* Длинное название уменьшается, чтобы остаться одной
                            строкой: перенос ломает угол сильнее, чем мелкий
                            кегль. Совсем длинное всё же переносится — предел
                            уменьшения внутри FitText */}
                        <FitText className={`note-cover-title text-xs text-left leading-snug ${
                          displayTitle
                            ? darkMode ? 'text-gray-100' : 'text-gray-800'
                            : darkMode ? 'text-gray-600' : 'text-gray-300'
                        }`}>
                          {displayTitle || 'Untitled'}
                        </FitText>
                      </div>

                      <div className="absolute bottom-0 right-0 flex items-center">
                        {controls}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 mb-1">
                        {displayTitle ? (
                          <h3 className={`flex-1 min-w-0 text-xs sm:text-sm font-medium truncate ${
                            note.title ? (darkMode ? 'text-gray-100' : 'text-gray-800') : (darkMode ? 'text-gray-400' : 'text-gray-500')
                          }`}>
                            {displayTitle}
                          </h3>
                        ) : (
                          <span className={`flex-1 min-w-0 text-xs sm:text-sm ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                            Untitled
                          </span>
                        )}

                        {flags}
                        {controls}
                      </div>

                      <span className={`text-[10px] mb-1 sm:mb-2 ${mutedText}`}>{note.updatedAt}</span>

                      {/* Превью повторяет строки заметки как есть: текст текстом,
                          пункты с маркерами, в том же порядке. Отметить пункт можно
                          прямо здесь — окно для этого открывать не нужно */}
                      <div className={`flex-1 min-h-0 overflow-hidden ${blurClass}`}>
                        {filled.length === 0 ? (
                          <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>Empty note</p>
                        ) : (
                          <div className="space-y-0.5">
                            {filled.slice(0, PREVIEW_ITEMS).map(line => (
                              <div key={line.id} className="flex items-start gap-2">
                                {line.type === 'todo' && (
                                  <input
                                    type="checkbox"
                                    checked={!!line.checked}
                                    onClick={e => e.stopPropagation()}
                                    onChange={() => updateNoteLines(
                                      note.id,
                                      lines.map(l => (l.id === line.id ? { ...l, checked: !l.checked } : l))
                                    )}
                                    disabled={!!note.blurred}
                                    className={`w-3.5 h-3.5 mt-0.5 cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
                                      line.checked ? 'animate-check-pop' : ''
                                    }`}
                                  />
                                )}
                                {line.type === 'bullet' && (
                                  <span className={`w-1 h-1 mt-[7px] rounded-full flex-shrink-0 mx-[5px] ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`} />
                                )}
                                <span className={`flex-1 min-w-0 text-xs sm:text-sm truncate transition-colors duration-200 ${
                                  line.checked
                                    ? darkMode ? 'text-gray-500' : 'text-gray-400'
                                    : darkMode ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                  {line.text}
                                </span>
                              </div>
                            ))}
                            {hiddenItems > 0 && (
                              <p className={`text-[11px] pl-[22px] pt-0.5 ${mutedText}`}>+{hiddenItems} more</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </PageShell>

      {expandedNote && (
        <NoteModal
          note={expandedNote}
          updateNoteLines={updateNoteLines}
          updateNoteTitle={updateNoteTitle}
          setNoteColor={setNoteColor}
          setNoteRevealAt={setNoteRevealAt}
          setNoteSharedWith={setNoteSharedWith}
          deleteNote={deleteNote}
          toggleNoteBlur={toggleNoteBlur}
          onClose={() => setExpandedNoteId(null)}
          darkMode={darkMode}
          currentUsername={currentUsername}
          users={users}
          theme={theme}
        />
      )}
    </>
  );
}
