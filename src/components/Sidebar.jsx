import React, { useState } from 'react';
import { Plus, Edit2, X, Home, Calendar, Settings, ChevronDown, ChevronRight, Coffee, StickyNote } from 'lucide-react';
import FileSyncStatus from './FileSyncStatus';
import CloudSyncStatus from './CloudSyncStatus';

export default function Sidebar({
  darkMode,
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

  return (
    <div className={`w-48 sm:w-64 flex-shrink-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col overflow-y-auto`}>
      <div className={`p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between gap-2`}>
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
          <Settings size={20} />
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
          <Home size={18} />
          <span className="flex-1 text-left">Projects</span>
          {currentPage === 'kanban' && (projectsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />)}
        </button>

        {currentPage === 'kanban' && (
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

        <button
          onClick={() => setCurrentPage('weekly')}
          className={`w-full flex items-center gap-2 px-4 py-2 rounded font-medium press ${
            currentPage === 'weekly'
              ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
              : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Calendar size={18} /> Schedule
        </button>

        <button
          onClick={() => setCurrentPage('notes')}
          className={`w-full flex items-center gap-2 px-4 py-2 rounded font-medium press ${
            currentPage === 'notes'
              ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
              : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <StickyNote size={18} /> Notes
        </button>

        <button
          onClick={() => setCurrentPage('chill')}
          className={`w-full flex items-center gap-2 px-4 py-2 rounded font-medium press ${
            currentPage === 'chill'
              ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
              : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Coffee size={18} /> Chill
        </button>
      </div>

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
                className={`flex-1 px-2 py-2 text-sm border rounded focus:outline-none focus:border-green-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
              />
              <button
                onClick={createProject}
                className="p-2 bg-green-800 text-white rounded hover:bg-green-900 press"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
