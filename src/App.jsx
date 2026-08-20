import React, { useState, useEffect, useRef } from 'react';
import { getProjectCode } from './utils/projectCode';
import { idbGet, idbSet, writeStateToFile } from './utils/fileStorage';
import { isSupabaseConfigured } from './utils/supabaseClient';
import { loadRemoteState, saveRemoteState } from './utils/supabaseStorage';
import { DEFAULT_COLUMNS, WEEK_DAYS } from './constants';
import StorageErrorBanner from './components/StorageErrorBanner';
import TaskAddedNotification from './components/TaskAddedNotification';
import ConfirmDialog from './components/ConfirmDialog';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import TaskEditor from './components/TaskEditor';
import WeeklyTodo from './components/WeeklyTodo';
import Wishlist from './components/Wishlist';
import ChillTimer from './components/ChillTimer';
import SettingsPage from './components/SettingsPage';

export default function PersonalJira() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [tasks, setTasks] = useState({});
  const [projectColumns, setProjectColumns] = useState({});
  const [weeklyTasks, setWeeklyTasks] = useState({});
  const [wishlist, setWishlist] = useState([]);
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
  const fileSupported = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  const [fileHandle, setFileHandle] = useState(null);
  const [fileConnected, setFileConnected] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileSaveTimeout = useRef(null);
  const [supabaseStatus, setSupabaseStatus] = useState('idle');
  const [supabaseError, setSupabaseError] = useState(null);
  const remoteFetchDone = useRef(false);
  const supabaseSaveTimeout = useRef(null);

  const weekDays = WEEK_DAYS;

  const RU_TO_EN_DAY = {
    'Понедельник': 'Monday',
    'Вторник': 'Tuesday',
    'Среда': 'Wednesday',
    'Четверг': 'Thursday',
    'Пятница': 'Friday',
    'Суббота': 'Saturday',
    'Воскресенье': 'Sunday'
  };

  // Перенести задачи с русских названий дней (старый формат) на английские
  const migrateWeeklyTasks = (weeklyTasksObj) => {
    if (!weeklyTasksObj) return weeklyTasksObj;
    const migrated = {};
    Object.entries(weeklyTasksObj).forEach(([day, dayTasks]) => {
      migrated[RU_TO_EN_DAY[day] || day] = dayTasks;
    });
    return migrated;
  };

  // Получить колонки конкретного проекта (или дефолтный набор, если не настроены)
  const getProjectColumns = (projectId) => projectColumns[projectId] || DEFAULT_COLUMNS;

  // Пересчитать ID задач по новому принципу (сокращение из согласных + порядковый номер)
  const regenerateTaskIds = (tasksObj, projectsList) => {
    const newTasksObj = { ...tasksObj };

    projectsList.forEach(project => {
      const projectCode = getProjectCode(project.name);
      let counter = 1;

      getProjectColumns(project.id).forEach(col => {
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
        const savedColumns = localStorage.getItem('jira-columns');
        const savedWeeklyTasks = localStorage.getItem('jira-weekly-tasks');
        const savedWishlist = localStorage.getItem('jira-wishlist');
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

        if (savedColumns) {
          setProjectColumns(JSON.parse(savedColumns));
        }

        if (savedWeeklyTasks) {
          setWeeklyTasks(migrateWeeklyTasks(JSON.parse(savedWeeklyTasks)));
        } else {
          const emptyWeekly = {};
          weekDays.forEach(day => {
            emptyWeekly[day] = [];
          });
          localStorage.setItem('jira-weekly-tasks', JSON.stringify(emptyWeekly));
          setWeeklyTasks(emptyWeekly);
        }

        if (savedWishlist) {
          setWishlist(JSON.parse(savedWishlist));
        } else {
          localStorage.setItem('jira-wishlist', JSON.stringify([]));
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

  const saveWishlist = (newWishlist) => {
    setWishlist(newWishlist);
    safeSetItem('jira-wishlist', JSON.stringify(newWishlist));
  };

  const saveProjectColumns = (newProjectColumns) => {
    setProjectColumns(newProjectColumns);
    safeSetItem('jira-columns', JSON.stringify(newProjectColumns));
  };

  // Обновить набор колонок конкретного проекта
  const updateProjectColumns = (projectId, newColumns) => {
    saveProjectColumns({ ...projectColumns, [projectId]: newColumns });
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

  // Восстановление дескриптора файла автосохранения при загрузке
  useEffect(() => {
    if (!fileSupported) return;
    (async () => {
      try {
        const handle = await idbGet('fileHandle');
        if (!handle) return;
        setFileHandle(handle);
        setFileName(handle.name);
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        setFileConnected(permission === 'granted');
      } catch (err) {
        console.error('Restore file handle error:', err);
      }
    })();
  }, [fileSupported]);

  // Автосохранение данных в подключённый файл при любом изменении
  useEffect(() => {
    if (loading || !fileHandle || !fileConnected) return;
    clearTimeout(fileSaveTimeout.current);
    fileSaveTimeout.current = setTimeout(() => {
      writeStateToFile(fileHandle, { projects, tasks, projectColumns, weeklyTasks, wishlist });
    }, 300);
    return () => clearTimeout(fileSaveTimeout.current);
  }, [projects, tasks, projectColumns, weeklyTasks, wishlist, fileHandle, fileConnected, loading]);

  // Первичная загрузка данных из Supabase (перекрывает localStorage, если на сервере уже что-то есть)
  useEffect(() => {
    if (loading || !isSupabaseConfigured || remoteFetchDone.current) return;

    (async () => {
      setSupabaseStatus('loading');
      try {
        const remote = await loadRemoteState();
        if (remote) {
          if (remote.projects) saveProjects(remote.projects);
          if (remote.tasks) saveTasks(remote.tasks);
          if (remote.columns) saveProjectColumns(remote.columns);
          if (remote.weeklyTasks) saveWeeklyTasks(migrateWeeklyTasks(remote.weeklyTasks));
          if (remote.wishlist) saveWishlist(remote.wishlist);
          if (remote.settings?.darkMode !== undefined) setDarkMode(remote.settings.darkMode);
          if (remote.settings?.currentProject) setCurrentProject(remote.settings.currentProject);
          if (remote.settings?.currentPage) setCurrentPage(remote.settings.currentPage);
        }
        setSupabaseStatus('synced');
        setSupabaseError(null);
      } catch (err) {
        console.error('Supabase load error:', err);
        setSupabaseStatus('error');
        setSupabaseError(err.message);
      } finally {
        remoteFetchDone.current = true;
      }
    })();
  }, [loading]);

  // Автоматическая отправка изменений в Supabase (после первичной загрузки)
  useEffect(() => {
    if (loading || !isSupabaseConfigured || !remoteFetchDone.current) return;
    clearTimeout(supabaseSaveTimeout.current);
    supabaseSaveTimeout.current = setTimeout(async () => {
      try {
        await saveRemoteState({
          version: 1,
          projects,
          tasks,
          columns: projectColumns,
          weeklyTasks,
          wishlist,
          settings: { darkMode, currentProject, currentPage }
        });
        setSupabaseStatus('synced');
        setSupabaseError(null);
      } catch (err) {
        console.error('Supabase save error:', err);
        setSupabaseStatus('error');
        setSupabaseError(err.message);
      }
    }, 500);
    return () => clearTimeout(supabaseSaveTimeout.current);
  }, [projects, tasks, projectColumns, weeklyTasks, wishlist, darkMode, currentProject, currentPage, loading]);

  // Подключить (создать или выбрать существующий) JSON-файл для автосохранения
  const connectFile = async () => {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'jira-data.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });

      const file = await handle.getFile();
      const text = await file.text();
      if (text.trim()) {
        try {
          const parsed = JSON.parse(text);
          if (parsed.projects || parsed.tasks || parsed.projectColumns || parsed.weeklyTasks || parsed.wishlist) {
            if (confirm('Файл уже содержит данные. Загрузить их (заменив текущие)?')) {
              if (parsed.projects) saveProjects(parsed.projects);
              if (parsed.tasks) saveTasks(parsed.tasks);
              if (parsed.projectColumns) saveProjectColumns(parsed.projectColumns);
              if (parsed.weeklyTasks) saveWeeklyTasks(migrateWeeklyTasks(parsed.weeklyTasks));
              if (parsed.wishlist) saveWishlist(parsed.wishlist);
            }
          }
        } catch (err) {
          console.error('Invalid JSON in selected file:', err);
        }
      }

      await idbSet('fileHandle', handle);
      setFileHandle(handle);
      setFileName(handle.name);
      setFileConnected(true);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Connect file error:', err);
    }
  };

  // Повторно запросить доступ к ранее подключённому файлу
  const reconnectFile = async () => {
    try {
      const permission = await fileHandle.requestPermission({ mode: 'readwrite' });
      setFileConnected(permission === 'granted');
    } catch (err) {
      console.error('Reconnect file error:', err);
    }
  };

  // Отключить файл автосохранения
  const disconnectFile = async () => {
    await idbSet('fileHandle', null);
    setFileHandle(null);
    setFileConnected(false);
    setFileName('');
  };

  // Обновлять выбранную колонку по умолчанию при смене проекта
  useEffect(() => {
    if (!currentProject) return;
    const cols = getProjectColumns(currentProject);
    if (!cols.find(c => c.id === newTaskColumn)) {
      setNewTaskColumn(cols[0]?.id);
    }
  }, [currentProject, projectColumns]);

  // Функция для получения номера задачи (для отображения если нет taskId)
  const getTaskNumber = (taskId) => {
    let taskNumber = 1;
    for (let col of getProjectColumns(currentProject)) {
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

    const newProjectColumns = { ...projectColumns };
    delete newProjectColumns[projectId];
    saveProjectColumns(newProjectColumns);
  };

  // Создать задачу
  const createTask = () => {
    if (!newTaskTitle.trim() || !currentProject) return;

    const now = new Date();
    const project = projects.find(p => p.id === currentProject);
    const projectCode = getProjectCode(project?.name);

    let taskCount = 0;
    for (let col of getProjectColumns(currentProject)) {
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

    for (let column of getProjectColumns(currentProject)) {
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

    for (let column of getProjectColumns(currentProject)) {
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

  // Отсортировать задачи в столбике по приоритету (высокий → низкий)
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const sortColumnByPriority = (columnId) => {
    const newTasks = { ...tasks };
    const columnTasks = newTasks[currentProject]?.[columnId];
    if (!columnTasks) return;

    newTasks[currentProject] = {
      ...newTasks[currentProject],
      [columnId]: [...columnTasks].sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
      )
    };

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

  // Добавить пункт в вишлист
  const addWishlistItem = (title) => {
    if (!title.trim()) return;
    saveWishlist([...wishlist, { id: Date.now().toString(), title, completed: false }]);
  };

  // Удалить пункт из вишлиста
  const deleteWishlistItem = (itemId) => {
    saveWishlist(wishlist.filter(item => item.id !== itemId));
  };

  // Переключить статус пункта вишлиста
  const toggleWishlistItem = (itemId) => {
    saveWishlist(wishlist.map(item => (item.id === itemId ? { ...item, completed: !item.completed } : item)));
  };

  // Редактировать текст пункта вишлиста
  const editWishlistItem = (itemId, newTitle) => {
    if (!newTitle.trim()) return;
    saveWishlist(wishlist.map(item => (item.id === itemId ? { ...item, title: newTitle } : item)));
  };

  if (loading) {
    return <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>Загрузка...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {storageError && <StorageErrorBanner />}

      {showConfirmDialog && (
        <ConfirmDialog darkMode={darkMode} onConfirm={handleConfirmSwitchProject} />
      )}

      <Sidebar
        darkMode={darkMode}
        fileSupported={fileSupported}
        fileConnected={fileConnected}
        fileHandle={fileHandle}
        fileName={fileName}
        connectFile={connectFile}
        reconnectFile={reconnectFile}
        disconnectFile={disconnectFile}
        supabaseConfigured={isSupabaseConfigured}
        supabaseStatus={supabaseStatus}
        supabaseError={supabaseError}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        projects={projects}
        currentProject={currentProject}
        editingProjectId={editingProjectId}
        editingProjectName={editingProjectName}
        setEditingProjectId={setEditingProjectId}
        setEditingProjectName={setEditingProjectName}
        handleProjectClick={handleProjectClick}
        updateProjectName={updateProjectName}
        deleteProject={deleteProject}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        createProject={createProject}
      />

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
          {taskAddedNotification && <TaskAddedNotification />}
          <KanbanBoard
            currentProject={currentProject}
            projects={projects}
            tasks={tasks}
            columns={getProjectColumns(currentProject)}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            newTaskColumn={newTaskColumn}
            setNewTaskColumn={setNewTaskColumn}
            createTask={createTask}
            setEditingTask={setEditingTask}
            moveTask={moveTask}
            reorderTasksInColumn={reorderTasksInColumn}
            sortColumnByPriority={sortColumnByPriority}
            darkMode={darkMode}
            getTaskNumber={getTaskNumber}
            deleteTask={deleteTask}
          />
        </>
      ) : currentPage === 'weekly' ? (
        <WeeklyTodo
          weeklyTasks={weeklyTasks}
          addWeeklyTask={addWeeklyTask}
          deleteWeeklyTask={deleteWeeklyTask}
          toggleWeeklyTask={toggleWeeklyTask}
          editWeeklyTask={editWeeklyTask}
          darkMode={darkMode}
          weekDays={weekDays}
        />
      ) : currentPage === 'wishlist' ? (
        <Wishlist
          wishlist={wishlist}
          addWishlistItem={addWishlistItem}
          deleteWishlistItem={deleteWishlistItem}
          toggleWishlistItem={toggleWishlistItem}
          editWishlistItem={editWishlistItem}
          darkMode={darkMode}
        />
      ) : currentPage === 'chill' ? (
        <ChillTimer darkMode={darkMode} />
      ) : (
        <SettingsPage
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          projects={projects}
          currentProject={currentProject}
          getProjectColumns={getProjectColumns}
          updateProjectColumns={updateProjectColumns}
        />
      )}
    </div>
  );
}
