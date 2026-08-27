import React, { useState } from 'react';
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
      <div className={`p-4 sm:p-6 pl-14 sm:pl-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between gap-2`}>
        <h1 className={`text-lg sm:text-2xl font-bold truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>Surf the Task</h1>
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
        <button
          onClick={() => {
            if (currentPage === 'kanban') {
              setProjectsCollapsed(!projectsCollapsed);
            } else {
              setCurrentPage('kanban');
              setProjectsCollapsed(false);
            }
          }}
          className={`w-full flex items-center gap-2 px-4 py-2 rounded font-medium press ${
            currentPage === 'kanban'
              ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
              : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ProjectsIcon size={18} />
          <span className="flex-1 text-left">Projects</span>
          {currentPage === 'kanban' && (projectsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
        </button>
        )}

        {allowed('kanban') && currentPage === 'kanban' && (
          <div className="mb-4 pl-4">
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

      {/* Кто вошёл и выход */}
      {user && (
        <div className={`px-4 py-3 flex items-center gap-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
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

      <div className="flex-1 overflow-y-auto p-4">
        {currentPage === 'kanban' && (
          <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && createProject()}
                placeholder="New project..."
                className={`flex-1 min-w-0 px-2 py-2 text-sm border rounded focus:outline-none focus:border-green-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
              />
              <button
                onClick={createProject}
                className="p-2 bg-green-800 text-white rounded hover:bg-green-900 press"
              >
                <AddIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
