import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Eye, EyeOff, Palette, AlignLeft, ListTodo, List, Image as ImageIcon, Trash2 } from 'lucide-react';
import { NOTE_COLORS, NOTE_MODES } from '../constants';
import { compressImage } from '../utils/imageCompression';

const MODE_ICONS = { text: AlignLeft, todo: ListTodo, bullet: List };

export default function NoteModal({
  note,
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
  onClose,
  darkMode
}) {
  const [openMenu, setOpenMenu] = useState(null); // 'color' | 'mode'
  const [newItem, setNewItem] = useState('');
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

  const images = note.images || [];

  // Общий путь для всех способов добавить картинку: кнопка, drag & drop и вставка из буфера
  const attachFiles = async (files) => {
    const picked = files.filter(f => f.type.startsWith('image/'));
    if (picked.length === 0) return;
    setIsUploading(true);
    try {
      const compressed = await Promise.all(picked.map(file => compressImage(file)));
      addNoteImages(note.id, compressed);
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
  const mode = note.mode || 'text';
  const ModeIcon = MODE_ICONS[mode] || AlignLeft;
  const items = note.items || [];

  const mutedText = darkMode ? 'text-gray-500' : 'text-gray-400';
  const iconHover = darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600';
  const menuSurface = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200';

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    addNoteItem(note.id, newItem);
    setNewItem('');
  };

  const handleDelete = () => {
    deleteNote(note.id);
    onClose();
  };

  const body = mode === 'text' ? (
    <textarea
      value={note.content}
      onChange={e => updateNote(note.id, e.target.value)}
      onClick={() => note.blurred && toggleNoteBlur(note.id)}
      readOnly={!!note.blurred}
      placeholder="Write a note..."
      autoFocus={!note.blurred}
      className={`w-full flex-1 min-h-[50vh] text-sm leading-relaxed resize-none focus:outline-none bg-transparent transition ${
        darkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
      } ${note.blurred ? 'blur-[5px] select-none cursor-pointer' : ''}`}
    />
  ) : (
    <div className="flex-1 flex flex-col min-h-[50vh]">
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2.5 group/item">
            {mode === 'todo' ? (
              <input
                type="checkbox"
                checked={!!item.checked}
                onChange={() => updateNoteItem(note.id, item.id, { checked: !item.checked })}
                className={`w-4 h-4 cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
                  item.checked ? 'animate-check-pop' : ''
                }`}
              />
            ) : (
              <span className={`w-1 h-1 rounded-full flex-shrink-0 mx-[6px] ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`} />
            )}

            <input
              type="text"
              value={item.text}
              onChange={e => updateNoteItem(note.id, item.id, { text: e.target.value })}
              className={`flex-1 min-w-0 text-sm py-0.5 bg-transparent focus:outline-none transition-colors duration-200 ${
                item.checked
                  ? darkMode ? 'text-gray-500' : 'text-gray-400'
                  : darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}
            />

            <button
              onClick={() => deleteNoteItem(note.id, item.id)}
              title="Remove item"
              className={`p-1.5 sm:p-0.5 rounded opacity-0 group-hover/item:opacity-100 press-icon flex-shrink-0 ${mutedText} hover:text-red-500`}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 mt-1">
        <Plus size={13} className={`flex-shrink-0 mx-[2px] ${mutedText}`} />
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddItem()}
          onBlur={handleAddItem}
          placeholder={mode === 'todo' ? 'Add task...' : 'Add item...'}
          autoFocus
          className={`flex-1 min-w-0 text-sm py-0.5 bg-transparent focus:outline-none ${
            darkMode ? 'text-white placeholder-gray-600' : 'placeholder-gray-300'
          }`}
        />
      </div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      onDragOver={e => {
        // Перетаскивание файла куда угодно поверх открытой заметки — это добавление картинки,
        // иначе браузер просто откроет файл вместо окна
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={e => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragOver(false);
      }}
      onDrop={handleImageDrop}
      className="fixed inset-0 z-40 bg-black bg-opacity-40 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
    >
      {/* Клик внутри окна не должен закрывать его */}
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-2xl my-auto rounded-xl border shadow-xl flex flex-col animate-dialog-in transition ${
          darkMode ? palette.dark : palette.light
        } ${isDragOver ? 'ring-2 ring-green-600' : ''}`}
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

          {/* Тип заметки */}
          <div className="relative flex-shrink-0" ref={openMenu === 'mode' ? menuRef : null}>
            <button
              onClick={() => setOpenMenu(prev => (prev === 'mode' ? null : 'mode'))}
              title="Note type"
              className={`p-2 sm:p-1 rounded press-icon ${mutedText} ${iconHover}`}
            >
              <ModeIcon size={16} />
            </button>

            {openMenu === 'mode' && (
              <div className={`absolute z-20 top-full mt-1 right-0 py-1 rounded-lg border shadow-lg w-36 origin-top-right animate-pop-in ${menuSurface}`}>
                {NOTE_MODES.map(({ key, label }) => {
                  const Icon = MODE_ICONS[key];
                  const active = mode === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setNoteMode(note.id, key);
                        setOpenMenu(null);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition ${
                        active
                          ? darkMode ? 'text-green-400' : 'text-green-700'
                          : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={13} className="flex-shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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

        <div className="flex-1 flex flex-col p-4 pt-2">
          {mode !== 'text' && note.blurred ? (
            <div onClick={() => toggleNoteBlur(note.id)} className="flex-1 flex flex-col cursor-pointer">
              <div className="flex-1 flex flex-col blur-[5px] select-none pointer-events-none">
                {body}
              </div>
            </div>
          ) : (
            body
          )}
        </div>

        {(images.length > 0 || isUploading) && (
          <div className="px-4 pb-4">
            <div className={`grid grid-cols-4 sm:grid-cols-6 gap-2 ${note.blurred ? 'blur-[5px] select-none pointer-events-none' : ''}`}>
              {images.map((img, index) => (
                <div key={index} className="relative group/img">
                  <img
                    src={img}
                    alt={`Attachment ${index + 1}`}
                    onClick={() => setViewerIndex(index)}
                    className="w-full aspect-square object-cover rounded-lg cursor-zoom-in transition duration-150 hover:brightness-95"
                  />
                  <button
                    onClick={() => deleteNoteImage(note.id, index)}
                    title="Remove image"
                    className="absolute top-1 right-1 p-1.5 sm:p-1 rounded-full bg-black/55 text-white opacity-0 group-hover/img:opacity-100 press-icon"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className={`aspect-square rounded-lg border border-dashed flex items-center justify-center text-[11px] animate-pulse ${
                  darkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'
                }`}>
                  Adding...
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`flex justify-end px-4 py-3 border-t ${darkMode ? 'border-gray-700/60' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 text-sm rounded-lg border press ${
              darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Close
          </button>
        </div>
      </div>

      {/* Картинка на весь экран: клик в любом месте — закрыть */}
      {viewerIndex !== null && images[viewerIndex] && (
        <div
          onClick={e => {
            e.stopPropagation();
            setViewerIndex(null);
          }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
        >
          <img
            src={images[viewerIndex]}
            alt={`Attachment ${viewerIndex + 1}`}
            className="max-w-full max-h-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
