import React, { useState, useEffect, useRef } from 'react';
import { Trash2, X, Image as ImageIcon, Plus, ArrowRightLeft, ChevronDown, SmilePlus } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import { STICKER_GROUPS } from '../constants';

const TEXT_COLORS = [
  { hex: '#000000', name: 'Black' },
  { hex: '#6b7280', name: 'Gray' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f59e0b', name: 'Orange' },
  { hex: '#16a34a', name: 'Green' },
  { hex: '#2563eb', name: 'Blue' },
  { hex: '#7c3aed', name: 'Purple' },
  { hex: '#db2777', name: 'Pink' }
];

const getDescriptionText = (description) =>
  typeof description === 'string' ? description : (description?.content || '');

export default function TaskEditor({
  task,
  onSave,
  onClose,
  onDelete,
  darkMode,
  onUnsavedChange,
  projects,
  currentProjectId,
  getProjectColumns,
  onMoveToProject
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(getDescriptionText(task.description));
  const [priority, setPriority] = useState(task.priority);
  const [images, setImages] = useState(task.images || []);
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const [sticker, setSticker] = useState(task.sticker || '');
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const stickerPickerRef = useRef(null);
  const otherProjects = (projects || []).filter(p => p.id !== currentProjectId);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [targetColumnId, setTargetColumnId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [textFormat, setTextFormat] = useState(task.description?.editorState || {
    fontSize: '16px',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000'
  });
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef(null);

  useEffect(() => {
    if (!colorPickerOpen) return;
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [colorPickerOpen]);

  useEffect(() => {
    if (!stickerPickerOpen) return;
    const handleClickOutside = (e) => {
      if (stickerPickerRef.current && !stickerPickerRef.current.contains(e.target)) {
        setStickerPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stickerPickerOpen]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      title !== task.title ||
      description !== getDescriptionText(task.description) ||
      priority !== task.priority ||
      sticker !== (task.sticker || '') ||
      JSON.stringify(images) !== JSON.stringify(task.images || []) ||
      JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || []);

    onUnsavedChange(hasChanges);
  }, [title, description, priority, images, subtasks, sticker, task, onUnsavedChange]);

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (id) => {
    setSubtasks(subtasks.map(s => (s.id === id ? { ...s, completed: !s.completed } : s)));
  };

  const startEditingSubtask = (subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskText(subtask.title);
  };

  const saveSubtaskEdit = () => {
    if (editingSubtaskText.trim()) {
      setSubtasks(subtasks.map(s => (s.id === editingSubtaskId ? { ...s, title: editingSubtaskText.trim() } : s)));
    }
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
  };

  const deleteSubtask = (id) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleTargetProjectChange = (projectId) => {
    setTargetProjectId(projectId);
    const firstColumn = projectId ? getProjectColumns(projectId)?.[0]?.id : '';
    setTargetColumnId(firstColumn || '');
  };

  const handleMoveToProject = () => {
    if (!targetProjectId || !targetColumnId) return;
    onMoveToProject(task.id, targetProjectId, targetColumnId);
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
    if (description !== getDescriptionText(task.description)) changes.description = 'Description changed';
    if (JSON.stringify(images) !== JSON.stringify(task.images || [])) changes.images = `Images: ${images.length}`;
    if (JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || [])) changes.subtasks = `Subtasks: ${subtasks.length}`;
    if (sticker !== (task.sticker || '')) changes.sticker = 'Sticker changed';

    let newHistory = task.history || [];
    if (Object.keys(changes).length > 0) {
      newHistory = [...newHistory, {
        timestamp: now.toLocaleString('en-US'),
        action: 'Task edited',
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
      sticker,
      history: newHistory
    });
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${bgClass}`}>
      <div className="flex-1 flex flex-col overflow-hidden max-w-4xl w-full mx-auto p-3 sm:p-8">
        <div className={`flex-1 flex flex-col overflow-hidden rounded-lg border ${cardBorderClass}`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 sm:p-6 sm:pb-4 flex-shrink-0 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-green-600 mb-1">{task.taskId}</div>
              <h2 className={`text-lg font-semibold ${textClass}`}>Edit task</h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <X size={20} className={textClass} />
            </button>
          </div>

          {/* Content (scrollable) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Title */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={`w-full px-4 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
              />
            </div>

            {/* Description with formatting */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Description</label>
              <div className={`border ${borderClass} rounded-lg p-3 space-y-3 ${inputBgClass}`}>
                {/* Formatting toolbar */}
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
                    title="Bold"
                    onClick={() => setTextFormat({ ...textFormat, fontWeight: textFormat.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className={`px-3 py-1 text-sm rounded-lg font-bold press ${textFormat.fontWeight === 'bold' ? 'bg-green-800 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
                  >
                    B
                  </button>

                  <button
                    title="Italic"
                    onClick={() => setTextFormat({ ...textFormat, fontStyle: textFormat.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={`px-3 py-1 text-sm rounded-lg italic press ${textFormat.fontStyle === 'italic' ? 'bg-green-800 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
                  >
                    I
                  </button>

                  <button
                    title="Underline"
                    onClick={() => setTextFormat({ ...textFormat, textDecoration: textFormat.textDecoration === 'underline' ? 'none' : 'underline' })}
                    className={`px-3 py-1 text-sm rounded-lg underline press ${textFormat.textDecoration === 'underline' ? 'bg-green-800 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
                  >
                    U
                  </button>

                  <div className="relative" ref={colorPickerRef}>
                    <button
                      type="button"
                      onClick={() => setColorPickerOpen(prev => !prev)}
                      title={`Text color: ${TEXT_COLORS.find(c => c.hex === textFormat.color)?.name || textFormat.color}`}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm press ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
                    >
                      <span
                        className={`w-4 h-4 rounded border ${darkMode ? 'border-gray-400' : 'border-gray-400'}`}
                        style={{ backgroundColor: textFormat.color }}
                      />
                      <ChevronDown size={12} className={darkMode ? 'text-gray-300' : 'text-gray-500'} />
                    </button>

                    {colorPickerOpen && (
                      <div className={`absolute z-20 top-full mt-1 left-0 p-2 rounded-lg border shadow-lg origin-top-left animate-pop-in ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <div className={`text-xs mb-2 px-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Text color</div>
                        <div className="flex items-center gap-1.5">
                          {TEXT_COLORS.map(c => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => {
                                setTextFormat({ ...textFormat, color: c.hex });
                                setColorPickerOpen(false);
                              }}
                              title={c.name}
                              style={{ backgroundColor: c.hex }}
                              className={`w-6 h-6 rounded-full flex-shrink-0 transition duration-150 hover:scale-110 active:scale-90 ${
                                textFormat.color === c.hex
                                  ? `ring-2 ring-offset-2 ${darkMode ? 'ring-gray-300 ring-offset-gray-700' : 'ring-gray-500 ring-offset-white'}`
                                  : 'opacity-60 hover:opacity-100'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={stickerPickerRef}>
                    <button
                      type="button"
                      onClick={() => setStickerPickerOpen(prev => !prev)}
                      title={sticker ? 'Change sticker' : 'Add sticker'}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm press ${
                        sticker ? 'bg-green-800 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-100'
                      }`}
                    >
                      <SmilePlus size={16} />
                      {sticker
                        ? <span className="text-base leading-none">{sticker}</span>
                        : <span className="text-xs">Sticker</span>}
                      <ChevronDown size={12} className={sticker ? 'text-green-100' : darkMode ? 'text-gray-300' : 'text-gray-500'} />
                    </button>

                    {stickerPickerOpen && (
                      <div className={`absolute z-20 top-full mt-1 left-0 p-2 rounded-lg border shadow-lg w-60 origin-top-left animate-pop-in ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <div className="max-h-64 overflow-y-auto pr-0.5 space-y-2">
                          {STICKER_GROUPS.map(group => (
                            <div key={group.label}>
                              <div className={`text-[10px] uppercase tracking-wide mb-1 px-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {group.label}
                              </div>
                              <div className="grid grid-cols-6 gap-1">
                                {group.emojis.map(emoji => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setSticker(emoji);
                                      setStickerPickerOpen(false);
                                    }}
                                    className={`w-8 h-8 flex items-center justify-center text-lg rounded-lg transition duration-150 hover:scale-110 active:scale-90 ${
                                      sticker === emoji
                                        ? darkMode ? 'bg-gray-600 ring-2 ring-green-500' : 'bg-gray-100 ring-2 ring-green-500'
                                        : darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        {sticker && (
                          <button
                            type="button"
                            onClick={() => {
                              setSticker('');
                              setStickerPickerOpen(false);
                            }}
                            className={`w-full mt-2 text-xs py-1 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-100'}`}
                          >
                            Remove sticker
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Text field */}
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add description..."
                  rows={6}
                  style={{
                    fontSize: textFormat.fontSize,
                    fontWeight: textFormat.fontWeight,
                    fontStyle: textFormat.fontStyle,
                    textDecoration: textFormat.textDecoration,
                    color: textFormat.color
                  }}
                  className={`w-full p-3 border ${borderClass} rounded-lg focus:outline-none resize-none ${inputBgClass}`}
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className={`w-full px-4 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Subtasks */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>
                Subtasks{subtasks.length > 0 ? ` (${subtasks.filter(s => s.completed).length}/${subtasks.length})` : ''}
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
                        {editingSubtaskId === subtask.id ? (
                          <input
                            type="text"
                            value={editingSubtaskText}
                            onChange={e => setEditingSubtaskText(e.target.value)}
                            onBlur={saveSubtaskEdit}
                            onKeyPress={e => e.key === 'Enter' && saveSubtaskEdit()}
                            autoFocus
                            className={`flex-1 px-1 py-0.5 text-sm rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'}`}
                          />
                        ) : (
                          <span
                            onClick={() => startEditingSubtask(subtask)}
                            className={`flex-1 text-sm cursor-text ${
                              subtask.completed
                                ? darkMode ? 'line-through text-gray-500' : 'line-through text-gray-400'
                                : darkMode ? 'text-gray-200' : 'text-gray-700'
                            }`}
                          >
                            {subtask.title}
                          </span>
                        )}
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
                    placeholder="Add subtask..."
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

            {/* Move to another project */}
            {otherProjects.length > 0 && (
              <div>
                <label className={`block text-sm font-medium ${labelClass} mb-2`}>Move to project</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={targetProjectId}
                    onChange={e => handleTargetProjectChange(e.target.value)}
                    className={`flex-1 px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                  >
                    <option value="">Select project...</option>
                    {otherProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    {targetProjectId && (
                      <select
                        value={targetColumnId}
                        onChange={e => setTargetColumnId(e.target.value)}
                        className={`flex-1 px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                      >
                        {getProjectColumns(targetProjectId).map(col => (
                          <option key={col.id} value={col.id}>{col.title}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={handleMoveToProject}
                      disabled={!targetProjectId}
                      className={`px-3 py-2 rounded-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${darkMode ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      <ArrowRightLeft size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Images */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Images</label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleImageDrop}
                className={`border-2 border-dashed ${borderClass} rounded-lg p-3 sm:p-6`}
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
                      {isUploading ? 'Processing images...' : 'Upload or drag images here'}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Multiple files supported</p>
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

            {/* History */}
            {task.history && task.history.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`text-sm font-medium ${labelClass} mb-2 hover:underline`}
                >
                  {showHistory ? '▼' : '▶'} History ({task.history.length})
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

          {/* Action buttons (always visible) */}
          <div className={`flex gap-3 p-4 sm:p-6 sm:pt-4 flex-shrink-0 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <button
              onClick={handleSave}
              disabled={isUploading}
              className="flex-1 px-6 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed press"
            >
              {isUploading ? 'Please wait...' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className={`px-6 py-2 border ${borderClass} rounded-lg font-medium ${darkMode ? 'text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this task?')) {
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
