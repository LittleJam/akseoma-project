import React, { useEffect, useRef, useState } from 'react';
import { X, EyeOff, ImageIcon } from 'lucide-react';
import { NOTE_COLORS } from '../constants';
import { getNoteLines, isImageLine, newLineId, LINE_IMAGE } from '../utils/noteLines';
import { compressImage } from '../utils/imageCompression';
import { themeIcon } from '../themes';
import useIsMobile from '../utils/useIsMobile';
import NoteModal from './NoteModal';
import PageShell from './PageShell';

const PREVIEW_ITEMS = 6;

export default function Notes({
  notes,
  addNote,
  expandedNoteId,
  setExpandedNoteId,
  updateNoteLines,
  updateNoteTitle,
  setNoteColor,
  deleteNote,
  toggleNoteBlur,
  reorderNotes,
  darkMode,
  theme
}) {
  const AddIcon = themeIcon(theme, 'add');
  // На телефоне закрытая заметка — обложка с одним названием, а не превью
  // строк: это разные наборы элементов, и прятать один классом нельзя
  const isMobile = useIsMobile();
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  // Перетаскивание пальцем. Обычное HTML5-перетаскивание на телефоне не
  // работает вовсе, а стрелок «вверх-вниз» на обложке больше нет, поэтому
  // порядок меняют так: карточку удерживают, дальше она едет за пальцем и на
  // отпускании встаёт на место той, над которой оказалась
  const [touchDrag, setTouchDrag] = useState(null); // { index, dx, dy, overIndex }
  const holdRef = useRef(null);
  // Перетаскивание заканчивается тем же касанием, что и клик, — без этой
  // отметки отпускание пальца открывало бы заметку
  const draggedRef = useRef(false);
  // id заметки, над которой держат перетаскиваемый файл
  const [fileOverId, setFileOverId] = useState(null);

  // Ищем заметку в списке каждый раз, чтобы окно показывало свежие правки,
  // а удаление заметки закрывало окно само
  const expandedNote = notes.find(n => n.id === expandedNoteId) || null;

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('noteIndex', index.toString());
  };

  const handleDragOver = (e, index, noteId) => {
    // Файл из системы кидают, чтобы прикрепить картинку; карточку — чтобы поменять порядок
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
  };

  const handleDrop = async (e, index, noteId) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      resetDrag();
      try {
        const compressed = await Promise.all(files.map(file => compressImage(file)));
        const note = notes.find(n => n.id === noteId);
        const lines = getNoteLines(note);
        updateNoteLines(noteId, [
          ...lines,
          ...compressed.map(src => ({ id: newLineId(), type: LINE_IMAGE, text: '', src }))
        ]);
      } catch (err) {
        console.error('Image compression error:', err);
      }
      return;
    }
    const fromIndex = parseInt(e.dataTransfer.getData('noteIndex'), 10);
    if (!Number.isNaN(fromIndex)) reorderNotes(fromIndex, index);
    resetDrag();
  };

  const resetDrag = () => {
    setFileOverId(null);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ── Перетаскивание пальцем ────────────────────────────────────────────────
  // Карточку надо подержать: короткое касание — это открыть заметку, а
  // движение сразу после касания — прокрутка списка. Только удержание без
  // движения означает «беру карточку»
  const HOLD_MS = 260;
  const HOLD_SLOP = 8;

  const cancelHold = () => {
    if (holdRef.current?.timer) clearTimeout(holdRef.current.timer);
    holdRef.current = null;
    setTouchDrag(null);
  };

  const handlePointerDown = (e, index) => {
    // Новое касание начинается начисто: прошлый перенос уже отработал
    draggedRef.current = false;
    if (!isMobile || e.pointerType === 'mouse') return;
    const { clientX, clientY, pointerId, currentTarget } = e;

    holdRef.current = {
      index,
      startX: clientX,
      startY: clientY,
      armed: false,
      timer: setTimeout(() => {
        if (!holdRef.current) return;
        holdRef.current.armed = true;
        // Карточку взяли — значит это перенос, а не тап: клик по отпусканию
        // гасим независимо от того, сдвинули её потом или нет
        draggedRef.current = true;
        // Дальше палец ведёт карточку, а не список: события забираем себе,
        // иначе они уйдут тому, над кем палец окажется
        try { currentTarget.setPointerCapture(pointerId); } catch { /* уже отпущен */ }
        navigator.vibrate?.(10);
        setTouchDrag({ index, dx: 0, dy: 0, overIndex: index });
      }, HOLD_MS)
    };
  };

  const handlePointerMove = (e) => {
    const hold = holdRef.current;
    if (!hold) return;

    const dx = e.clientX - hold.startX;
    const dy = e.clientY - hold.startY;

    if (!hold.armed) {
      // Повели пальцем, не дождавшись, — это прокрутка, карточку не берём
      if (Math.abs(dx) > HOLD_SLOP || Math.abs(dy) > HOLD_SLOP) cancelHold();
      return;
    }

    // Что под пальцем, спрашиваем у документа: сама карточка на это время
    // сквозная (pointer-events: none), поэтому отвечает та, что под ней
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-note-index]');
    const overIndex = under ? Number(under.dataset.noteIndex) : hold.index;

    setTouchDrag({ index: hold.index, dx, dy, overIndex });
  };

  const handlePointerUp = () => {
    const hold = holdRef.current;
    const drag = touchDrag;
    cancelHold();

    if (!hold?.armed || !drag) return;
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

  // «Новая заметка» — действие страницы, поэтому уходит в шапку каркаса
  const newNoteButton = (
    <button
      onClick={addNote}
      className={`h-control flex items-center gap-1.5 px-3 text-body rounded-lg border press ${
        darkMode
          ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
          : 'border-gray-200 text-gray-600 hover:bg-gray-100'
      }`}
    >
      <AddIcon size={16} /> New note
    </button>
  );

  return (
    <>
      <PageShell darkMode={darkMode} title="Notes" actions={newNoteButton}>
        {notes.length === 0 ? (
          <p className={`text-sm text-center py-12 ${mutedText}`}>
            No notes yet — add your first one
          </p>
        ) : (
          // Карточки квадратные, поэтому на широком экране добавляем колонки,
          // а не растягиваем плитки: иначе три штуки раздуваются на пол-экрана.
          // На телефоне колонки три: обложке нужно только название, и в такой
          // плитке список виден почти целиком, без листания
          <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 wide:grid-cols-4 ultra:grid-cols-5 gap-2 sm:gap-3">
            {notes.map((note, index) => {
              const isDragging = dragIndex === index;
              const isDropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index;
              const palette = NOTE_COLORS[note.color] || NOTE_COLORS.default;
              const lines = getNoteLines(note);
              // Пустые строки в превью не показываем: на карточке они выглядели бы
              // случайными пропусками, а места на ней и так немного
              const filled = lines.filter(line => line.text.trim());
              const images = lines.filter(isImageLine);
              const hiddenItems = filled.length - PREVIEW_ITEMS;
              const blurClass = note.blurred ? 'blur-[5px] select-none' : '';
              // Эту карточку несут пальцем; эта — под ней, на её место и встанет
              const carried = touchDrag?.index === index;
              const isTouchTarget = touchDrag?.overIndex === index && touchDrag.overIndex !== touchDrag.index;

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
                </>
              );

              return (
                <div
                  key={note.id}
                  // Хук для тем: в Handwriting карточка становится листком из блокнота
                  data-card="note"
                  // Индекс в разметке: по нему находится карточка под пальцем
                  data-note-index={index}
                  // Тащить можно за любое место карточки; обычный клик по-прежнему открывает заметку
                  draggable
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
                  className={`aspect-[4/3] sm:aspect-square self-start min-h-0 overflow-hidden rounded-lg border p-1.5 sm:p-3 flex flex-col cursor-pointer group ${
                    isDragging ? 'opacity-40 transition duration-150' : carried ? 'shadow-xl' : 'lift'
                  } ${darkMode ? palette.dark : palette.light} ${
                    isDropTarget || isTouchTarget || fileOverId === note.id ? 'ring-2 ring-green-600' : ''
                  }`}
                >
                  {isMobile ? (
                    /* Обложка: пустая плитка с названием в правом нижнем
                       углу. Превью строк на плитке в пол-экрана всё равно
                       обрывалось на второй, а название — то, по чему заметку
                       узнают. Служебное разнесено по верхним углам: пометки
                       слева, удаление справа */
                    <div className="relative flex-1 min-h-0">
                      {/* Дату с обложки убрали: заметку ищут по названию, а
                          не по времени правки, и на плитке она только шумела */}
                      <div className="absolute top-0 left-0 flex items-center gap-1 min-w-0">
                        {flags}
                      </div>

                      {/* Удаление ушло наверх: низ теперь занят названием */}
                      <div className="absolute top-0 right-0 flex items-center">
                        {controls}
                      </div>

                      {/* Название прижато к правому нижнему углу и набрано
                          по правому краю: длинное занимает две строки и
                          дорастает влево, короткое так и остаётся в углу */}
                      <div className="absolute bottom-0 right-0 left-2 flex justify-end pointer-events-none">
                        <span className={`note-cover-title text-xs text-right leading-snug line-clamp-2 ${
                          note.title
                            ? darkMode ? 'text-gray-100' : 'text-gray-800'
                            : darkMode ? 'text-gray-600' : 'text-gray-300'
                        }`}>
                          {note.title || 'Untitled'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 mb-1">
                        {note.title ? (
                          <h3 className={`flex-1 min-w-0 text-xs sm:text-sm font-medium truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                            {note.title}
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
          deleteNote={deleteNote}
          toggleNoteBlur={toggleNoteBlur}
          onClose={() => setExpandedNoteId(null)}
          darkMode={darkMode}
        />
      )}
    </>
  );
}
