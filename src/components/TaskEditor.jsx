import React, { useState, useEffect } from 'react';
import { Trash2, X, Image as ImageIcon, Plus } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

const TEXT_COLORS = ['#000000', '#6b7280', '#ef4444', '#f59e0b', '#16a34a', '#2563eb', '#7c3aed', '#db2777'];

const getDescriptionText = (description) =>
  typeof description === 'string' ? description : (description?.content || '');

export default function TaskEditor({ task, onSave, onClose, onDelete, darkMode, onUnsavedChange }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(getDescriptionText(task.description));
  const [priority, setPriority] = useState(task.priority);
  const [images, setImages] = useState(task.images || []);
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [textFormat, setTextFormat] = useState(task.description?.editorState || {
    fontSize: '16px',
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000'
  });

  // Отслеживание изменений
  useEffect(() => {
    const hasChanges =
      title !== task.title ||
      description !== getDescriptionText(task.description) ||
      priority !== task.priority ||
      JSON.stringify(images) !== JSON.stringify(task.images || []) ||
      JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || []);

    onUnsavedChange(hasChanges);
  }, [title, description, priority, images, subtasks, task, onUnsavedChange]);

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (id) => {
    setSubtasks(subtasks.map(s => (s.id === id ? { ...s, completed: !s.completed } : s)));
  };

  const deleteSubtask = (id) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBorderClass = darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const labelClass = darkMode ? 'text-gray-300' : 'text-gray-700';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-300';
  const inputBgClass = darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900';

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const compressed = await Promise.all(files.map(file => compressImage(file)));
      setImages(prev => [...prev, ...compressed]);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImageDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const compressed = await Promise.all(files.map(file => compressImage(file)));
      setImages(prev => [...prev, ...compressed]);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const now = new Date();
    const changes = {};
    if (title !== task.title) changes.title = title;
    if (priority !== task.priority) changes.priority = priority;
    if (description !== getDescriptionText(task.description)) changes.description = 'Описание изменено';
    if (JSON.stringify(images) !== JSON.stringify(task.images || [])) changes.images = `Изображений: ${images.length}`;
    if (JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || [])) changes.subtasks = `Подзадач: ${subtasks.length}`;

    let newHistory = task.history || [];
    if (Object.keys(changes).length > 0) {
      newHistory = [...newHistory, {
        timestamp: now.toLocaleString('ru-RU'),
        action: 'Отредактирована задача',
        changes
      }];
    }

    onSave({
      ...task,
      title,
      description: { content: description, editorState: textFormat },
      priority,
      images,
      subtasks,
      history: newHistory
    });
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${bgClass}`}>
      <div className="flex-1 flex flex-col overflow-hidden max-w-4xl w-full mx-auto p-8">
        <div className={`flex-1 flex flex-col overflow-hidden rounded-lg border ${cardBorderClass}`}>
          {/* Шапка */}
          <div className={`flex items-center justify-between p-6 pb-4 flex-shrink-0 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-green-600 mb-1">{task.taskId}</div>
              <h2 className={`text-lg font-semibold ${textClass}`}>Редактировать задачу</h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <X size={20} className={textClass} />
            </button>
          </div>

          {/* Содержимое (скроллится) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Заголовок */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Название</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={`w-full px-4 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
              />
            </div>

            {/* Описание с форматированием */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Описание</label>
              <div className={`border ${borderClass} rounded-lg p-3 space-y-3 ${inputBgClass}`}>
                {/* Панель форматирования */}
                <div className={`flex items-center gap-3 flex-wrap pb-3 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <select
                    value={textFormat.fontSize}
                    onChange={e => setTextFormat({ ...textFormat, fontSize: e.target.value })}
                    className={`px-2 py-1 text-sm rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
                  >
                    <option value="12px">12px</option>
                    <option value="14px">14px</option>
                    <option value="16px">16px</option>
                    <option value="18px">18px</option>
                    <option value="20px">20px</option>
                    <option value="24px">24px</option>
                  </select>

                  <button
                    onClick={() => setTextFormat({ ...textFormat, fontWeight: textFormat.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className={`px-3 py-1 text-sm rounded-lg font-bold ${textFormat.fontWeight === 'bold' ? 'bg-green-800 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
                  >
                    Ж
                  </button>

                  <button
                    onClick={() => setTextFormat({ ...textFormat, fontStyle: textFormat.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={`px-3 py-1 text-sm rounded-lg italic ${textFormat.fontStyle === 'italic' ? 'bg-green-800 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
                  >
                    К
                  </button>

                  <div className="flex items-center gap-1.5">
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTextFormat({ ...textFormat, color: c })}
                        title={c}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full flex-shrink-0 transition ${
                          textFormat.color === c
                            ? `ring-2 ring-offset-2 ${darkMode ? 'ring-gray-300 ring-offset-gray-700' : 'ring-gray-500 ring-offset-white'}`
                            : 'opacity-50 hover:opacity-90'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Текстовое поле */}
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Добавить описание..."
                  rows={6}
                  style={{
                    fontSize: textFormat.fontSize,
                    fontWeight: textFormat.fontWeight,
                    fontStyle: textFormat.fontStyle,
                    color: textFormat.color
                  }}
                  className={`w-full p-3 border ${borderClass} rounded-lg focus:outline-none resize-none ${inputBgClass}`}
                />
              </div>
            </div>

            {/* Приоритет */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Приоритет</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className={`w-full px-4 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>

            {/* Подзадачи */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>
                Подзадачи{subtasks.length > 0 ? ` (${subtasks.filter(s => s.completed).length}/${subtasks.length})` : ''}
              </label>
              <div className={`border ${borderClass} rounded-lg p-3 ${inputBgClass}`}>
                {subtasks.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-2 py-1 group">
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={() => toggleSubtask(subtask.id)}
                          className="w-4 h-4 cursor-pointer flex-shrink-0"
                        />
                        <span className={`flex-1 text-sm ${
                          subtask.completed
                            ? darkMode ? 'line-through text-gray-500' : 'line-through text-gray-400'
                            : darkMode ? 'text-gray-200' : 'text-gray-700'
                        }`}>
                          {subtask.title}
                        </span>
                        <button
                          onClick={() => deleteSubtask(subtask.id)}
                          className={`p-0.5 rounded opacity-0 group-hover:opacity-100 flex-shrink-0 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-red-100'}`}
                        >
                          <X size={13} className={darkMode ? 'text-red-400' : 'text-red-500'} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addSubtask()}
                    placeholder="Добавить подзадачу..."
                    className={`flex-1 px-2 py-1.5 text-sm border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                  />
                  <button
                    onClick={addSubtask}
                    className={`p-1.5 rounded-lg ${darkMode ? 'text-green-500 hover:bg-gray-600' : 'text-green-700 hover:bg-gray-100'}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Изображения */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Изображения</label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleImageDrop}
                className={`border-2 border-dashed ${borderClass} rounded-lg p-6`}
              >
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className={`text-center ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} p-4 rounded-lg`}>
                    <ImageIcon size={32} className={`mx-auto mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                    <p className={`font-medium ${labelClass}`}>
                      {isUploading ? 'Обработка изображений...' : 'Загрузить или перетащить изображения'}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Поддерживается несколько файлов</p>
                  </div>
                </label>

                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="Task" className="w-full h-32 object-cover rounded-lg" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* История */}
            {task.history && task.history.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`text-sm font-medium ${labelClass} mb-2 hover:underline`}
                >
                  {showHistory ? '▼' : '▶'} История изменений ({task.history.length})
                </button>
                {showHistory && (
                  <div className={`rounded-lg border ${borderClass} p-4 space-y-3 max-h-48 overflow-y-auto`}>
                    {[...task.history].reverse().map((entry, idx) => (
                      <div key={idx} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="font-medium">{entry.action}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{entry.timestamp}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Кнопки действия (всегда видны) */}
          <div className={`flex gap-3 p-6 pt-4 flex-shrink-0 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <button
              onClick={handleSave}
              disabled={isUploading}
              className="flex-1 px-6 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Подождите...' : 'Сохранить'}
            </button>
            <button
              onClick={onClose}
              className={`px-6 py-2 border ${borderClass} rounded-lg font-medium ${darkMode ? 'text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Отмена
            </button>
            <button
              onClick={() => {
                if (confirm('Удалить эту задачу?')) {
                  onDelete(task.id);
                }
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
