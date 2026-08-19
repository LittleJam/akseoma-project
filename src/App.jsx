import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ChevronRight, Moon, Sun, Image as ImageIcon } from 'lucide-react';

export default function PersonalJira() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [tasks, setTasks] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColumn, setNewTaskColumn] = useState('idea');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);

  const columns = [
    { id: 'idea', title: 'IDEA', color: 'bg-purple-100' },
    { id: 'todo', title: 'TO DO', color: 'bg-gray-100' },
    { id: 'in-progress', title: 'IN PROGRESS', color: 'bg-blue-100' },
    { id: 'done', title: 'DONE', color: 'bg-green-100' }
  ];

  // Загрузка данных из localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const savedProjects = localStorage.getItem('jira-projects');
        const savedTasks = localStorage.getItem('jira-tasks');
        const savedDarkMode = localStorage.getItem('jira-darkMode');

        if (savedProjects) {
          const proj = JSON.parse(savedProjects);
          setProjects(proj);
          setCurrentProject(proj[0]?.id);
        } else {
          const defaultProject = { id: 'default', name: 'Мой проект' };
          setProjects([defaultProject]);
          setCurrentProject('default');
          localStorage.setItem('jira-projects', JSON.stringify([defaultProject]));
        }

        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        } else {
          localStorage.setItem('jira-tasks', JSON.stringify({}));
        }

        if (savedDarkMode) {
          setDarkMode(JSON.parse(savedDarkMode));
        }
      } catch (error) {
        console.error('Loading error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Сохранение проектов
  const saveProjects = (newProjects) => {
    try {
      setProjects(newProjects);
      localStorage.setItem('jira-projects', JSON.stringify(newProjects));
    } catch (error) {
      console.error('Save projects error:', error);
    }
  };

  // Сохранение задач
  const saveTasks = (newTasks) => {
    try {
      setTasks(newTasks);
      localStorage.setItem('jira-tasks', JSON.stringify(newTasks));
    } catch (error) {
      console.error('Save tasks error:', error);
    }
  };

  // Сохранение темы
  useEffect(() => {
    localStorage.setItem('jira-darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Создать новый проект
  const createProject = () => {
    if (!newProjectName.trim()) return;

    const newProject = {
      id: Date.now().toString(),
      name: newProjectName
    };

    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);
    setCurrentProject(newProject.id);
    setNewProjectName('');
  };

  // Редактировать название проекта
  const updateProjectName = (projectId) => {
    if (!editingProjectName.trim()) return;

    const updatedProjects = projects.map(p =>
      p.id === projectId ? { ...p, name: editingProjectName } : p
    );

    saveProjects(updatedProjects);
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  // Удалить проект
  const deleteProject = (projectId) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    saveProjects(updatedProjects);

    if (currentProject === projectId) {
      setCurrentProject(updatedProjects[0]?.id);
    }

    const newTasks = { ...tasks };
    delete newTasks[projectId];
    saveTasks(newTasks);
  };

  // Создать задачу
  const createTask = () => {
    if (!newTaskTitle.trim() || !currentProject) return;

    const now = new Date();
    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: '',
      priority: 'medium',
      image: '',
      createdAt: now.toLocaleDateString('ru-RU'),
      history: [
        {
          timestamp: now.toLocaleString('ru-RU'),
          action: 'Создана задача',
          changes: { title: newTaskTitle }
        }
      ]
    };

    const newTasks = { ...tasks };
    if (!newTasks[currentProject]) {
      newTasks[currentProject] = {};
    }
    if (!newTasks[currentProject][newTaskColumn]) {
      newTasks[currentProject][newTaskColumn] = [];
    }

    newTasks[currentProject][newTaskColumn].push(newTask);
    saveTasks(newTasks);
    setNewTaskTitle('');
  };

  // Удалить задачу
  const deleteTask = (taskId) => {
    const newTasks = { ...tasks };

    for (let column of columns) {
      if (newTasks[currentProject]?.[column.id]) {
        newTasks[currentProject][column.id] = newTasks[currentProject][column.id].filter(
          t => t.id !== taskId
        );
      }
    }

    saveTasks(newTasks);
    setEditingTask(null);
  };

  // Обновить задачу
  const updateTask = (updatedTask, oldTask) => {
    const newTasks = { ...tasks };

    for (let column of columns) {
      if (newTasks[currentProject]?.[column.id]) {
        const index = newTasks[currentProject][column.id].findIndex(
          t => t.id === updatedTask.id
        );
        if (index !== -1) {
          // Создаем запись в историю для измененных полей
          const changes = {};
          if (oldTask.title !== updatedTask.title) changes.title = updatedTask.title;
          if (oldTask.description !== updatedTask.description) changes.description = updatedTask.description;
          if (oldTask.priority !== updatedTask.priority) changes.priority = updatedTask.priority;
          if (oldTask.image !== updatedTask.image) changes.image = 'Изображение добавлено';

          if (Object.keys(changes).length > 0) {
            const historyEntry = {
              timestamp: new Date().toLocaleString('ru-RU'),
              action: 'Отредактирована задача',
              changes: changes
            };

            updatedTask.history = [...(updatedTask.history || []), historyEntry];
          }

          newTasks[currentProject][column.id][index] = updatedTask;
          setEditingTask(updatedTask);
          saveTasks(newTasks);
          return;
        }
      }
    }
  };

  // Переместить задачу между колонками
  const moveTask = (taskId, fromColumn, toColumn) => {
    const newTasks = { ...tasks };

    const taskIndex = newTasks[currentProject]?.[fromColumn]?.findIndex(t => t.id === taskId);
    if (taskIndex === -1 || taskIndex === undefined) return;

    const task = newTasks[currentProject][fromColumn][taskIndex];
    newTasks[currentProject][fromColumn].splice(taskIndex, 1);

    if (!newTasks[currentProject][toColumn]) {
      newTasks[currentProject][toColumn] = [];
    }
    newTasks[currentProject][toColumn].push(task);

    saveTasks(newTasks);
  };

  if (loading) {
    return <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>Загрузка...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Боковая панель */}
      <div className={`w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col`}>
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Jira</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h2 className={`text-xs font-semibold uppercase mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Проекты</h2>
            {projects.map(project => (
              <div
                key={project.id}
                className={`p-3 rounded cursor-pointer mb-2 flex items-center justify-between group ${
                  currentProject === project.id
                    ? darkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-900'
                    : darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {editingProjectId === project.id ? (
                  <input
                    type="text"
                    value={editingProjectName}
                    onChange={e => setEditingProjectName(e.target.value)}
                    onBlur={() => updateProjectName(project.id)}
                    onKeyPress={e => e.key === 'Enter' && updateProjectName(project.id)}
                    autoFocus
                    className={`flex-1 px-2 py-1 rounded text-sm ${darkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'}`}
                  />
                ) : (
                  <span onClick={() => setCurrentProject(project.id)} className="flex-1">
                    {project.name}
                  </span>
                )}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button
                    onClick={() => {
                      setEditingProjectId(project.id);
                      setEditingProjectName(project.name);
                    }}
                    className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-blue-200'}`}
                  >
                    <Edit2 size={14} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                  </button>
                  {projects.length > 1 && (
                    <button
                      onClick={() => deleteProject(project.id)}
                      className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-red-100'}`}
                    >
                      <X size={14} className={darkMode ? 'text-red-400' : 'text-red-600'} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && createProject()}
                placeholder="Новый проект..."
                className={`flex-1 px-2 py-2 text-sm border rounded focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
              />
              <button
                onClick={createProject}
                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Основное содержимое */}
      {editingTask ? (
        <TaskEditor
          task={editingTask}
          onUpdate={updateTask}
          onClose={() => setEditingTask(null)}
          onDelete={deleteTask}
          darkMode={darkMode}
        />
      ) : (
        <div className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="p-8">
            {currentProject && (
              <>
                <div className="mb-6">
                  <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {projects.find(p => p.id === currentProject)?.name}
                  </h2>
                </div>

                {/* Форма добавления задачи */}
                <div className={`mb-8 p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && createTask()}
                      placeholder="Добавить новую задачу..."
                      className={`flex-1 px-4 py-2 border rounded focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
                    />
                    <select
                      value={newTaskColumn}
                      onChange={e => setNewTaskColumn(e.target.value)}
                      className={`px-3 py-2 border rounded focus:outline-none focus:border-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                    >
                      {columns.map(col => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={createTask}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Plus size={18} /> Добавить
                    </button>
                  </div>
                </div>

                {/* Канбан доска */}
                <div className="grid grid-cols-4 gap-6">
                  {columns.map(column => {
                    const colBg = column.id === 'idea' ? (darkMode ? 'bg-purple-900' : 'bg-purple-100') :
                                  column.id === 'todo' ? (darkMode ? 'bg-gray-800' : 'bg-gray-100') :
                                  column.id === 'in-progress' ? (darkMode ? 'bg-blue-900' : 'bg-blue-100') :
                                  (darkMode ? 'bg-green-900' : 'bg-green-100');
                    
                    return (
                      <DropZone
                        key={column.id}
                        column={column}
                        colBg={colBg}
                        darkMode={darkMode}
                        tasks={tasks[currentProject]?.[column.id] || []}
                        columns={columns}
                        currentProject={currentProject}
                        onTaskClick={setEditingTask}
                        onMove={moveTask}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DropZone({ column, colBg, darkMode, tasks, columns, currentProject, onTaskClick, onMove }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const taskId = e.dataTransfer.getData('taskId');
    const fromColumn = e.dataTransfer.getData('fromColumn');

    if (fromColumn !== column.id) {
      onMove(taskId, fromColumn, column.id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${colBg} rounded-lg p-4 transition ${isDragOver ? 'ring-2 ring-blue-500 scale-105' : ''}`}
    >
      <h3 className={`font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        {column.title} ({tasks.length})
      </h3>
      <div className="space-y-3 min-h-[100px]">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            column={column}
            columns={columns}
            currentProject={currentProject}
            onTaskClick={onTaskClick}
            onMove={onMove}
            darkMode={darkMode}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, column, columns, currentProject, onTaskClick, onMove, darkMode }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const cardBg = darkMode ? 'bg-gray-700 hover:shadow-lg' : 'bg-white hover:shadow-md';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-800';
  const descColor = darkMode ? 'text-gray-400' : 'text-gray-600';
  const dateColor = darkMode ? 'text-gray-500' : 'text-gray-500';

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('fromColumn', column.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`${cardBg} p-4 rounded shadow cursor-grab active:cursor-grabbing group relative transition ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      onClick={() => onTaskClick(task)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className={`font-bold text-sm ${textColor}`}>{task.title}</h4>
          {task.image && (
            <img src={task.image} alt="Task" className="mt-2 w-full h-32 object-cover rounded" />
          )}
          {task.description && (
            <p className={`text-xs ${descColor} mt-1 line-clamp-2`}>{task.description}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded ${
              task.priority === 'high' ? 'bg-red-100 text-red-700' :
              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
            </span>
            <span className={`text-xs ${dateColor}`}>{task.createdAt}</span>
          </div>
        </div>
      </div>

      {/* Меню переместить */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
        <div className="relative">
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
          >
            <ChevronRight size={16} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
          </button>
          {showMenu && (
            <div className={`absolute right-0 mt-1 rounded shadow-lg z-10 ${darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'}`}>
              {columns
                .filter(col => col.id !== column.id)
                .map(col => (
                  <button
                    key={col.id}
                    onClick={e => {
                      e.stopPropagation();
                      onMove(task.id, column.id, col.id);
                      setShowMenu(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm whitespace-nowrap ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    → {col.title}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskEditor({ task, onUpdate, onClose, onDelete, darkMode }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [image, setImage] = useState(task.image || '');
  const [showHistory, setShowHistory] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onUpdate({
      ...task,
      title,
      description,
      priority,
      image
    }, task);
    onClose();
  };

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const labelClass = darkMode ? 'text-gray-300' : 'text-gray-700';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-300';
  const inputBgClass = darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900';

  return (
    <div className={`flex-1 overflow-auto ${bgClass}`}>
      <div className="max-w-3xl mx-auto p-8">
        <div className={`${cardBgClass} rounded-lg shadow-lg p-8`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${textClass}`}>Редактировать задачу</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <X size={24} className={textClass} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Заголовок */}
            <div>
              <label className={`block text-sm font-semibold ${labelClass} mb-2`}>Название</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={`w-full px-4 py-2 border ${borderClass} rounded focus:outline-none focus:border-blue-500 ${inputBgClass}`}
              />
            </div>

            {/* Описание */}
            <div>
              <label className={`block text-sm font-semibold ${labelClass} mb-2`}>Описание</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Добавить описание..."
                rows={6}
                className={`w-full px-4 py-2 border ${borderClass} rounded focus:outline-none focus:border-blue-500 resize-none ${inputBgClass}`}
              />
            </div>

            {/* Приоритет */}
            <div>
              <label className={`block text-sm font-semibold ${labelClass} mb-2`}>Приоритет</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className={`w-full px-4 py-2 border ${borderClass} rounded focus:outline-none focus:border-blue-500 ${inputBgClass}`}
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>

            {/* Изображение */}
            <div>
              <label className={`block text-sm font-semibold ${labelClass} mb-2`}>Изображение</label>
              <div className={`border-2 border-dashed ${borderClass} rounded-lg p-4`}>
                {image ? (
                  <div className="space-y-3">
                    <img src={image} alt="Task" className="max-h-64 rounded mx-auto" />
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <span className="block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer text-center font-medium">
                          Изменить
                        </span>
                      </label>
                      <button
                        onClick={() => setImage('')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className={`p-8 text-center cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <ImageIcon size={32} className={`mx-auto mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      <p className={`font-medium ${labelClass}`}>Загрузить изображение</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>или перетащить файл</p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* История */}
            {task.history && task.history.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`text-sm font-semibold ${labelClass} mb-2 hover:underline`}
                >
                  {showHistory ? '▼' : '▶'} История изменений ({task.history.length})
                </button>
                {showHistory && (
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto`}>
                    {[...task.history].reverse().map((entry, idx) => (
                      <div key={idx} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="font-medium">{entry.action}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{entry.timestamp}</div>
                        {Object.entries(entry.changes).length > 0 && (
                          <div className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {Object.entries(entry.changes).map(([key, value]) => (
                              <div key={key}>• {key}: {String(value).substring(0, 50)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Кнопки действия */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Сохранить
              </button>
              <button
                onClick={onClose}
                className={`px-6 py-2 border ${borderClass} rounded font-medium ${darkMode ? 'text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (confirm('Удалить эту задачу?')) {
                    onDelete(task.id);
                  }
                }}
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
