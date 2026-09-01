import React, { useState, useEffect, useRef } from 'react';
import { getProjectCode, uniqueSlug, withSlugs } from './utils/projectCode';
import { idbGet, idbSet, writeStateToFile } from './utils/fileStorage';
import { isSupabaseConfigured } from './utils/supabaseClient';
import { loadRemoteState, saveRemoteState } from './utils/supabaseStorage';
import { DEFAULT_COLUMNS, WEEK_DAYS, STORAGE_KEYS } from './constants';
import { DARK_THEMES, THEME_COLORS } from './themes';
import { parseLocation, navigate, onRouteChange } from './utils/router';
import { AUTH_KEY, FLAGS_KEY, DEFAULT_FLAGS, PAGE_FEATURES, canUse } from './auth';
import { getWeekKey } from './utils/weeks';
import { DEFAULT_SIGN, getNatalChart } from './horoscope';
import StorageErrorBanner from './components/StorageErrorBanner';
import TaskAddedNotification from './components/TaskAddedNotification';
import ConfirmDialog from './components/ConfirmDialog';
import { emptyLine } from './utils/noteLines';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import KanbanBoard from './components/KanbanBoard';
import TaskEditor from './components/TaskEditor';
import WeeklyTodo from './components/WeeklyTodo';
import Notes from './components/Notes';
import ChillTimer from './components/ChillTimer';
import SettingsPage from './components/SettingsPage';
import ThemeFx from './components/ThemeFx';
import LoginScreen from './components/LoginScreen';

export default function PersonalJira() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [tasks, setTasks] = useState({});
  const [projectColumns, setProjectColumns] = useState({});
  const [weeklyTasks, setWeeklyTasks] = useState({});
  const [notes, setNotes] = useState([]);
  const [collapsedSubtasks, setCollapsedSubtasks] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  // Открытая заметка — часть адреса, а не внутреннее состояние списка:
  // так её закрывает системный «назад», а ссылка на заметку открывает именно её
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  // Подробный гороскоп открывается как заметка — своим адресом, чтобы его
  // закрывал системный «назад»
  const [horoscopeOpen, setHoroscopeOpen] = useState(false);
  // На телефоне боковая панель выезжает поверх содержимого, на широком экране всегда на месте
  // Кто вошёл и что разрешено обычному пользователю (админу — всё)
  const [user, setUser] = useState(null);
  const [featureFlags, setFeatureFlags] = useState(DEFAULT_FLAGS);
  // Лайки включаются по каждому проекту отдельно: { [projectId]: true }
  const [projectLikes, setProjectLikes] = useState({});
  // Гороскоп в расписании: знак выбирают руками или он считается по дате рождения
  const [zodiac, setZodiac] = useState({ sign: DEFAULT_SIGN, birthDate: '' });
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  // Тема сайта: light | dark | wizard | surf. Компоненты по-прежнему знают только
  // про darkMode — тёмная она или светлая, — а характер темы накручивается сверху в CSS
  const [theme, setTheme] = useState('light');
  const darkMode = DARK_THEMES.includes(theme);
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
  // Первый проход синхронизации адреса не должен создавать запись в истории
  const routeSynced = useRef(false);
  // Предыдущий второй сегмент адреса — чтобы отличить открытие заметки от закрытия
  const lastDetail = useRef(null);
  const supabaseSaveTimeout = useRef(null);

  const weekDays = WEEK_DAYS;

  // Карта рождения: Солнце и Луна считаются от даты и времени, асцендент требует
  // ещё и координат. Дата главнее выбранного руками знака — если она указана,
  // солнечный знак не настройка, а следствие
  const natal = getNatalChart(zodiac);
  const zodiacSign = natal.sun || zodiac.sign || DEFAULT_SIGN;
  const risingSign = natal.rising;

  const RU_TO_EN_DAY = {
    'Понедельник': 'Monday',
    'Вторник': 'Tuesday',
    'Среда': 'Wednesday',
    'Четверг': 'Thursday',
    'Пятница': 'Friday',
    'Суббота': 'Saturday',
    'Воскресенье': 'Sunday'
  };

  // Раздел Wishlist убран — заметки умеют чек-листы, и это было вторым способом делать одно и то же.
  // Старые пункты не выбрасываем, а складываем в заметку-чеклист
  // Первый запуск — не пустая доска: сразу даём два привычных списка
  const createStarterNotes = () => {
    const stamp = Date.now();
    const now = new Date().toLocaleString('en-US');
    return [
      {
        id: `shopping-${stamp}`,
        title: 'Shopping list',
        content: '',
        mode: 'todo',
        color: 'green',
        items: [],
        images: [],
        updatedAt: now
      },
      {
        id: `wishlist-${stamp}`,
        title: 'Wishlist',
        content: '',
        mode: 'todo',
        color: 'pink',
        items: [],
        images: [],
        updatedAt: now
      }
    ];
  };

  const foldWishlistIntoNotes = (wishlistItems, notesList) => {
    if (!Array.isArray(wishlistItems) || wishlistItems.length === 0) return notesList || [];

    const stamp = Date.now();
    const wishlistNote = {
      id: `wishlist-${stamp}`,
      title: 'Wishlist',
      content: '',
      mode: 'todo',
      color: 'pink',
      items: wishlistItems.map((item, index) => ({
        id: `${stamp}-${index}`,
        text: item.title || '',
        checked: !!item.completed
      })),
      updatedAt: new Date().toLocaleString('en-US')
    };

    return [...(notesList || []), wishlistNote];
  };

  // Привести одну неделю к полному набору дней с английскими названиями
  const normalizeWeek = (week) => {
    const normalized = {};
    weekDays.forEach(day => {
      normalized[day] = [];
    });
    Object.entries(week || {}).forEach(([day, dayTasks]) => {
      const enDay = RU_TO_EN_DAY[day] || day;
      if (normalized[enDay]) normalized[enDay] = dayTasks || [];
    });
    return normalized;
  };

  // Старый формат — одна «вечная» неделя { Monday: [...] }, в т.ч. с русскими днями.
  // Новый — недели по дате понедельника: { '2026-08-17': { Monday: [...] } }.
  const migrateWeeklyTasks = (weeklyTasksObj) => {
    if (!weeklyTasksObj || typeof weeklyTasksObj !== 'object') return {};

    const keys = Object.keys(weeklyTasksObj);
    if (keys.length === 0) return {};

    const isFlatWeek = keys.some(key => weekDays.includes(key) || RU_TO_EN_DAY[key]);
    if (isFlatWeek) {
      // Существующие задачи попадают в текущую неделю
      return { [getWeekKey()]: normalizeWeek(weeklyTasksObj) };
    }

    const migrated = {};
    keys.forEach(weekKey => {
      migrated[weekKey] = normalizeWeek(weeklyTasksObj[weekKey]);
    });
    return migrated;
  };

  // Получить колонки конкретного проекта (или дефолтный набор, если не настроены)
  const getProjectColumns = (projectId) => projectColumns[projectId] || DEFAULT_COLUMNS;

  // Пересчитать ID задач по порядку создания (id — таймстемп создания) — используется для миграции
  const renumberTasksByCreationOrder = (tasksObj, projectsList) => {
    const newTasksObj = { ...tasksObj };

    projectsList.forEach(project => {
      const projectCode = getProjectCode(project.name);
      const allTasks = [];
      Object.values(newTasksObj[project.id] || {}).forEach(columnTasks => {
        (columnTasks || []).forEach(task => allTasks.push(task));
      });
      allTasks.sort((a, b) => Number(a.id) - Number(b.id));
      allTasks.forEach((task, index) => {
        task.taskId = `${projectCode}-${index + 1}`;
      });
    });

    return newTasksObj;
  };

  // Обновить префикс ID задач при переименовании проекта, номера задач не меняются
  const updateTaskIdPrefixes = (tasksObj, project) => {
    const newTasksObj = { ...tasksObj };
    const projectCode = getProjectCode(project.name);

    Object.values(newTasksObj[project.id] || {}).forEach(columnTasks => {
      (columnTasks || []).forEach(task => {
        const match = task.taskId?.match(/-(\d+)$/);
        if (match) task.taskId = `${projectCode}-${match[1]}`;
      });
    });

    return newTasksObj;
  };

  // Следующий свободный номер задачи в проекте (номера не переиспользуются после удаления)
  const getNextTaskNumber = (tasksObj, projectId) => {
    let max = 0;
    Object.values(tasksObj[projectId] || {}).forEach(columnTasks => {
      (columnTasks || []).forEach(task => {
        const match = task.taskId?.match(/-(\d+)$/);
        if (match) max = Math.max(max, parseInt(match[1], 10));
      });
    });
    return max + 1;
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
        const savedNotes = localStorage.getItem('jira-notes');
        const savedCollapsedSubtasks = localStorage.getItem('jira-collapsed-subtasks');
        const savedDarkMode = localStorage.getItem('jira-darkMode');
        const savedTheme = localStorage.getItem('jira-theme');
        const savedAuth = localStorage.getItem(AUTH_KEY);
        const savedFlags = localStorage.getItem(FLAGS_KEY);
        const savedProjectLikes = localStorage.getItem('jira-project-likes');
        const savedZodiac = localStorage.getItem('jira-zodiac');

        if (savedAuth) setUser(JSON.parse(savedAuth));
        if (savedFlags) setFeatureFlags({ ...DEFAULT_FLAGS, ...JSON.parse(savedFlags) });
        if (savedProjectLikes) setProjectLikes(JSON.parse(savedProjectLikes));
        if (savedZodiac) setZodiac({ sign: DEFAULT_SIGN, birthDate: '', ...JSON.parse(savedZodiac) });
        const savedCurrentProject = localStorage.getItem('jira-currentProject');
        const savedCurrentPage = localStorage.getItem('jira-currentPage');

        // Адрес главнее сохранённого значения. Пусто в адресе — значит зашли
        // по иконке PWA (её start_url ведёт в корень), тогда берём последнее место
        const route = parseLocation();

        let proj = [];
        if (savedProjects) {
          // withSlugs досоздаёт адрес проектам, заведённым до его появления
          proj = withSlugs(JSON.parse(savedProjects));
          setProjects(proj);
          localStorage.setItem('jira-projects', JSON.stringify(proj));
        } else {
          const defaultProject = { id: 'default', name: 'PROJECT', slug: 'project' };
          proj = [defaultProject];
          setProjects(proj);
          localStorage.setItem('jira-projects', JSON.stringify(proj));
        }

        // Проект из ссылки главнее сохранённого. Проекта из ссылки может уже
        // не быть — тогда молча открываем последний использованный, а адрес
        // поправится сам следующим эффектом
        const fromUrl = route.page === 'kanban' && route.detail && proj.find(p => p.slug === route.detail);
        if (fromUrl) {
          setCurrentProject(fromUrl.id);
        } else if (savedCurrentProject && proj.find(p => p.id === savedCurrentProject)) {
          setCurrentProject(savedCurrentProject);
        } else {
          setCurrentProject(proj[0]?.id);
        }

        if (route.page === 'notes' && route.detail) setExpandedNoteId(route.detail);
        if (route.page === 'weekly' && route.detail === 'horoscope') setHoroscopeOpen(true);

        if (route.page) {
          setCurrentPage(route.page);
        } else if (savedCurrentPage) {
          setCurrentPage(savedCurrentPage === 'wishlist' ? 'notes' : savedCurrentPage);
        }

        let loadedTasks = {};
        if (savedTasks) {
          loadedTasks = JSON.parse(savedTasks);
        } else {
          localStorage.setItem('jira-tasks', JSON.stringify({}));
        }

        // Мигрировать/пересчитать ID задач по порядку создания
        const migratedTasks = renumberTasksByCreationOrder(loadedTasks, proj);
        setTasks(migratedTasks);
        localStorage.setItem('jira-tasks', JSON.stringify(migratedTasks));

        if (savedColumns) {
          setProjectColumns(JSON.parse(savedColumns));
        }

        if (savedWeeklyTasks) {
          // Результат миграции сразу сохраняем: иначе при следующем запуске
          // старый плоский формат привязался бы уже к другой неделе
          const migratedWeekly = migrateWeeklyTasks(JSON.parse(savedWeeklyTasks));
          setWeeklyTasks(migratedWeekly);
          localStorage.setItem('jira-weekly-tasks', JSON.stringify(migratedWeekly));
        } else {
          localStorage.setItem('jira-weekly-tasks', JSON.stringify({}));
          setWeeklyTasks({});
        }

        const loadedNotes = savedNotes ? JSON.parse(savedNotes) : [];
        const savedWishlistItems = savedWishlist ? JSON.parse(savedWishlist) : [];
        const foldedNotes = foldWishlistIntoNotes(savedWishlistItems, loadedNotes);
        // Заметок нет и раньше не было — значит пользователь здесь впервые
        const notesWithWishlist = foldedNotes.length || savedNotes ? foldedNotes : createStarterNotes();
        setNotes(notesWithWishlist);
        localStorage.setItem('jira-notes', JSON.stringify(notesWithWishlist));
        // Ключ убираем, иначе на следующем запуске появилась бы вторая копия заметки
        localStorage.removeItem('jira-wishlist');

        if (savedCollapsedSubtasks) {
          setCollapsedSubtasks(JSON.parse(savedCollapsedSubtasks));
        }

        // Старые версии хранили только флаг тёмной темы — переносим его в новое поле
        if (savedTheme) {
          setTheme(JSON.parse(savedTheme));
        } else if (savedDarkMode) {
          setTheme(JSON.parse(savedDarkMode) ? 'dark' : 'light');
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

  const saveNotes = (newNotes) => {
    setNotes(newNotes);
    safeSetItem('jira-notes', JSON.stringify(newNotes));
  };

  const saveCollapsedSubtasks = (newCollapsed) => {
    setCollapsedSubtasks(newCollapsed);
    safeSetItem('jira-collapsed-subtasks', JSON.stringify(newCollapsed));
  };

  const saveProjectColumns = (newProjectColumns) => {
    setProjectColumns(newProjectColumns);
    safeSetItem('jira-columns', JSON.stringify(newProjectColumns));
  };

  // Обновить набор колонок конкретного проекта
  const updateProjectColumns = (projectId, newColumns) => {
    saveProjectColumns({ ...projectColumns, [projectId]: newColumns });
  };

  // Сохранение доступов: список общий для всех устройств, поэтому уезжает и в облако
  useEffect(() => {
    if (loading) return;
    safeSetItem(FLAGS_KEY, JSON.stringify(featureFlags));
  }, [featureFlags, loading]);

  // Где включены лайки — настройка проекта, а не устройства, поэтому тоже в облако
  useEffect(() => {
    if (loading) return;
    safeSetItem('jira-project-likes', JSON.stringify(projectLikes));
  }, [projectLikes, loading]);

  useEffect(() => {
    if (loading) return;
    safeSetItem('jira-zodiac', JSON.stringify(zodiac));
  }, [zodiac, loading]);

  // Сохранение темы
  useEffect(() => {
    localStorage.setItem('jira-theme', JSON.stringify(theme));
    // Флаг оставляем ради старых копий данных и облака
    localStorage.setItem('jira-darkMode', JSON.stringify(darkMode));
    // Волшебство целиком живёт в CSS: класс на <html> перекрашивает весь сайт
    document.documentElement.classList.toggle('theme-wizard', theme === 'wizard');
    document.documentElement.classList.toggle('theme-surf', theme === 'surf');
    document.documentElement.classList.toggle('theme-millenial', theme === 'millenial');
    document.documentElement.classList.toggle('theme-handwriting', theme === 'handwriting');
    // Родные списки в выпадашках должны быть тёмными в тёмной теме
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    // В установленном PWA этим красится строка состояния телефона
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light);
  }, [theme, darkMode]);

  // Сохранение текущего проекта
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem('jira-currentProject', currentProject);
    }
  }, [currentProject]);

  // Сохранение текущей страницы. Значение остаётся как «где я был в прошлый
  // раз» — им пользуется только заход по иконке PWA, у которой раздела в адресе нет
  useEffect(() => {
    localStorage.setItem('jira-currentPage', currentPage);
  }, [currentPage]);

  // Состояние → адрес. Пока данные грузятся, адрес не трогаем: иначе первый же
  // проход затрёт раздел из ссылки, по которой пришли.
  // Первая синхронизация — replace (просто дописываем раздел в адрес входа),
  // дальше push: без записей в истории «назад» на Android закрывает приложение,
  // а не возвращает на предыдущий раздел
  useEffect(() => {
    if (loading) return;
    // Второй сегмент адреса свой у каждого раздела: у доски проект, у заметок
    // открытая заметка
    const detail = currentPage === 'kanban'
      ? projects.find(p => p.id === currentProject)?.slug
      : currentPage === 'notes' ? expandedNoteId
      : currentPage === 'weekly' ? (horoscopeOpen ? 'horoscope' : null)
      : null;

    // Закрытие не должно копить историю: иначе «назад» после закрытия открывало
    // бы то же самое снова. Открытие, наоборот, запись создаёт — ей и отвечает
    // системный жест возврата. Проект на доске так себя не ведёт: он не
    // открывается и не закрывается, а всегда какой-то есть
    const closingDetail = currentPage !== 'kanban' && lastDetail.current && !detail;
    navigate(currentPage, detail, { replace: !routeSynced.current || closingDetail });
    lastDetail.current = detail;
    routeSynced.current = true;
  }, [currentPage, currentProject, projects, expandedNoteId, horoscopeOpen, loading]);

  // Адрес → состояние: «назад» и «вперёд» в браузере, а в установленном PWA —
  // системная кнопка «назад» на Android и свайп от края на iOS
  useEffect(() => onRouteChange(() => {
    const route = parseLocation();
    if (route.page) setCurrentPage(route.page);
    // Заметка открыта ровно тогда, когда её id стоит в адресе
    setExpandedNoteId(route.page === 'notes' ? route.detail : null);
    setHoroscopeOpen(route.page === 'weekly' && route.detail === 'horoscope');
    const target = route.page === 'kanban' && route.detail && projects.find(p => p.slug === route.detail);
    if (target) setCurrentProject(target.id);
  }), [projects]);

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
      writeStateToFile(fileHandle, { projects, tasks, projectColumns, weeklyTasks, notes, collapsedSubtasks });
    }, 300);
    return () => clearTimeout(fileSaveTimeout.current);
  }, [projects, tasks, projectColumns, weeklyTasks, notes, collapsedSubtasks, fileHandle, fileConnected, loading]);

  // Первичная загрузка данных из Supabase (перекрывает localStorage, если на сервере уже что-то есть)
  useEffect(() => {
    if (loading || !isSupabaseConfigured || remoteFetchDone.current) return;

    (async () => {
      setSupabaseStatus('loading');
      try {
        const remote = await loadRemoteState();
        if (remote) {
          if (remote.projects) saveProjects(withSlugs(remote.projects));
          if (remote.tasks) {
            saveTasks(renumberTasksByCreationOrder(remote.tasks, remote.projects || projects));
          }
          if (remote.columns) saveProjectColumns(remote.columns);
          if (remote.weeklyTasks) saveWeeklyTasks(migrateWeeklyTasks(remote.weeklyTasks));
          if (remote.notes || remote.wishlist) {
            saveNotes(foldWishlistIntoNotes(remote.wishlist, remote.notes || notes));
          }
          if (remote.collapsedSubtasks) saveCollapsedSubtasks(remote.collapsedSubtasks);
          if (remote.settings?.featureFlags) setFeatureFlags({ ...DEFAULT_FLAGS, ...remote.settings.featureFlags });
          if (remote.settings?.projectLikes) setProjectLikes(remote.settings.projectLikes);
          // Слияние по полям, а не замена целиком: в облаке может лежать запись,
          // сделанная до появления времени и места рождения, и подмена целиком
          // стёрла бы их сразу после ввода
          if (remote.settings?.zodiac) setZodiac(prev => ({ ...prev, ...remote.settings.zodiac }));
          if (remote.settings?.theme) setTheme(remote.settings.theme);
          else if (remote.settings?.darkMode !== undefined) setTheme(remote.settings.darkMode ? 'dark' : 'light');
        }
        setSupabaseStatus('synced');
        setSupabaseError(null);
        // Отправку в облако разрешаем только после успешного скачивания.
        // Раньше флаг ставился в finally, то есть и при ошибке: запуск без сети
        // открывал отправку, и пустое локальное состояние затирало актуальное
        remoteFetchDone.current = true;
      } catch (err) {
        console.error('Supabase load error:', err);
        setSupabaseStatus('error');
        setSupabaseError(err.message);
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
          notes,
          collapsedSubtasks,
          // currentProject/currentPage сюда не кладём: раздел и проект — дело
          // конкретного устройства, синхронизировать их значит дёргать чужой экран
          settings: { darkMode, theme, featureFlags, projectLikes, zodiac }
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
  }, [projects, tasks, projectColumns, weeklyTasks, notes, collapsedSubtasks, theme, darkMode, featureFlags, projectLikes, zodiac, loading]);

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
          if (parsed.projects || parsed.tasks || parsed.projectColumns || parsed.weeklyTasks || parsed.wishlist || parsed.notes) {
            if (confirm('This file already contains data. Load it (replacing the current data)?')) {
              if (parsed.projects) saveProjects(parsed.projects);
              if (parsed.tasks) {
                saveTasks(renumberTasksByCreationOrder(parsed.tasks, parsed.projects || projects));
              }
              if (parsed.projectColumns) saveProjectColumns(parsed.projectColumns);
              if (parsed.weeklyTasks) saveWeeklyTasks(migrateWeeklyTasks(parsed.weeklyTasks));
              if (parsed.notes || parsed.wishlist) {
                saveNotes(foldWishlistIntoNotes(parsed.wishlist, parsed.notes || notes));
              }
              if (parsed.collapsedSubtasks) saveCollapsedSubtasks(parsed.collapsedSubtasks);
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

  // Создать новый проект. Имя можно передать явно: на телефоне проекты заводят
  // из переключателя на самом борде, а не из поля в сайдбаре со своим состоянием
  const createProject = (name = newProjectName) => {
    const title = (name || '').trim();
    if (!title) return;

    const newProject = {
      id: Date.now().toString(),
      name: title,
      slug: uniqueSlug(title, projects.map(p => p.slug).filter(Boolean))
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

    // Обновить префикс ID задач под новое название проекта (номера задач сохраняются)
    const migratedTasks = updateTaskIdPrefixes(tasks, { id: projectId, name: editingProjectName });
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

  // Создать задачу. Колонка приходит оттуда, куда нажали, — на борде задачу
  // добавляют прямо в нужном столбце, поэтому выбирать её отдельно не нужно
  const createTask = (title, columnId) => {
    const taskTitle = (title || '').trim();
    if (!taskTitle || !currentProject || !columnId) return;

    const now = new Date();
    const project = projects.find(p => p.id === currentProject);
    const projectCode = getProjectCode(project?.name);
    const taskId = `${projectCode}-${getNextTaskNumber(tasks, currentProject)}`;

    const newTask = {
      id: Date.now().toString(),
      taskId: taskId,
      title: taskTitle,
      description: { content: '', editorState: null },
      priority: 'medium',
      images: [],
      createdAt: now.toLocaleDateString('en-US'),
      history: [
        {
          timestamp: now.toLocaleString('en-US'),
          action: 'Task created',
          changes: { title: taskTitle }
        }
      ]
    };

    const newTasks = { ...tasks };
    if (!newTasks[currentProject]) {
      newTasks[currentProject] = {};
    }
    if (!newTasks[currentProject][columnId]) {
      newTasks[currentProject][columnId] = [];
    }

    newTasks[currentProject][columnId].push(newTask);
    saveTasks(newTasks);
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

    saveTasks(newTasks);

    if (collapsedSubtasks[taskId]) {
      const newCollapsed = { ...collapsedSubtasks };
      delete newCollapsed[taskId];
      saveCollapsedSubtasks(newCollapsed);
    }

    if (editingTask?.id === taskId) {
      setEditingTask(null);
      setHasUnsavedChanges(false);
    }
  };

  // Сохранить и закрыть редактор. Третьим аргументом редактор передаёт выбранного
  // родителя: тогда та же кнопка Save и правки применит, и задачу сделает подзадачей
  const handleTaskSave = (updatedTask, skipClose, parentTaskId) => {
    const newTasks = { ...tasks };
    const found = findTaskLocation(newTasks, updatedTask.id);
    if (!found) return;

    newTasks[currentProject][found.columnId] = newTasks[currentProject][found.columnId]
      .map(t => (t.id === updatedTask.id ? updatedTask : t));

    const converted = applyConvertToSubtask(newTasks, updatedTask.id, parentTaskId);

    saveTasks(newTasks);

    if (converted && collapsedSubtasks[updatedTask.id]) {
      const newCollapsed = { ...collapsedSubtasks };
      delete newCollapsed[updatedTask.id];
      saveCollapsedSubtasks(newCollapsed);
    }

    // После переезда редактировать больше нечего — задача стала подзадачей
    if (!skipClose || converted) {
      setEditingTask(null);
      setHasUnsavedChanges(false);
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

  // Переместить задачу в другой проект
  const moveTaskToProject = (taskId, targetProjectId, targetColumnId) => {
    if (!targetProjectId || targetProjectId === currentProject) return;

    const newTasks = { ...tasks };
    let movedTask = null;

    for (const column of getProjectColumns(currentProject)) {
      const columnTasks = newTasks[currentProject]?.[column.id];
      if (!columnTasks) continue;
      const index = columnTasks.findIndex(t => t.id === taskId);
      if (index !== -1) {
        [movedTask] = columnTasks.splice(index, 1);
        break;
      }
    }
    if (!movedTask) return;

    const targetProject = projects.find(p => p.id === targetProjectId);
    movedTask.taskId = `${getProjectCode(targetProject?.name)}-${getNextTaskNumber(newTasks, targetProjectId)}`;

    if (!newTasks[targetProjectId]) newTasks[targetProjectId] = {};
    if (!newTasks[targetProjectId][targetColumnId]) newTasks[targetProjectId][targetColumnId] = [];
    newTasks[targetProjectId][targetColumnId].push(movedTask);

    saveTasks(newTasks);
    setEditingTask(null);
    setHasUnsavedChanges(false);
  };

  // Найти задачу по id в текущем проекте: колонка, позиция и сам объект
  const findTaskLocation = (source, taskId) => {
    for (const column of getProjectColumns(currentProject)) {
      const list = source[currentProject]?.[column.id];
      if (!list) continue;
      const index = list.findIndex(t => t.id === taskId);
      if (index !== -1) return { columnId: column.id, index, task: list[index] };
    }
    return null;
  };

  // Подзадача становится самостоятельной задачей и встаёт сразу под родителем
  const promoteSubtaskToTask = (parentTaskId, subtaskId) => {
    const newTasks = { ...tasks };
    const parent = findTaskLocation(newTasks, parentTaskId);
    if (!parent) return;

    const subtask = (parent.task.subtasks || []).find(s => s.id === subtaskId);
    if (!subtask) return;

    parent.task.subtasks = (parent.task.subtasks || []).filter(s => s.id !== subtaskId);

    const now = new Date();
    const projectCode = getProjectCode(projects.find(p => p.id === currentProject)?.name);
    const promoted = {
      id: Date.now().toString(),
      taskId: `${projectCode}-${getNextTaskNumber(newTasks, currentProject)}`,
      title: subtask.title,
      description: { content: '', editorState: null },
      priority: parent.task.priority || 'medium',
      images: [],
      subtasks: [],
      createdAt: now.toLocaleDateString('en-US'),
      history: [
        {
          timestamp: now.toLocaleString('en-US'),
          action: `Promoted from subtask of ${parent.task.taskId}`,
          changes: { title: subtask.title }
        }
      ]
    };

    newTasks[currentProject][parent.columnId] = [
      ...newTasks[currentProject][parent.columnId].slice(0, parent.index + 1),
      promoted,
      ...newTasks[currentProject][parent.columnId].slice(parent.index + 1)
    ];

    saveTasks(newTasks);
  };

  // Превратить задачу в подзадачу другой прямо внутри переданного набора задач.
  // Отдельным действием это не сохраняется — вызывается из handleTaskSave, чтобы
  // правки и переезд применились одним махом по кнопке Save
  const applyConvertToSubtask = (source, taskId, parentTaskId) => {
    if (!taskId || !parentTaskId || taskId === parentTaskId) return false;

    const child = findTaskLocation(source, taskId);
    const parent = findTaskLocation(source, parentTaskId);
    if (!child || !parent) return false;

    source[currentProject][child.columnId] = source[currentProject][child.columnId]
      .filter(t => t.id !== taskId);

    const stamp = Date.now();
    parent.task.subtasks = [
      ...(parent.task.subtasks || []),
      { id: `${stamp}`, title: child.task.title, completed: false },
      // Подзадачи бывшей задачи не теряются — становятся соседями по новому родителю
      ...(child.task.subtasks || []).map((s, i) => ({ ...s, id: `${stamp}-${i}` }))
    ];

    return true;
  };

  // Переключить подзадачу прямо на борде
  const toggleTaskSubtask = (taskId, columnId, subtaskId) => {
    const newTasks = { ...tasks };
    const columnTasks = newTasks[currentProject]?.[columnId];
    if (!columnTasks) return;
    const task = columnTasks.find(t => t.id === taskId);
    if (!task?.subtasks) return;
    task.subtasks = task.subtasks.map(s => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
    saveTasks(newTasks);
  };

  // Лайк — от имени вошедшего: храним список пользователей, чтобы двое
  // не перебивали отметку друг друга и было видно, ставил ли ты сам
  const toggleTaskLike = (taskId, columnId) => {
    const username = user?.username;
    if (!username) return;

    const newTasks = { ...tasks };
    const columnTasks = newTasks[currentProject]?.[columnId];
    if (!columnTasks) return;

    newTasks[currentProject] = { ...newTasks[currentProject] };
    newTasks[currentProject][columnId] = columnTasks.map(task => {
      if (task.id !== taskId) return task;
      const likes = task.likes || [];
      return {
        ...task,
        likes: likes.includes(username) ? likes.filter(u => u !== username) : [...likes, username]
      };
    });
    saveTasks(newTasks);
  };

  // Свернуть/развернуть подзадачи задачи на борде (состояние запоминается между сессиями)
  const toggleSubtasksCollapsed = (taskId) => {
    const newCollapsed = { ...collapsedSubtasks };
    if (newCollapsed[taskId]) {
      delete newCollapsed[taskId];
    } else {
      newCollapsed[taskId] = true;
    }
    saveCollapsedSubtasks(newCollapsed);
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
  // Сортировка всего борда по важности: одна кнопка на доске, одно сохранение
  const sortBoardByPriority = () => {
    const board = tasks[currentProject];
    if (!board) return;

    const sorted = {};
    for (const column of getProjectColumns(currentProject)) {
      const columnTasks = board[column.id];
      sorted[column.id] = columnTasks
        ? [...columnTasks].sort(
            (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
          )
        : columnTasks;
    }

    saveTasks({ ...tasks, [currentProject]: { ...board, ...sorted } });
  };

  // Все операции с расписанием адресуются к конкретной неделе (weekKey — дата её понедельника)
  const updateWeek = (weekKey, updateDays) => {
    const week = { ...(weeklyTasks[weekKey] || normalizeWeek(null)) };
    const updatedWeek = updateDays(week);
    if (!updatedWeek) return;
    saveWeeklyTasks({ ...weeklyTasks, [weekKey]: updatedWeek });
  };

  // Добавить задачу в недельный список
  const addWeeklyTask = (weekKey, day, title, time) => {
    if (!title.trim()) return;
    updateWeek(weekKey, week => ({
      ...week,
      [day]: [
        ...(week[day] || []),
        { id: Date.now().toString(), title, completed: false, time: time || '' }
      ]
    }));
  };

  // Удалить задачу из недельного списка
  const deleteWeeklyTask = (weekKey, day, taskId) => {
    updateWeek(weekKey, week => ({
      ...week,
      [day]: (week[day] || []).filter(t => t.id !== taskId)
    }));
  };

  // Переключить статус недельной задачи
  const toggleWeeklyTask = (weekKey, day, taskId) => {
    updateWeek(weekKey, week => ({
      ...week,
      [day]: (week[day] || []).map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    }));
  };

  // Отметить задачу как особенно важную
  const toggleWeeklyTaskImportant = (weekKey, day, taskId) => {
    updateWeek(weekKey, week => ({
      ...week,
      [day]: (week[day] || []).map(t => (t.id === taskId ? { ...t, important: !t.important } : t))
    }));
  };

  // Перенести задачу: и в другой день, и на другое место внутри своего дня.
  // insertAt — позиция в списке дня-приёмника, каким его видит пользователь;
  // null означает «в конец», как при переносе броском на пустое место карточки
  const moveWeeklyTask = (weekKey, fromDay, toDay, taskId, insertAt = null) => {
    updateWeek(weekKey, week => {
      const source = week[fromDay] || [];
      const from = source.findIndex(t => t.id === taskId);
      if (from === -1) return null;
      const task = source[from];

      if (fromDay === toDay) {
        const rest = source.filter(t => t.id !== taskId);
        // Задачу сначала вынимаем, поэтому всё, что было правее её, сдвинулось влево
        const target = insertAt === null ? rest.length : insertAt > from ? insertAt - 1 : insertAt;
        const at = Math.max(0, Math.min(target, rest.length));
        if (at === from) return null;
        rest.splice(at, 0, task);
        return { ...week, [toDay]: rest };
      }

      const target = [...(week[toDay] || [])];
      const at = insertAt === null ? target.length : Math.max(0, Math.min(insertAt, target.length));
      target.splice(at, 0, task);
      return {
        ...week,
        [fromDay]: source.filter(t => t.id !== taskId),
        [toDay]: target
      };
    });
  };

  // Редактировать текст и время недельной задачи
  const editWeeklyTask = (weekKey, day, taskId, newTitle, newTime) => {
    if (!newTitle.trim()) return;
    updateWeek(weekKey, week => ({
      ...week,
      [day]: (week[day] || []).map(t =>
        t.id === taskId ? { ...t, title: newTitle, time: newTime || '' } : t
      )
    }));
  };

  // Создать новую заметку
  const addNote = () => {
    saveNotes([
      ...notes,
      {
        id: Date.now().toString(),
        title: '',
        // Строки заметки: тип у каждой свой, поэтому текст и пункты идут вперемешку
        lines: [emptyLine()],
        // Каким становится пункт при превращении текста в список
        mode: 'bullet',
        color: 'default',
        images: [],
        updatedAt: new Date().toLocaleString('en-US')
      }
    ]);
  };

  // Отредактировать содержимое заметки
  const updateNoteLines = (noteId, lines) => {
    saveNotes(notes.map(n => (n.id === noteId ? { ...n, lines, updatedAt: new Date().toLocaleString('en-US') } : n)));
  };

  // Удалить заметку
  const deleteNote = (noteId) => {
    saveNotes(notes.filter(n => n.id !== noteId));
  };

  // Переименовать заметку
  const updateNoteTitle = (noteId, title) => {
    saveNotes(notes.map(n => (n.id === noteId ? { ...n, title, updatedAt: new Date().toLocaleString('en-US') } : n)));
  };

  const stampNote = (noteId, patch) =>
    saveNotes(notes.map(n => (
      n.id === noteId
        ? { ...n, ...patch, updatedAt: new Date().toLocaleString('en-US') }
        : n
    )));

  // Покрасить заметку (updatedAt не меняем — это оформление, а не содержимое)
  const setNoteColor = (noteId, color) => {
    saveNotes(notes.map(n => (n.id === noteId ? { ...n, color } : n)));
  };

  // Заблюрить/показать текст заметки (updatedAt не меняем — содержимое не тронуто)
  const toggleNoteBlur = (noteId) => {
    saveNotes(notes.map(n => (n.id === noteId ? { ...n, blurred: !n.blurred } : n)));
  };

  // Переставить заметки местами (drag & drop)
  const reorderNotes = (fromIndex, toIndex) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 || fromIndex >= notes.length ||
      toIndex < 0 || toIndex >= notes.length
    ) return;

    const newNotes = [...notes];
    const [movedNote] = newNotes.splice(fromIndex, 1);
    newNotes.splice(toIndex, 0, movedNote);
    saveNotes(newNotes);
  };

  // Сбросить все данные и настройки сайта к исходному состоянию
  const resetAllData = () => {
    STORAGE_KEYS.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Reset storage error:', error);
      }
    });

    const defaultProject = { id: 'default', name: 'PROJECT' };

    setEditingTask(null);
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    setPendingProject(null);
    setEditingProjectId(null);
    setEditingProjectName('');
    setNewProjectName('');
    setNewTaskTitle('');
    setNewTaskColumn(DEFAULT_COLUMNS[0].id);

    saveProjects([defaultProject]);
    saveTasks({});
    saveProjectColumns({});
    saveWeeklyTasks({});
    saveNotes([]);
    saveCollapsedSubtasks({});
    setTheme('light');
    setCurrentProject(defaultProject.id);
    setCurrentPage('kanban');
  };

  const allowed = (feature) => canUse(feature, user, featureFlags);

  const handleSignIn = (signedIn) => {
    setUser(signedIn);
    localStorage.setItem(AUTH_KEY, JSON.stringify(signedIn));
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  // Если раздел закрыли, пока пользователь в нём сидел, уводим на первый доступный
  useEffect(() => {
    if (!user || loading) return;
    if (!PAGE_FEATURES.includes(currentPage)) return;
    if (canUse(currentPage, user, featureFlags)) return;
    const fallback = PAGE_FEATURES.find(page => canUse(page, user, featureFlags));
    setCurrentPage(fallback || 'settings');
  }, [user, featureFlags, currentPage, loading]);

  if (loading) {
    return <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>Loading...</div>;
  }

  if (!user) {
    return (
      <div data-app className="flex h-full bg-gray-50">
        <ThemeFx theme={theme} />
        <LoginScreen onSignIn={handleSignIn} darkMode={darkMode} />
      </div>
    );
  }

  return (
    <div data-app className="flex flex-col sm:flex-row h-full bg-gray-50">
      <ThemeFx theme={theme} />
      {storageError && <StorageErrorBanner />}

      {showConfirmDialog && (
        <ConfirmDialog darkMode={darkMode} onConfirm={handleConfirmSwitchProject} />
      )}

      <Sidebar
        darkMode={darkMode}
        theme={theme}
        user={user}
        allowed={allowed}
        onSignOut={handleSignOut}
        fileSupported={fileSupported}
        fileConnected={fileConnected}
        fileHandle={fileHandle}
        fileName={fileName}
        reconnectFile={reconnectFile}
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

      {/* Основное содержимое. min-h-0 обязателен: без него колонка на телефоне
          растягивается под свой контент и выталкивает навигацию за экран */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      {editingTask && currentPage === 'kanban' && (
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
          projects={projects}
          currentProjectId={currentProject}
          getProjectColumns={getProjectColumns}
          onMoveToProject={moveTaskToProject}
          // Кандидаты в родители — остальные задачи текущего проекта
          projectTasks={getProjectColumns(currentProject)
            .flatMap(column => (tasks[currentProject]?.[column.id] || []))
            .filter(t => t.id !== editingTask.id)}
          // Лейблы, уже встречавшиеся в проекте — для подсказок
          knownLabels={[...new Set(
            getProjectColumns(currentProject)
              .flatMap(column => (tasks[currentProject]?.[column.id] || []))
              .flatMap(t => t.labels || [])
          )].sort()}
        />
      )}

      {currentPage === 'kanban' ? (
        <>
          {taskAddedNotification && <TaskAddedNotification />}
          <KanbanBoard
            currentProject={currentProject}
            projects={projects}
            selectProject={handleProjectClick}
            createProject={createProject}
            tasks={tasks}
            columns={getProjectColumns(currentProject)}
            createTask={createTask}
            likesEnabled={allowed('likes') && !!projectLikes[currentProject]}
            currentUsername={user?.username}
            toggleTaskLike={toggleTaskLike}
            setEditingTask={setEditingTask}
            moveTask={moveTask}
            reorderTasksInColumn={reorderTasksInColumn}
            sortBoardByPriority={sortBoardByPriority}
            toggleTaskSubtask={toggleTaskSubtask}
            promoteSubtaskToTask={promoteSubtaskToTask}
            collapsedSubtasks={collapsedSubtasks}
            toggleSubtasksCollapsed={toggleSubtasksCollapsed}
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
          moveWeeklyTask={moveWeeklyTask}
          toggleWeeklyTaskImportant={toggleWeeklyTaskImportant}
          theme={theme}
          darkMode={darkMode}
          weekDays={weekDays}
          zodiacSign={zodiacSign}
          risingSign={risingSign}
          moonSign={natal.moon}
          moonExact={natal.moonExact}
          horoscopeOpen={horoscopeOpen}
          setHoroscopeOpen={setHoroscopeOpen}
        />
      ) : currentPage === 'notes' ? (
        <Notes
          notes={notes}
          addNote={addNote}
          expandedNoteId={expandedNoteId}
          setExpandedNoteId={setExpandedNoteId}
          updateNoteLines={updateNoteLines}
          updateNoteTitle={updateNoteTitle}
          setNoteColor={setNoteColor}
          deleteNote={deleteNote}
          toggleNoteBlur={toggleNoteBlur}
          reorderNotes={reorderNotes}
          darkMode={darkMode}
          theme={theme}
        />
      ) : currentPage === 'chill' ? (
        <ChillTimer darkMode={darkMode} theme={theme} />
      ) : (
        <SettingsPage
          darkMode={darkMode}
          theme={theme}
          setTheme={setTheme}
          user={user}
          allowed={allowed}
          featureFlags={featureFlags}
          setFeatureFlags={setFeatureFlags}
          projectLikes={projectLikes}
          setProjectLikes={setProjectLikes}
          zodiac={zodiac}
          setZodiac={setZodiac}
          zodiacSign={zodiacSign}
          risingSign={risingSign}
          moonSign={natal.moon}
          onSignOut={handleSignOut}
          projects={projects}
          currentProject={currentProject}
          getProjectColumns={getProjectColumns}
          updateProjectColumns={updateProjectColumns}
          resetAllData={resetAllData}
          supabaseConfigured={isSupabaseConfigured}
          supabaseStatus={supabaseStatus}
          supabaseError={supabaseError}
          fileSupported={fileSupported}
          fileConnected={fileConnected}
          fileHandle={fileHandle}
          fileName={fileName}
          connectFile={connectFile}
          reconnectFile={reconnectFile}
          disconnectFile={disconnectFile}
        />
      )}
      </div>

      <MobileNav
        darkMode={darkMode}
        theme={theme}
        allowed={allowed}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}
