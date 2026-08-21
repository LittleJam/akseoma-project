import React from 'react';
import { Plus, X } from 'lucide-react';

export default function Notes({ notes, addNote, updateNote, deleteNote, darkMode }) {
  return (
    <div className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl sm:text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Notes
          </h2>
          <button
            onClick={addNote}
            className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 flex items-center gap-2"
          >
            <Plus size={16} /> Add note
          </button>
        </div>

        {notes.length === 0 ? (
          <p className={`text-sm text-center py-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            No notes yet — add your first one
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <div
                key={note.id}
                className={`rounded-lg border p-3 flex flex-col group ${
                  darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {note.updatedAt}
                  </span>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition flex-shrink-0 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-red-100'}`}
                  >
                    <X size={14} className={darkMode ? 'text-red-400' : 'text-red-500'} />
                  </button>
                </div>
                <textarea
                  value={note.content}
                  onChange={e => updateNote(note.id, e.target.value)}
                  placeholder="Write a note..."
                  rows={6}
                  className={`w-full flex-1 text-sm resize-none focus:outline-none bg-transparent ${
                    darkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
                  }`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
