import React, { useState } from 'react';
import { Edit2, X, Plus } from 'lucide-react';

export default function Wishlist({ wishlist, addWishlistItem, deleteWishlistItem, toggleWishlistItem, editWishlistItem, darkMode }) {
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      addWishlistItem(newItem);
      setNewItem('');
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditingText(item.title);
  };

  const saveEditing = () => {
    if (editingText.trim()) {
      editWishlistItem(editingId, editingText);
    }
    setEditingId(null);
    setEditingText('');
  };

  return (
    <div className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto p-8">
        <h2 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          ✨ Wishlist
        </h2>

        <div className={`rounded-lg p-6 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="space-y-2 mb-4">
            {wishlist.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleWishlistItem(item.id)}
                  className="w-5 h-5 cursor-pointer flex-shrink-0"
                />
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onBlur={saveEditing}
                    onKeyPress={e => e.key === 'Enter' && saveEditing()}
                    autoFocus
                    className={`flex-1 px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'}`}
                  />
                ) : (
                  <span
                    onClick={() => startEditing(item)}
                    className={`flex-1 cursor-text ${
                      item.completed
                        ? darkMode ? 'line-through text-gray-500' : 'line-through text-gray-400'
                        : darkMode ? 'text-gray-100' : 'text-gray-800'
                    }`}
                  >
                    {item.title}
                  </span>
                )}
                <button
                  onClick={() => startEditing(item)}
                  className={`p-1 rounded flex-shrink-0 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-green-100'}`}
                >
                  <Edit2 size={14} className={darkMode ? 'text-green-400' : 'text-green-600'} />
                </button>
                <button
                  onClick={() => deleteWishlistItem(item.id)}
                  className={`p-1 rounded flex-shrink-0 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-red-100'}`}
                >
                  <X size={16} className={darkMode ? 'text-red-400' : 'text-red-600'} />
                </button>
              </div>
            ))}
            {wishlist.length === 0 && (
              <p className={`text-sm text-center py-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Пока пусто — добавьте первое желание
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAdd()}
              placeholder="Добавить в вишлист..."
              className={`flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:border-green-500 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
              }`}
            />
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-green-800 text-white rounded hover:bg-green-900"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
