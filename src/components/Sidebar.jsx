import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, Edit2, X, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { themeIcon } from '../themes';
import FileSyncStatus from './FileSyncStatus';
import CloudSyncStatus from './CloudSyncStatus';

export default function Sidebar({
  darkMode,
  theme,
  user,
  allowed = () => true,
  onSignOut,
  fileSupported,
  fileConnected,
  fileHandle,
  fileName,
  reconnectFile,
  supabaseConfigured,
  supabaseStatus,
  supabaseError,
  currentPage,
  setCurrentPage,
  mobileOpen,
  projects,
  currentProject,
  editingProjectId,
  editingProjectName,
  setEditingProjectId,
  setEditingProjectName,
  handleProjectClick,
  updateProjectName,
  deleteProject,
  newProjectName,
  setNewProjectName,
  createProject
}) {
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  // Поле нового проекта открывается кнопкой и закрывается сразу после ввода:
  // проекты заводят редко, и постоянно занятая строка в списке только мешает
  const [addingProject, setAddingProject] = useState(false);
  const brandRef = useRef(null);

  // Название приложения — логотип: оно должно читаться целиком в любой теме.
  // Шрифты у тем разные и «широкие» из них не влезают в сайдбар, поэтому
  // ширину меряем и, если не хватило, ужимаем масштабом. Обрезать нельзя.
  useLayoutEffect(() => {
    const title = brandRef.current;
    if (!title) return;

    const fit = () => {
      const room = title.parentElement?.clientWidth || 0;
      // scrollWidth — натуральная ширина: transform на разметку не влияет
      const natural = title.scrollWidth;
      // +1px запаса: scrollWidth округляет, и по краю буква иногда режется
      const scale = room && natural + 1 > room ? room / (natural + 1) : 1;
      title.style.transform = scale < 1 ? `scale(${scale})` : '';
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(title.parentElement);
    // Веб-шрифт темы приезжает позже первой отрисовки и меняет ширину
    document.fonts?.ready.then(fit).catch(() => {});
    return () => observer.disconnect();
  }, [theme]);

  // Ушли с борда — незаконченное поле проекта закрываем, иначе оно ждёт
  // возвращения с набранным текстом
  useEffect(() => {
    if (currentPage !== 'kanban') setAddingProject(false);
  }, [currentPage]);

  // Иконки разделов задаёт тема: в Wizard это замок и свиток, в Surf — компас и ракушка
  const ProjectsIcon = themeIcon(theme, 'projects');
  const ScheduleIcon = themeIcon(theme, 'schedule');
  const NotesIcon = themeIcon(theme, 'notes');
  const ChillIcon = themeIcon(theme, 'chill');
  const SettingsIcon = themeIcon(theme, 'settings');
  const AddIcon = themeIcon(theme, 'add');

  return (
    <div
      data-sidebar
      className={`w-64 sm:w-56 lg:w-64 flex-shrink-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col overflow-y-auto
        fixed inset-y-0 left-0 z-50 pt-[env(safe-area-inset-top)] transition-transform duration-200 ease-out
        sm:static sm:z-auto sm:translate-x-0 sm:pt-0 sm:transition-none ${
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      {/* Высота задана токеном, а не паддингами: на ней держится общий рубеж шапок */}
      <div className={`h-[var(--brand-h)] flex-shrink-0 px-4 pl-14 sm:pl-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between gap-2`}>
        <div className="flex-1 min-w-0">
          <h1
            ref={brandRef}
            className={`text-xl sm:text-[1.75rem] leading-tight font-bold whitespace-nowrap origin-left ${darkMode ? 'text-white' : 'text-gray-800'}`}
          >
            Surf the Task
          </h1>
        </div>
        <button
          onClick={() => setCurrentPage('settings')}
          className={`p-2 rounded-lg press ${
            currentPage === 'settings'
              ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
              : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
          title="Settings"
        >
          <SettingsIcon size={20} />
        </button>
      </div>

      {/* Кто вошёл и выход */}
      {user && (
        <div className={`h-[var(--user-h)] flex-shrink-0 px-4 flex items-center gap-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {user.name}
            </div>
            <div className={`text-[11px] uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {user.role === 'admin' ? 'Admin' : 'User'}
            </div>
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
            className={`p-2 rounded-lg press-icon flex-shrink-0 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}

      {/* Баннеры синхронизации идут после блока пользователя: его нижняя граница —
          общий рубеж с шапкой страницы, и вклиниваться выше неё нельзя */}
      <CloudSyncStatus
        darkMode={darkMode}
        configured={supabaseConfigured}
        status={supabaseStatus}
        error={supabaseError}
      />

      <FileSyncStatus
        darkMode={darkMode}
        fileSupported={fileSupported}
        fileConnected={fileConnected}
        fileHandle={fileHandle}
        fileName={fileName}
        reconnectFile={reconnectFile}
      />

      {/* Навигация */}
      <div className="p-4 space-y-2 border-b border-gray-300">
        {allowed('kanban') && (
        /* Три действия в одной строке: перейти на борд, завести проект,
           свернуть список. Подсветка активного раздела на всей строке, поэтому
           фон у обёртки, а кнопки внутри прозрачные */
        <div
          className={`flex items-center rounded font-medium ${
            currentPage === 'kanban'
              ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
              : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <button
            onClick={() => {
              setCurrentPage('kanban');
              setProjectsCollapsed(false);
            }}
            className="flex-1 min-w-0 flex items-center gap-2 px-4 py-2 rounded press"
          >
            <ProjectsIcon size={18} />
            <span className="flex-1 text-left">Projects</span>
          </button>
          {currentPage === 'kanban' && (
            <>
              <button
                onClick={() => {
                  setProjectsCollapsed(false);
                  setAddingProject(true);
                }}
                title="New project"
                aria-label="New project"
                className={`p-1.5 rounded press-icon ${darkMode ? 'hover:bg-green-800' : 'hover:bg-green-200'}`}
              >
                <AddIcon size={16} />
              </button>
              <button
                onClick={() => setProjectsCollapsed(prev => !prev)}
                title={projectsCollapsed ? 'Show projects' : 'Hide projects'}
                aria-label={projectsCollapsed ? 'Show projects' : 'Hide projects'}
                aria-expanded={!projectsCollapsed}
                className={`p-1.5 mr-2 rounded press-icon ${darkMode ? 'hover:bg-green-800' : 'hover:bg-green-200'}`}
              >
                {projectsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            </>
          )}
        </div>
        )}

        {allowed('kanban') && currentPage === 'kanban' && (
          <div className="mb-4 pl-4">
            {!projectsCollapsed && addingProject && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { createProject(); setAddingProject(false); }
                    if (e.key === 'Escape') { setNewProjectName(''); setAddingProject(false); }
                  }}
                  onBlur={() => { if (!newProjectName.trim()) setAddingProject(false); }}
                  autoFocus
                  placeholder="New project..."
                  aria-label="New project name"
                  className={`flex-1 min-w-0 px-2 py-2 text-sm border rounded focus:outline-none focus:border-green-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
                />
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { createProject(); setAddingProject(false); }}
                  aria-label="Create project"
                  className="p-2 bg-green-800 text-white rounded hover:bg-green-900 press"
                >
                  <AddIcon size={16} />
                </button>
              </div>
            )}
            {!projectsCollapsed && projects.map(project => (
              <div
                key={project.id}
                className={`p-3 rounded cursor-pointer mb-2 flex items-center justify-between group transition duration-150 ${
                  currentProject === project.id
                    ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
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
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex gap-1">
                  <button
                    onClick={() => {
                      setEditingProjectId(project.id);
                      setEditingProjectName(project.name);
                    }}
                    className={`p-1 rounded press-icon ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-green-200'}`}
                  >
                    <Edit2 size={14} className={darkMode ? 'text-green-400' : 'text-green-600'} />
                  </button>
                  {projects.length > 1 && (
                    <button
                      onClick={() => deleteProject(project.id)}
                      className={`p-1 rounded press-icon ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-red-100'}`}
                    >
                      <X size={14} className={darkMode ? 'text-red-400' : 'text-red-600'} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {allowed('weekly') && (
        <button
          onClick={() => setCurrentPage('weekly')}
          className={`w-full flex items-center gap-2 px-4 py-2 rounded font-medium press ${
            currentPage === 'weekly'
              ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
              : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ScheduleIcon size={18} /> Schedule
        </button>
        )}

        {allowed('notes') && (
        <button
          onClick={() => setCurrentPage('notes')}
          className={`w-full flex items-center gap-2 px-4 py-2 rounded font-medium press ${
            currentPage === 'notes'
              ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
              : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <NotesIcon size={18} /> Notes
        </button>
        )}

        {allowed('chill') && (
        <button
          onClick={() => setCurrentPage('chill')}
          className={`w-full flex items-center gap-2 px-4 py-2 rounded font-medium press ${
            currentPage === 'chill'
              ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
              : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ChillIcon size={18} /> Chill
        </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4"></div>
    </div>
  );
}
