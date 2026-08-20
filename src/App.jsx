import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, X, ChevronRight, Moon, Sun, Image as ImageIcon, Home, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

// Сжатие изображения перед сохранением (чтобы не переполнять localStorage)
function compressImage(file, maxWidth = 900, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Получить код проекта - только согласные буквы из названия
function getProjectCode(name) {
  if (!name) return 'TASK';
  const vowels = 'AEIOUАЕЁИОУЫЭЮЯ';
  const lettersOnly = name.toUpperCase().replace(/[^A-ZА-ЯЁ]/g, '');
  let consonants = '';
  for (let ch of lettersOnly) {
    if (!vowels.includes(ch)) {
      consonants += ch;
    }
  }
  if (!consonants) consonants = lettersOnly || 'TASK';
  return consonants.substring(0, 5) || 'TASK';
}

export default function PersonalJira() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [tasks, setTasks] = useState({});
  const [weeklyTasks, setWeeklyTasks] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColumn, setNewTaskColumn] = useState('idea');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [currentPage, setCurrentPage] = useState('kanban');
  const [pendingProject, setPendingProject] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [taskAddedNotification, setTaskAddedNotification] = useState(false);
  const [storageError, setStorageError] = useState(false);

  const columns = [
    { id: 'idea', title: 'IDEA', color: 'bg-purple-100' },
    { id: 'todo', title: 'TO DO', color: 'bg-gray-100' },
    { id: 'in-progress', title: 'IN PROGRESS', color: 'bg-blue-100' },
    { id: 'done', title: 'DONE', color: 'bg-green-100' }
  ];

  const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  // Пересчитать ID задач по новому принципу (сокращение из согласных + порядковый номер)
  const regenerateTaskIds = (tasksObj, projectsList) => {
    const newTasksObj = { ...tasksObj };

    projectsList.forEach(project => {
      const projectCode = getProjectCode(project.name);
      let counter = 1;

      columns.forEach(col => {
        const columnTasks = newTasksObj[project.id]?.[col.id];
        if (columnTasks) {
          columnTasks.forEach(task => {
            task.taskId = `${projectCode}-${counter}`;
            counter++;
          });
        }
      });
    });

    return newTasksObj;
  };

  // Загрузка данных из localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const savedProjects = localStorage.getItem('jira-projects');
        const savedTasks = localStorage.getItem('jira-tasks');
        const savedWeeklyTasks = localStorage.getItem('jira-weekly-tasks');
        const savedDarkMode = localStorage.getItem('jira-darkMode');
        const savedCurrentProject = localStorage.getItem('jira-currentProject');
        const savedCurrentPage = localStorage.getItem('jira-currentPage');

        let proj = [];
        if (savedProjects) {
          proj = JSON.parse(savedProjects);
          setProjects(proj);
        } else {
          const defaultProject = { id: 'default', name: 'PROJECT' };
          proj = [defaultProject];
          setProjects(proj);
          localStorage.setItem('jira-projects', JSON.stringify(proj));
        }

        // Восстановить последний открытый проект, если он существует
        if (savedCurrentProject && proj.find(p => p.id === savedCurrentProject)) {
          setCurrentProject(savedCurrentProject);
        } else {
          setCurrentProject(proj[0]?.id);
        }

        if (savedCurrentPage) {
          setCurrentPage(savedCurrentPage);
        }

        let loadedTasks = {};
        if (savedTasks) {
          loadedTasks = JSON.parse(savedTasks);
        } else {
          localStorage.setItem('jira-tasks', JSON.stringify({}));
        }

        // Мигрировать/пересчитать ID задач по новому принципу
        const migratedTasks = regenerateTaskIds(loadedTasks, proj);
        setTasks(migratedTasks);
        localStorage.setItem('jira-tasks', JSON.stringify(migratedTasks));

        if (savedWeeklyTasks) {
          setWeeklyTasks(JSON.parse(savedWeeklyTasks));
        } else {
          const emptyWeekly = {};
          weekDays.forEach(day => {
            emptyWeekly[day] = [];
          });
          localStorage.setItem('jira-weekly-tasks', JSON.stringify(emptyWeekly));
          setWeeklyTasks(emptyWeekly);
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

  // Безопасное сохранение в localStorage с обработкой ошибок переполнения
  const safeSetItem = (key, value) => {
    try {
      localStorage.setItem(key, value);
      setStorageError(false);
      return true;
    } catch (error) {
      console.error('Storage error:', error);
      setStorageError(true);
      setTimeout(() => setStorageError(false), 4000);
      return false;
    }
  };

  const saveProjects = (newProjects) => {
    setProjects(newProjects);
    safeSetItem('jira-projects', JSON.stringify(newProjects));
  };

  const saveTasks = (newTasks) => {
    setTasks(newTasks);
    safeSetItem('jira-tasks', JSON.stringify(newTasks));
  };

  const saveWeeklyTasks = (newWeeklyTasks) => {
    setWeeklyTasks(newWeeklyTasks);
    safeSetItem('jira-weekly-tasks', JSON.stringify(newWeeklyTasks));
  };

  // Сохранение темы
  useEffect(() => {
    localStorage.setItem('jira-darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Сохранение текущего проекта
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem('jira-currentProject', currentProject);
    }
  }, [currentProject]);

  // Сохранение текущей страницы
  useEffect(() => {
    localStorage.setItem('jira-currentPage', currentPage);
  }, [currentPage]);

  // Функция для получения номера задачи (для отображения если нет taskId)
  const getTaskNumber = (taskId) => {
    let taskNumber = 1;
    for (let col of columns) {
      const columnTasks = tasks[currentProject]?.[col.id] || [];
      const foundIndex = columnTasks.findIndex(t => t.id === taskId);
      if (foundIndex !== -1) {
        return taskNumber + foundIndex;
      }
      taskNumber += columnTasks.length;
    }
    return taskNumber;
  };

  // Обработка переключения проекта
  const handleProjectClick = (projectId) => {
    if (editingTask && hasUnsavedChanges) {
      setPendingProject(projectId);
      setShowConfirmDialog(true);
    } else {
      setEditingTask(null);
      setCurrentProject(projectId);
      setCurrentPage('kanban');
    }
  };

  // Подтверждение сохранения перед переключением
  const handleConfirmSwitchProject = (save) => {
    if (save && editingTask) {
      handleTaskSave(editingTask, true);
    }
    setShowConfirmDialog(false);
    if (pendingProject) {
      setEditingTask(null);
      setCurrentProject(pendingProject);
      setCurrentPage('kanban');
      setPendingProject(null);
    }
    setHasUnsavedChanges(false);
  };

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

    // Пересчитать ID задач с новым названием проекта
    const migratedTasks = regenerateTaskIds(tasks, updatedProjects);
    saveTasks(migratedTasks);
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
    const project = projects.find(p => p.id === currentProject);
    const projectCode = getProjectCode(project?.name);

    let taskCount = 0;
    for (let col of columns) {
      const columnTasks = tasks[currentProject]?.[col.id] || [];
      taskCount += columnTasks.length;
    }
    const taskId = `${projectCode}-${taskCount + 1}`;

    const newTask = {
      id: Date.now().toString(),
      taskId: taskId,
      title: newTaskTitle,
      description: { content: '', editorState: null },
      priority: 'medium',
      images: [],
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
    setTaskAddedNotification(true);
    setTimeout(() => setTaskAddedNotification(false), 2000);
  };

  // Удалить задачу (из редактора или прямо с борда)
  const deleteTask = (taskId) => {
    const newTasks = { ...tasks };

    for (let column of columns) {
      if (newTasks[currentProject]?.[column.id]) {
        newTasks[currentProject][column.id] = newTasks[currentProject][column.id].filter(
          t => t.id !== taskId
        );
      }
    }

    // Пересчитать ID оставшихся задач
    const migratedTasks = regenerateTaskIds(newTasks, projects);
    saveTasks(migratedTasks);

    if (editingTask?.id === taskId) {
      setEditingTask(null);
      setHasUnsavedChanges(false);
    }
  };

  // Сохранить и закрыть редактор
  const handleTaskSave = (updatedTask, skipClose) => {
    const newTasks = { ...tasks };

    for (let column of columns) {
      if (newTasks[currentProject]?.[column.id]) {
        const index = newTasks[currentProject][column.id].findIndex(
          t => t.id === updatedTask.id
        );
        if (index !== -1) {
          newTasks[currentProject][column.id][index] = updatedTask;
          saveTasks(newTasks);
          if (!skipClose) {
            setEditingTask(null);
            setHasUnsavedChanges(false);
          }
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

  // Переупорядочить задачи внутри столбика
  const reorderTasksInColumn = (fromIndex, toIndex, columnId) => {
    const newTasks = { ...tasks };
    const columnTasks = newTasks[currentProject]?.[columnId];

    if (!columnTasks) return;

    const [movedTask] = columnTasks.splice(fromIndex, 1);
    columnTasks.splice(toIndex, 0, movedTask);

    saveTasks(newTasks);
  };

  // Добавить задачу в недельный список
  const addWeeklyTask = (day, title) => {
    if (!title.trim()) return;

    const newWeeklyTasks = { ...weeklyTasks };
    newWeeklyTasks[day].push({
      id: Date.now().toString(),
      title,
      completed: false
    });

    saveWeeklyTasks(newWeeklyTasks);
  };

  // Удалить задачу из недельного списка
  const deleteWeeklyTask = (day, taskId) => {
    const newWeeklyTasks = { ...weeklyTasks };
    newWeeklyTasks[day] = newWeeklyTasks[day].filter(t => t.id !== taskId);
    saveWeeklyTasks(newWeeklyTasks);
  };

  // Переключить статус недельной задачи
  const toggleWeeklyTask = (day, taskId) => {
    const newWeeklyTasks = { ...weeklyTasks };
    const task = newWeeklyTasks[day].find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      saveWeeklyTasks(newWeeklyTasks);
    }
  };

  // Редактировать текст недельной задачи
  const editWeeklyTask = (day, taskId, newTitle) => {
    if (!newTitle.trim()) return;
    const newWeeklyTasks = { ...weeklyTasks };
    const task = newWeeklyTasks[day].find(t => t.id === taskId);
    if (task) {
      task.title = newTitle;
      saveWeeklyTasks(newWeeklyTasks);
    }
  };

  if (loading) {
    return <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>Загрузка...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Уведомление об ошибке хранилища */}
      {storageError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 max-w-md">
          <AlertCircle size={20} />
          <span className="text-sm">Не удалось сохранить: недостаточно места. Попробуйте удалить старые изображения.</span>
        </div>
      )}

      {/* Модальное окно подтверждения */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-8 max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Сохранить изменения?
            </h3>
            <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              У вас есть несохраненные изменения в задаче. Хотите их сохранить?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmSwitchProject(true)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Сохранить
              </button>
              <button
                onClick={() => handleConfirmSwitchProject(false)}
                className={`flex-1 px-4 py-2 border rounded font-medium ${
                  darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Не сохранять
              </button>
            </div>
          </div>
        </div>
      )}

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

        {/* Навигация */}
        <div className="p-4 space-y-2 border-b border-gray-300">
          <button
            onClick={() => setCurrentPage('kanban')}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded font-medium ${
              currentPage === 'kanban'
                ? darkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-900'
                : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home size={18} /> Kanban
          </button>
          <button
            onClick={() => setCurrentPage('weekly')}
            className={`w-full flex items-center gap-2 px-4 py-2 rounded font-medium ${
              currentPage === 'weekly'
                ? darkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-900'
                : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar size={18} /> Schedule
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {currentPage === 'kanban' && (
            <>
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
                      <span onClick={() => handleProjectClick(project.id)} className="flex-1">
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
            </>
          )}
        </div>
      </div>

      {/* Основное содержимое */}
      {editingTask && currentPage === 'kanban' ? (
        <TaskEditor
          task={editingTask}
          onSave={handleTaskSave}
          onClose={() => {
            setEditingTask(null);
            setHasUnsavedChanges(false);
          }}
          onDelete={deleteTask}
          darkMode={darkMode}
          onUnsavedChange={(changed) => setHasUnsavedChanges(changed)}
        />
      ) : currentPage === 'kanban' ? (
        <>
          {taskAddedNotification && (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-40">
              <CheckCircle size={20} />
              <span>Задача добавлена!</span>
            </div>
          )}
          <KanbanBoard
            currentProject={currentProject}
            projects={projects}
            tasks={tasks}
            columns={columns}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            newTaskColumn={newTaskColumn}
            setNewTaskColumn={setNewTaskColumn}
            createTask={createTask}
            setEditingTask={setEditingTask}
            moveTask={moveTask}
            reorderTasksInColumn={reorderTasksInColumn}
            darkMode={darkMode}
            getTaskNumber={getTaskNumber}
            deleteTask={deleteTask}
          />
        </>
      ) : (
        <WeeklyTodo
          weeklyTasks={weeklyTasks}
          addWeeklyTask={addWeeklyTask}
          deleteWeeklyTask={deleteWeeklyTask}
          toggleWeeklyTask={toggleWeeklyTask}
          editWeeklyTask={editWeeklyTask}
          darkMode={darkMode}
          weekDays={weekDays}
        />
      )}
    </div>
  );
}

function KanbanBoard({
  currentProject,
  projects,
  tasks,
  columns,
  newTaskTitle,
  setNewTaskTitle,
  newTaskColumn,
  setNewTaskColumn,
  createTask,
  setEditingTask,
  moveTask,
  reorderTasksInColumn,
  darkMode,
  getTaskNumber,
  deleteTask
}) {
  return (
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
              {columns.map(column => (
                <DropZone
                  key={column.id}
                  column={column}
                  darkMode={darkMode}
                  tasks={tasks[currentProject]?.[column.id] || []}
                  columns={columns}
                  currentProject={currentProject}
                  setEditingTask={setEditingTask}
                  moveTask={moveTask}
                  reorderTasksInColumn={reorderTasksInColumn}
                  getTaskNumber={getTaskNumber}
                  deleteTask={deleteTask}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DropZone({
  column,
  darkMode,
  tasks,
  columns,
  currentProject,
  setEditingTask,
  moveTask,
  reorderTasksInColumn,
  getTaskNumber,
  deleteTask
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const colBg = column.id === 'idea' ? (darkMode ? 'bg-purple-900' : 'bg-purple-100') :
                column.id === 'todo' ? (darkMode ? 'bg-gray-800' : 'bg-gray-100') :
                column.id === 'in-progress' ? (darkMode ? 'bg-blue-900' : 'bg-blue-100') :
                (darkMode ? 'bg-green-900' : 'bg-green-100');

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
      moveTask(taskId, fromColumn, column.id);
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
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            column={column}
            setEditingTask={setEditingTask}
            reorderTasksInColumn={reorderTasksInColumn}
            darkMode={darkMode}
            taskNumber={getTaskNumber(task.id)}
            deleteTask={deleteTask}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, index, column, setEditingTask, reorderTasksInColumn, darkMode, taskNumber, deleteTask }) {
  const [isDragging, setIsDragging] = useState(false);

  const cardBg = darkMode ? 'bg-gray-700 hover:shadow-lg' : 'bg-white hover:shadow-md';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-800';

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('fromColumn', column.id);
    e.dataTransfer.setData('fromIndex', index.toString());
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const fromColumn = e.dataTransfer.getData('fromColumn');
    const fromIndex = parseInt(e.dataTransfer.getData('fromIndex'));

    if (fromColumn === column.id) {
      reorderTasksInColumn(fromIndex, index, column.id);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (confirm('Удалить эту задачу?')) {
      deleteTask(task.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`${cardBg} p-4 rounded shadow cursor-grab active:cursor-grabbing group relative transition ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      onClick={() => setEditingTask(task)}
    >
      <button
        onClick={handleDeleteClick}
        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition bg-red-100 hover:bg-red-200 z-10"
        title="Удалить задачу"
      >
        <Trash2 size={14} className="text-red-600" />
      </button>
      <div className="flex items-start gap-2 mb-2 pr-6">
        <span className={`font-bold text-xs px-2 py-1 rounded bg-blue-500 text-white whitespace-nowrap`}>{task.taskId || `#${taskNumber}`}</span>
        <h4 className={`font-bold text-sm ${textColor} flex-1 break-words`}>{task.title}</h4>
      </div>
      {task.images && task.images.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {task.images.slice(0, 2).map((img, idx) => (
            <img key={idx} src={img} alt="Task" className="w-12 h-12 object-cover rounded" />
          ))}
          {task.images.length > 2 && (
            <div className="w-12 h-12 bg-gray-400 rounded flex items-center justify-center text-white text-xs font-bold">
              +{task.images.length - 2}
            </div>
          )}
        </div>
      )}
      <div className="mt-2">
        <span className={`text-xs px-2 py-1 rounded ${
          task.priority === 'high' ? 'bg-red-100 text-red-700' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
        </span>
      </div>
    </div>
  );
}

function TaskEditor({ task, onSave, onClose, onDelete, darkMode, onUnsavedChange }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description?.content || '');
  const [priority, setPriority] = useState(task.priority);
  const [images, setImages] = useState(task.images || []);
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
      description !== (task.description?.content || '') ||
      priority !== task.priority ||
      JSON.stringify(images) !== JSON.stringify(task.images || []);

    onUnsavedChange(hasChanges);
  }, [title, description, priority, images, task, onUnsavedChange]);

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBgClass = darkMode ? 'bg-gray-800' : 'bg-white';
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
    if (description !== (task.description?.content || '')) changes.description = 'Описание изменено';
    if (JSON.stringify(images) !== JSON.stringify(task.images || [])) changes.images = `Изображений: ${images.length}`;

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
      history: newHistory
    });
  };

  return (
    <div className={`flex-1 overflow-auto ${bgClass}`}>
      <div className="max-w-4xl mx-auto p-8">
        <div className={`${cardBgClass} rounded-lg shadow-lg p-8`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className={`text-sm font-bold text-blue-500 mb-1`}>{task.taskId}</div>
              <h2 className={`text-2xl font-bold ${textClass}`}>Редактировать задачу</h2>
            </div>
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

            {/* Описание с форматированием */}
            <div>
              <label className={`block text-sm font-semibold ${labelClass} mb-2`}>Описание</label>
              <div className={`border ${borderClass} rounded p-3 space-y-2 ${inputBgClass}`}>
                {/* Панель форматирования */}
                <div className="flex gap-2 flex-wrap pb-2 border-b border-gray-400">
                  <select
                    value={textFormat.fontSize}
                    onChange={e => setTextFormat({ ...textFormat, fontSize: e.target.value })}
                    className={`px-2 py-1 text-sm rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}
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
                    className={`px-3 py-1 text-sm rounded font-bold ${textFormat.fontWeight === 'bold' ? 'bg-blue-500 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
                  >
                    Ж
                  </button>

                  <button
                    onClick={() => setTextFormat({ ...textFormat, fontStyle: textFormat.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={`px-3 py-1 text-sm rounded italic ${textFormat.fontStyle === 'italic' ? 'bg-blue-500 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
                  >
                    К
                  </button>

                  <input
                    type="color"
                    value={textFormat.color}
                    onChange={e => setTextFormat({ ...textFormat, color: e.target.value })}
                    className="w-10 h-9 rounded cursor-pointer"
                  />
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
                  className={`w-full p-3 border ${borderClass} rounded focus:outline-none resize-none ${inputBgClass}`}
                />
              </div>
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

            {/* Изображения */}
            <div>
              <label className={`block text-sm font-semibold ${labelClass} mb-2`}>Изображения</label>
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
                  <div className={`text-center ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} p-4 rounded`}>
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
                        <img src={img} alt="Task" className="w-full h-32 object-cover rounded" />
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Кнопки действия */}
            <div className="flex gap-3 pt-4 border-t border-gray-400">
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Подождите...' : 'Сохранить'}
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

function WeeklyTodo({ weeklyTasks, addWeeklyTask, deleteWeeklyTask, toggleWeeklyTask, editWeeklyTask, darkMode, weekDays }) {
  const [newTasks, setNewTasks] = useState({});
  const [editingItem, setEditingItem] = useState(null); // { day, taskId }
  const [editingText, setEditingText] = useState('');

  const handleAddTask = (day) => {
    if (newTasks[day]?.trim()) {
      addWeeklyTask(day, newTasks[day]);
      setNewTasks({ ...newTasks, [day]: '' });
    }
  };

  const startEditing = (day, task) => {
    setEditingItem({ day, taskId: task.id });
    setEditingText(task.title);
  };

  const saveEditing = () => {
    if (editingItem && editingText.trim()) {
      editWeeklyTask(editingItem.day, editingItem.taskId, editingText);
    }
    setEditingItem(null);
    setEditingText('');
  };

  return (
    <div className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="p-8">
        <h2 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          📅 Schedule
        </h2>

        <div className="grid grid-cols-4 gap-6">
          {weekDays.map(day => (
            <div
              key={day}
              className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex flex-col`}
            >
              <h3 className={`text-xl font-bold mb-4 px-4 py-2 rounded text-white ${
                day === 'Понедельник' ? 'bg-red-500' :
                day === 'Вторник' ? 'bg-orange-500' :
                day === 'Среда' ? 'bg-yellow-500' :
                day === 'Четверг' ? 'bg-green-500' :
                day === 'Пятница' ? 'bg-blue-500' :
                day === 'Суббота' ? 'bg-purple-500' :
                'bg-indigo-500'
              }`}>
                {day}
              </h3>

              <div className="space-y-2 mb-4 flex-1">
                {weeklyTasks[day]?.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded ${
                      task.completed
                        ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                        : darkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleWeeklyTask(day, task.id)}
                      className="w-5 h-5 cursor-pointer flex-shrink-0"
                    />
                    {editingItem?.day === day && editingItem?.taskId === task.id ? (
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
                        onClick={() => startEditing(day, task)}
                        className={`flex-1 cursor-text ${
                          task.completed
                            ? darkMode ? 'line-through text-gray-500' : 'line-through text-gray-400'
                            : darkMode ? 'text-gray-100' : 'text-gray-800'
                        }`}
                      >
                        {task.title}
                      </span>
                    )}
                    <button
                      onClick={() => startEditing(day, task)}
                      className={`p-1 rounded flex-shrink-0 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-blue-100'}`}
                    >
                      <Edit2 size={14} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                    </button>
                    <button
                      onClick={() => deleteWeeklyTask(day, task.id)}
                      className={`p-1 rounded flex-shrink-0 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-red-100'}`}
                    >
                      <X size={16} className={darkMode ? 'text-red-400' : 'text-red-600'} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTasks[day] || ''}
                  onChange={e => setNewTasks({ ...newTasks, [day]: e.target.value })}
                  onKeyPress={e => e.key === 'Enter' && handleAddTask(day)}
                  placeholder="Добавить задачу..."
                  className={`flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:border-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`}
                />
                <button
                  onClick={() => handleAddTask(day)}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
