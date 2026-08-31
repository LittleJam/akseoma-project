import React, { useState } from 'react';
import { X, EyeOff } from 'lucide-react';
import { NOTE_COLORS } from '../constants';
import { compressImage } from '../utils/imageCompression';
import { themeIcon } from '../themes';
import NoteModal from './NoteModal';
import PageShell from './PageShell';

const PREVIEW_ITEMS = 6;
const PREVIEW_IMAGES = 3;

export default function Notes({
  notes,
  addNote,
  updateNote,
  updateNoteTitle,
  setNoteColor,
  setNoteMode,
  addNoteItem,
  updateNoteItem,
  deleteNoteItem,
  addNoteImages,
  deleteNoteImage,
  deleteNote,
  toggleNoteBlur,
  reorderNotes,
  darkMode,
  theme
}) {
  const AddIcon = themeIcon(theme, 'add');
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  // id заметки, над которой держат перетаскиваемый файл
  const [fileOverId, setFileOverId] = useState(null);

  // Ищем заметку в списке каждый раз, чтобы окно показывало свежие правки,
  // а удаление заметки закрывало окно само
  const expandedNote = notes.find(n => n.id === expandedId) || null;

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
        addNoteImages(noteId, compressed);
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
          // а не растягиваем плитки: иначе три штуки раздуваются на пол-экрана
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 wide:grid-cols-4 ultra:grid-cols-5 gap-3">
            {notes.map((note, index) => {
              const isDragging = dragIndex === index;
              const isDropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index;
              const palette = NOTE_COLORS[note.color] || NOTE_COLORS.default;
              const mode = note.mode || 'text';
              const items = note.items || [];
              const images = note.images || [];
              const hiddenItems = items.length - PREVIEW_ITEMS;
              const blurClass = note.blurred ? 'blur-[5px] select-none' : '';

              return (
                <div
                  key={note.id}
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
                  onClick={() => setExpandedId(note.id)}
                  className={`aspect-square self-start min-h-0 overflow-hidden rounded-lg border p-3 flex flex-col cursor-pointer group ${
                    isDragging ? 'opacity-40 transition duration-150' : 'lift'
                  } ${darkMode ? palette.dark : palette.light} ${
                    isDropTarget || fileOverId === note.id ? 'ring-2 ring-green-600' : ''
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {note.title ? (
                      <h3 className={`flex-1 min-w-0 text-sm font-medium truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        {note.title}
                      </h3>
                    ) : (
                      <span className={`flex-1 min-w-0 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                        Untitled
                      </span>
                    )}

                    {note.blurred && <EyeOff size={12} className={`flex-shrink-0 ${mutedText}`} />}

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      title="Delete note"
                      className={`p-1.5 sm:p-0.5 rounded opacity-0 group-hover:opacity-100 press-icon flex-shrink-0 ${mutedText} hover:text-red-500`}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <span className={`text-[10px] mb-2 ${mutedText}`}>{note.updatedAt}</span>

                  <div className={`flex-1 min-h-0 overflow-hidden ${blurClass}`}>
                    {mode === 'text' ? (
                      note.content?.trim() ? (
                        <p className={`text-sm whitespace-pre-wrap line-clamp-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {note.content}
                        </p>
                      ) : (
                        <p className={`text-sm ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>Empty note</p>
                      )
                    ) : items.length === 0 ? (
                      <p className={`text-sm ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                        {mode === 'todo' ? 'No tasks yet' : 'No items yet'}
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        {items.slice(0, PREVIEW_ITEMS).map(item => (
                          <div key={item.id} className="flex items-center gap-2">
                            {mode === 'todo' ? (
                              /* Отметить пункт можно прямо в превью — окно для этого открывать не нужно */
                              <input
                                type="checkbox"
                                checked={!!item.checked}
                                onClick={e => e.stopPropagation()}
                                onChange={() => updateNoteItem(note.id, item.id, { checked: !item.checked })}
                                disabled={!!note.blurred}
                                className={`w-4 h-4 sm:w-3.5 sm:h-3.5 cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
                                  item.checked ? 'animate-check-pop' : ''
                                }`}
                              />
                            ) : (
                              <span className={`w-1 h-1 rounded-full flex-shrink-0 mx-[5px] ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`} />
                            )}
                            <span className={`flex-1 min-w-0 text-sm truncate transition-colors duration-200 ${
                              item.checked
                                ? darkMode ? 'text-gray-500' : 'text-gray-400'
                                : darkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                        {hiddenItems > 0 && (
                          <p className={`text-[11px] pl-[22px] pt-0.5 ${mutedText}`}>+{hiddenItems} more</p>
                        )}
                      </div>
                    )}
                  </div>

                  {images.length > 0 && (
                    <div className={`grid grid-cols-3 gap-1 mt-2 flex-shrink-0 ${blurClass}`}>
                      {images.slice(0, PREVIEW_IMAGES).map((img, imgIndex) => {
                        const hiddenImages = images.length - PREVIEW_IMAGES;
                        const isLastPreview = imgIndex === PREVIEW_IMAGES - 1;
                        return (
                          <div key={imgIndex} className="relative min-w-0">
                            <img
                              src={img}
                              alt=""
                              draggable={false}
                              className="w-full h-12 object-cover rounded"
                            />
                            {isLastPreview && hiddenImages > 0 && (
                              <span className="absolute inset-0 rounded bg-black/50 text-white text-[11px] flex items-center justify-center">
                                +{hiddenImages}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
          updateNote={updateNote}
          updateNoteTitle={updateNoteTitle}
          setNoteColor={setNoteColor}
          setNoteMode={setNoteMode}
          addNoteItem={addNoteItem}
          updateNoteItem={updateNoteItem}
          deleteNoteItem={deleteNoteItem}
          addNoteImages={addNoteImages}
          deleteNoteImage={deleteNoteImage}
          deleteNote={deleteNote}
          toggleNoteBlur={toggleNoteBlur}
          onClose={() => setExpandedId(null)}
          darkMode={darkMode}
        />
      )}
    </>
  );
}
