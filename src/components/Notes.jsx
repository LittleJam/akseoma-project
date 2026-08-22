import React, { useState } from 'react';
import { Plus, X, GripVertical, Eye, EyeOff } from 'lucide-react';

export default function Notes({ notes, addNote, updateNote, deleteNote, toggleNoteBlur, reorderNotes, darkMode }) {
  // id заметки, за которую сейчас «взялись» — draggable включается только при захвате за ручку,
  // иначе нельзя было бы выделять текст внутри заметки
  const [handleGrabbedId, setHandleGrabbedId] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('noteIndex', index.toString());
  };

  const handleDragOver = (e, index) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('noteIndex'), 10);
    if (!Number.isNaN(fromIndex)) reorderNotes(fromIndex, index);
    resetDrag();
  };

  const resetDrag = () => {
    setHandleGrabbedId(null);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const mutedText = darkMode ? 'text-gray-500' : 'text-gray-400';
  const iconHover = darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600';

  return (
    <div className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        <div className={`flex items-center justify-between mb-6 pb-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <h2 className={`text-xl sm:text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Notes
          </h2>
          <button
            onClick={addNote}
            className={`flex items-center gap-1.5 text-sm px-2 py-1 -mr-2 rounded press ${mutedText} ${iconHover}`}
          >
            <Plus size={16} /> New note
          </button>
        </div>

        {notes.length === 0 ? (
          <p className={`text-sm text-center py-12 ${mutedText}`}>
            No notes yet — add your first one
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.map((note, index) => {
              const isDragging = dragIndex === index;
              const isDropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

              return (
                <div
                  key={note.id}
                  draggable={handleGrabbedId === note.id}
                  onDragStart={e => handleDragStart(e, index)}
                  onDragEnd={resetDrag}
                  onDragOver={e => handleDragOver(e, index)}
                  onDrop={e => handleDrop(e, index)}
                  className={`rounded-lg border p-3 flex flex-col group ${
                    isDragging ? 'opacity-40 transition duration-150' : 'lift'
                  } ${
                    darkMode ? 'border-gray-800 bg-gray-800/40' : 'border-gray-200 bg-white'
                  } ${
                    isDropTarget ? (darkMode ? 'border-green-600 ring-1 ring-green-600' : 'border-green-600 ring-1 ring-green-600') : ''
                  }`}
                >
                  <div className="flex items-center gap-1 mb-2">
                    <span
                      onMouseDown={() => setHandleGrabbedId(note.id)}
                      onMouseUp={() => setHandleGrabbedId(null)}
                      title="Drag to reorder"
                      className={`-ml-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition ${mutedText} ${iconHover}`}
                    >
                      <GripVertical size={14} />
                    </span>
                    <span className={`text-[10px] flex-1 truncate ${mutedText}`}>
                      {note.updatedAt}
                    </span>
                    <button
                      onClick={() => toggleNoteBlur(note.id)}
                      title={note.blurred ? 'Show text' : 'Blur text'}
                      className={`p-0.5 rounded press-icon flex-shrink-0 ${mutedText} ${iconHover} ${
                        note.blurred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {note.blurred ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      title="Delete note"
                      className={`p-0.5 rounded opacity-0 group-hover:opacity-100 press-icon flex-shrink-0 ${mutedText} hover:text-red-500`}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Заблюренную заметку не даём редактировать вслепую — клик по тексту снимает блюр */}
                  <textarea
                    value={note.content}
                    onChange={e => updateNote(note.id, e.target.value)}
                    onClick={() => note.blurred && toggleNoteBlur(note.id)}
                    readOnly={!!note.blurred}
                    placeholder="Write a note..."
                    rows={6}
                    className={`w-full flex-1 text-sm resize-none focus:outline-none bg-transparent transition ${
                      darkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
                    } ${note.blurred ? 'blur-[5px] select-none cursor-pointer' : ''}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
