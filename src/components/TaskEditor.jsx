import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2, X, Image as ImageIcon, ArrowRightLeft, Tag,
  Bold, Italic, Underline, Code, Palette
} from 'lucide-react';
import { getLabelColor, normalizeLabel } from '../constants';
import Select from './Select';
import { compressImage } from '../utils/imageCompression';
import Modal from './Modal';

// Палитра текста: 25 оттенков, по пять в ряд — хватает и на акценты, и на полутона
const TEXT_COLORS = [
  '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db',
  '#7f1d1d', '#b91c1c', '#ef4444', '#f87171', '#fecaca',
  '#7c2d12', '#c2410c', '#f59e0b', '#fbbf24', '#fde68a',
  '#14532d', '#15803d', '#16a34a', '#4ade80', '#bbf7d0',
  '#1e3a8a', '#2563eb', '#7c3aed', '#db2777', '#f472b6'
];

// Описание хранится как HTML. Старые задачи лежат простым текстом — переносим их
const toEditorHtml = (value) => {
  const text = typeof value === 'string' ? value : (value?.content || '');
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
};

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
  projectTasks = [],
  knownLabels = [],
  onMoveToProject
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(toEditorHtml(task.description));
  const [priority, setPriority] = useState(task.priority);
  const [images, setImages] = useState(task.images || []);
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [parentTaskId, setParentTaskId] = useState('');
  const editorRef = useRef(null);
  const [labels, setLabels] = useState(task.labels || []);
  const [newLabel, setNewLabel] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const otherProjects = (projects || []).filter(p => p.id !== currentProjectId);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [targetColumnId, setTargetColumnId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Открытая на весь экран картинка вложения; null — просмотрщик закрыт
  const [viewerIndex, setViewerIndex] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorPickerRef = useRef(null);
  // Список уже существующих лейблов проекта: выбрать из него быстрее и надёжнее,
  // чем вспоминать и набирать заново — иначе плодятся «BUG» и «Bug»
  const [labelListOpen, setLabelListOpen] = useState(false);
  const [labelActiveIndex, setLabelActiveIndex] = useState(-1);
  const labelInputRef = useRef(null);

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

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      title !== task.title ||
      description !== toEditorHtml(task.description) ||
      priority !== task.priority ||
      JSON.stringify(images) !== JSON.stringify(task.images || []) ||
      JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || []) ||
      JSON.stringify(labels) !== JSON.stringify(task.labels || []) ||
      Boolean(parentTaskId);

    onUnsavedChange(hasChanges);
  }, [title, description, priority, images, subtasks, labels, parentTaskId, task, onUnsavedChange]);

  // Содержимое редактора кладём в него один раз: дальше им управляет сам браузер,
  // иначе курсор прыгал бы в начало на каждом нажатии
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = toEditorHtml(task.description);
    setDescription(toEditorHtml(task.description));
  }, [task.id]);

  // Все кнопки панели работают с выделением, а не со всем описанием сразу
  const runCommand = (command, value = null) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    try {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(command, false, value);
    } catch (error) {
      console.error('Formatting error:', error);
    }
    setDescription(editor.innerHTML);
  };

  const addLabel = (value) => {
    const label = normalizeLabel(value || newLabel);
    if (!label || labels.includes(label)) {
      setNewLabel('');
      return;
    }
    setLabels([...labels, label]);
    setNewLabel('');
  };

  const removeLabel = (label) => setLabels(labels.filter(l => l !== label));

  // Один рост и одна поверхность на все контролы панели форматирования: и списки,
  // и кнопки-иконки. Иконки одного кегля, кнопки — квадраты, поэтому ряд ровный
  const toolbarSurface = darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-200';
  const toolbarSelectClass = `h-8 px-2.5 text-sm rounded-lg ${toolbarSurface}`;
  const toolbarButtonClass = `h-8 w-8 flex items-center justify-center rounded-lg press ${toolbarSurface}`;
  const TOOLBAR_ICON = 15;

  // Показываем то, чего на задаче ещё нет, и сужаем список по мере набора
  const labelQuery = newLabel.trim().toLowerCase();
  const labelSuggestions = knownLabels
    .filter(l => !labels.includes(l))
    .filter(l => !labelQuery || l.toLowerCase().includes(labelQuery));

  const pickLabel = (label) => {
    addLabel(label);
    setLabelActiveIndex(-1);
    // Фокус остаётся в поле: обычно лейблов вешают несколько подряд
    labelInputRef.current?.focus();
  };

  const handleLabelKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!labelSuggestions.length) return;
      e.preventDefault();
      setLabelListOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setLabelActiveIndex(prev => {
        const next = prev + step;
        if (next < 0) return labelSuggestions.length - 1;
        if (next >= labelSuggestions.length) return 0;
        return next;
      });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // Выбранная стрелками подсказка важнее набранного текста
      pickLabel(labelActiveIndex >= 0 ? labelSuggestions[labelActiveIndex] : newLabel);
      return;
    }
    if (e.key === 'Escape') {
      setLabelListOpen(false);
      setLabelActiveIndex(-1);
    }
  };

  // Фокус ушёл из поля вместе со списком — дописываем набранное и закрываем
  const handleLabelBlur = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    addLabel();
    setLabelListOpen(false);
    setLabelActiveIndex(-1);
  };

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

  // Подзадача хранит только заголовок и галочку, поэтому остальное при переезде пропадёт.
  // Считаем это по текущему состоянию редактора, а не по сохранённой задаче
  const historyCount = (task.history || []).length;
  const lostParts = [
    description.trim() ? 'the description' : null,
    images.length ? `${images.length} image${images.length > 1 ? 's' : ''}` : null,
    historyCount ? `the history (${historyCount} ${historyCount > 1 ? 'entries' : 'entry'})` : null
  ].filter(Boolean);

  const lostWarning = lostParts.length
    ? `${lostParts.join(', ').replace(/, ([^,]*)$/, ' and $1')} will be lost — a subtask keeps only its title.`
    : '';

  const handleSave = () => {
    const now = new Date();
    const changes = {};
    if (title !== task.title) changes.title = title;
    if (priority !== task.priority) changes.priority = priority;
    if (description !== toEditorHtml(task.description)) changes.description = 'Description changed';
    if (JSON.stringify(images) !== JSON.stringify(task.images || [])) changes.images = `Images: ${images.length}`;
    if (JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || [])) changes.subtasks = `Subtasks: ${subtasks.length}`;
    if (JSON.stringify(labels) !== JSON.stringify(task.labels || [])) changes.labels = labels.length ? labels.join(', ') : 'No labels';

    let newHistory = task.history || [];
    if (Object.keys(changes).length > 0) {
      newHistory = [...newHistory, {
        timestamp: now.toLocaleString('en-US'),
        action: 'Task edited',
        changes
      }];
    }

    onSave(
      {
        ...task,
        title,
        description: { content: description, editorState: null },
        priority,
        images,
        subtasks,
        labels,
        history: newHistory
      },
      false,
      // Родителя выбрали — задача уедет к нему тем же сохранением
      parentTaskId
    );
  };

  // Редактор — окно поверх доски, а не отдельная страница: доска остаётся видна
  // за фоном, закрытие возвращает ровно туда, откуда открыли
  return (
    <Modal
      size="lg"
      sheet
      onClose={onClose}
      closeOnBackdrop={false}
      // Пока открыта картинка, Escape закрывает её, а не редактор под ней
      closeOnEsc={viewerIndex === null}
      /* На телефоне редактор занимает экран целиком: рамка, скругления и поля
         вокруг съедали бы ширину, которой в форме и так впритык */
      panelClassName={`max-h-[100dvh] sm:max-h-[calc(100vh-3rem)] overflow-hidden rounded-none sm:rounded-lg border-0 sm:border shadow-xl ${bgClass} ${cardBorderClass}`}
    >
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
                {/* Панель форматирования: всё применяется к выделенному тексту.
                    Контролы одного роста и стиля, поэтому ряд не «пляшет» */}
                <div className={`flex items-center gap-1.5 flex-wrap pb-3 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <Select
                    value=""
                    onChange={e => e.target.value && runCommand('formatBlock', e.target.value)}
                    options={[
                      { value: '', label: 'Style' },
                      { value: '<p>', label: 'Normal text' },
                      { value: '<h2>', label: 'Heading' },
                      { value: '<h3>', label: 'Subheading' },
                      { value: '<blockquote>', label: 'Quote' },
                      { value: '<pre>', label: 'Code block' }
                    ]}
                    darkMode={darkMode}
                    placeholder="Style"
                    ariaLabel="Text style"
                    wrapperClassName="w-36"
                    className={toolbarSelectClass}
                  />

                  <Select
                    value=""
                    onChange={e => e.target.value && runCommand('fontSize', e.target.value)}
                    options={[
                      { value: '', label: 'Size' },
                      { value: '2', label: 'Small' },
                      { value: '3', label: 'Normal' },
                      { value: '5', label: 'Large' },
                      { value: '6', label: 'Huge' }
                    ]}
                    darkMode={darkMode}
                    placeholder="Size"
                    ariaLabel="Font size"
                    wrapperClassName="w-28"
                    className={toolbarSelectClass}
                  />

                  {[
                    { command: 'bold', Icon: Bold, title: 'Bold (⌘B)' },
                    { command: 'italic', Icon: Italic, title: 'Italic (⌘I)' },
                    { command: 'underline', Icon: Underline, title: 'Underline (⌘U)' }
                  ].map(({ command, Icon, title }) => (
                    <button
                      key={command}
                      type="button"
                      title={title}
                      aria-label={title}
                      // Не отдаём фокус кнопке: выделение остаётся в поле, а панель — на экране
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => runCommand(command)}
                      className={toolbarButtonClass}
                    >
                      <Icon size={TOOLBAR_ICON} />
                    </button>
                  ))}

                  <Select
                    value=""
                    onChange={e => e.target.value && runCommand(e.target.value)}
                    options={[
                      { value: '', label: 'List' },
                      { value: 'insertUnorderedList', label: 'Bulleted list' },
                      { value: 'insertOrderedList', label: 'Numbered list' }
                    ]}
                    darkMode={darkMode}
                    placeholder="List"
                    ariaLabel="List type"
                    wrapperClassName="w-32"
                    className={toolbarSelectClass}
                  />

                  <button
                    type="button"
                    title="Inline code"
                    aria-label="Inline code"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => runCommand('fontName', 'monospace')}
                    className={toolbarButtonClass}
                  >
                    <Code size={TOOLBAR_ICON} />
                  </button>

                  <div className="relative" ref={colorPickerRef}>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setColorPickerOpen(prev => !prev)}
                      title="Text color"
                      aria-label="Text color"
                      aria-haspopup="true"
                      aria-expanded={colorPickerOpen}
                      className={toolbarButtonClass}
                    >
                      <Palette size={TOOLBAR_ICON} />
                    </button>

                    {colorPickerOpen && (
                      <div className={`absolute z-20 top-full mt-1 left-0 w-[188px] p-2 rounded-lg border shadow-lg origin-top-left animate-pop-in ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <div className={`text-xs mb-2 px-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Text color</div>
                        {/* 25 оттенков по пять в ряд */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {TEXT_COLORS.map(hex => (
                            <button
                              key={hex}
                              type="button"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => {
                                runCommand('foreColor', hex);
                                setColorPickerOpen(false);
                              }}
                              title={hex}
                              style={{ backgroundColor: hex }}
                              className={`w-6 h-6 rounded-full flex-shrink-0 border transition duration-150 hover:scale-110 active:scale-90 ${
                                darkMode ? 'border-gray-600' : 'border-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Само поле: обычный редактируемый блок, поэтому форматируется выделение */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Description"
                  data-placeholder="Add description..."
                  onInput={e => setDescription(e.currentTarget.innerHTML)}
                  onBlur={e => setDescription(e.currentTarget.innerHTML)}
                  className={`task-description w-full min-h-[9rem] p-3 border ${borderClass} rounded-lg focus:outline-none overflow-y-auto ${inputBgClass}`}
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Priority</label>
              <Select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' }
                ]}
                darkMode={darkMode}
                ariaLabel="Priority"
                className={`px-4 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
              />
            </div>

            {/* Labels */}
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium ${labelClass} mb-2`}>
                <Tag size={14} /> Labels
              </label>

              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {labels.map(label => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs rounded-full border ${getLabelColor(label, darkMode)}`}
                    >
                      {label}
                      <button
                        onClick={() => removeLabel(label)}
                        title={`Remove ${label}`}
                        aria-label={`Remove ${label}`}
                        className="p-0.5 rounded-full press-icon"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Лейбл добавляется сам: по Enter, по выбору из списка и при уходе
                  из поля — отдельная кнопка для этого не нужна */}
              <div className="relative" onBlur={handleLabelBlur}>
                <input
                  ref={labelInputRef}
                  type="text"
                  value={newLabel}
                  onChange={e => {
                    setNewLabel(e.target.value);
                    setLabelListOpen(true);
                    setLabelActiveIndex(-1);
                  }}
                  onFocus={() => setLabelListOpen(true)}
                  onKeyDown={handleLabelKeyDown}
                  placeholder="Add label..."
                  role="combobox"
                  aria-expanded={labelListOpen && labelSuggestions.length > 0}
                  aria-autocomplete="list"
                  className={`w-full px-3 py-2 text-sm border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                />

                {labelListOpen && labelSuggestions.length > 0 && (
                  <div className={`absolute z-20 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto p-1 rounded-lg border shadow-lg origin-top animate-pop-in ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    {labelSuggestions.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        // Фокус не уводим: список остаётся открытым, можно взять ещё один
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => pickLabel(label)}
                        onMouseEnter={() => setLabelActiveIndex(i)}
                        className={`w-full flex items-center text-left px-2 py-1.5 rounded-md ${
                          i === labelActiveIndex ? (darkMode ? 'bg-gray-600' : 'bg-gray-100') : ''
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 text-xs rounded-full border ${getLabelColor(label, darkMode)}`}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                          className="w-5 h-5 sm:w-4 sm:h-4 cursor-pointer flex-shrink-0"
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
                                ? darkMode ? 'text-gray-500' : 'text-gray-400'
                                : darkMode ? 'text-gray-200' : 'text-gray-700'
                            }`}
                          >
                            {subtask.title}
                          </span>
                        )}
                        <button
                          onClick={() => deleteSubtask(subtask.id)}
                          className={`p-1.5 sm:p-0.5 rounded opacity-0 group-hover:opacity-100 flex-shrink-0 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-red-100'}`}
                        >
                          <X size={13} className={darkMode ? 'text-red-400' : 'text-red-500'} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Подзадача добавляется сама: по Enter — чтобы сразу писать следующую,
                    и при уходе из поля — чтобы набранное не пропало вместе с кнопкой */}
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addSubtask();
                    if (e.key === 'Escape') setNewSubtaskTitle('');
                  }}
                  onBlur={addSubtask}
                  placeholder="Add subtask..."
                  className={`w-full px-2 py-1.5 text-sm border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                />
              </div>
            </div>

            {/* Move to another project */}
            {otherProjects.length > 0 && (
              <div>
                <label className={`block text-sm font-medium ${labelClass} mb-2`}>Move to project</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={targetProjectId}
                    onChange={e => handleTargetProjectChange(e.target.value)}
                    options={[
                      { value: '', label: 'Select project...' },
                      ...otherProjects.map(p => ({ value: p.id, label: p.name }))
                    ]}
                    darkMode={darkMode}
                    ariaLabel="Target project"
                    wrapperClassName="flex-1 min-w-0"
                    className={`px-3 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
                  />
                  <div className="flex gap-2">
                    {targetProjectId && (
                      <Select
                        value={targetColumnId}
                        onChange={e => setTargetColumnId(e.target.value)}
                        options={getProjectColumns(targetProjectId).map(col => ({ value: col.id, label: col.title }))}
                        darkMode={darkMode}
                        ariaLabel="Target column"
                        wrapperClassName="flex-1 min-w-0"
                        className={`px-3 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
                      />
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

            {/* Превратить задачу в подзадачу другой задачи */}
            {projectTasks.length > 0 && (
              <div>
                <label className={`block text-sm font-medium ${labelClass} mb-2`}>Make it a subtask</label>
                <Select
                  value={parentTaskId}
                  onChange={e => setParentTaskId(e.target.value)}
                  options={[
                    { value: '', label: 'Keep it a task' },
                    ...projectTasks.map(t => ({
                      value: t.id,
                      label: `${t.taskId ? `${t.taskId} · ` : ''}${t.title}`
                    }))
                  ]}
                  darkMode={darkMode}
                  searchable
                  searchPlaceholder="Search tasks..."
                  ariaLabel="Parent task"
                  className={`px-3 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
                />
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {parentTaskId
                    ? 'On save the task becomes a subtask of the selected one; its own subtasks move along with it.'
                    : 'Pick a parent task and press Save to move this task under it.'}
                </p>

                {/* Предупреждаем ровно о том, что действительно пропадёт */}
                {parentTaskId && lostWarning && (
                  <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    {lostWarning.charAt(0).toUpperCase() + lostWarning.slice(1)}
                  </p>
                )}
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
                        {/* Превью обрезано по квадрату, поэтому картинку нужно уметь
                            открыть целиком — иначе всё, что не влезло в 128px, видно
                            только после скачивания */}
                        <img
                          src={img}
                          alt={`Task image ${idx + 1}`}
                          onClick={() => setViewerIndex(idx)}
                          className="w-full h-32 object-cover rounded-lg cursor-zoom-in transition duration-150 hover:brightness-95"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          title="Remove image"
                          aria-label="Remove image"
                          /* На телефоне наведения нет — крестик виден сразу */
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
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
          <div className={`flex items-center gap-3 p-4 sm:p-6 sm:pt-4 flex-shrink-0 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            {/* Удаление стоит отдельно слева, обычные действия — справа */}
            <button
              onClick={() => {
                if (confirm('Delete this task?')) {
                  onDelete(task.id);
                }
              }}
              title="Delete task"
              aria-label="Delete task"
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 press"
            >
              <Trash2 size={18} />
            </button>

            <div className="flex-1" />

            <button
              onClick={onClose}
              className={`min-w-[110px] px-6 py-2 border ${borderClass} rounded-lg font-medium press ${darkMode ? 'text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUploading}
              // Рамка прозрачная, чтобы кнопка совпадала по высоте с Cancel
              className="min-w-[110px] px-6 py-2 border border-transparent bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed press"
            >
              {isUploading ? 'Please wait...' : 'Save'}
            </button>
          </div>

      {/* Картинка на весь экран: клик в любом месте — закрыть */}
      {viewerIndex !== null && images[viewerIndex] && (
        <Modal
          onClose={() => setViewerIndex(null)}
          layer="viewer"
          size="full"
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
          {/* self-center обязателен: панель окна — flex-колонка, и без него
              картинка растягивалась во всю её ширину, во сколько бы раз это ни
              было больше её собственного размера. Теперь она открывается как
              есть и ужимается, только если не влезает в экран */}
          <img
            src={images[viewerIndex]}
            alt={`Task image ${viewerIndex + 1}`}
            className="self-center max-w-full max-h-[85vh] rounded-lg"
          />
        </Modal>
      )}
    </Modal>
  );
}