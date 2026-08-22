import React, { useState, useEffect } from 'react';
import { Moon, Sun, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { COLUMN_COLORS } from '../constants';

export default function SettingsPage({
  darkMode,
  setDarkMode,
  projects,
  currentProject,
  getProjectColumns,
  updateProjectColumns,
  resetAllData
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(currentProject);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (currentProject) setSelectedProjectId(currentProject);
  }, [currentProject]);

  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const labelClass = darkMode ? 'text-gray-300' : 'text-gray-700';
  const borderClass = darkMode ? 'border-gray-800' : 'border-gray-200';
  const cardBorderClass = darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white';
  const inputBgClass = darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900';

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const columns = selectedProjectId ? getProjectColumns(selectedProjectId) : [];

  const persistColumns = (newColumns) => {
    updateProjectColumns(selectedProjectId, newColumns);
  };

  const addColumn = () => {
    if (!newColumnTitle.trim()) return;
    const newColumn = {
      id: `col-${Date.now()}`,
      title: newColumnTitle.trim(),
      color: 'gray'
    };
    persistColumns([...columns, newColumn]);
    setNewColumnTitle('');
  };

  const removeColumn = (columnId) => {
    if (columns.length <= 1) return;
    if (!confirm('Delete this column? Move its tasks out first, or they will become hidden.')) return;
    persistColumns(columns.filter(c => c.id !== columnId));
  };

  const renameColumn = (columnId, title) => {
    persistColumns(columns.map(c => (c.id === columnId ? { ...c, title } : c)));
  };

  const recolorColumn = (columnId, color) => {
    persistColumns(columns.map(c => (c.id === columnId ? { ...c, color } : c)));
  };

  // Сброс всего сайта — двухшаговый, чтобы нельзя было стереть данные одним случайным кликом
  const handleReset = () => {
    resetAllData();
    setConfirmingReset(false);
    setSelectedProjectId('default');
    setNewColumnTitle('');
  };

  const moveColumn = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const newColumns = [...columns];
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    persistColumns(newColumns);
  };

  return (
    <div className={`flex-1 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-3xl mx-auto p-3 sm:p-8 space-y-6">
        <h2 className={`text-xl sm:text-2xl font-semibold ${textClass}`}>Settings</h2>

        {/* Theme */}
        <div className={`rounded-lg border p-4 sm:p-6 ${cardBorderClass}`}>
          <h3 className={`text-xs font-medium uppercase tracking-wide mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Theme
          </h3>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border press ${
              darkMode ? 'border-gray-700 text-yellow-400 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Light theme' : 'Dark theme'}
          </button>
        </div>

        {/* Project columns */}
        <div className={`rounded-lg border p-4 sm:p-6 ${cardBorderClass}`}>
          <h3 className={`text-xs font-medium uppercase tracking-wide mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Project columns
          </h3>

          <div className="mb-4">
            <label className={`block text-sm font-medium ${labelClass} mb-2`}>Project</label>
            <select
              value={selectedProjectId || ''}
              onChange={e => setSelectedProjectId(e.target.value)}
              className={`w-full px-4 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <div className="space-y-3">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border flex-wrap ${borderClass}`}
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveColumn(index, -1)}
                      disabled={index === 0}
                      className={`p-1 rounded disabled:opacity-30 press-icon ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <ArrowUp size={14} className={labelClass} />
                    </button>
                    <button
                      onClick={() => moveColumn(index, 1)}
                      disabled={index === columns.length - 1}
                      className={`p-1 rounded disabled:opacity-30 press-icon ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <ArrowDown size={14} className={labelClass} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={column.title}
                    onChange={e => renameColumn(column.id, e.target.value)}
                    className={`flex-1 min-w-[100px] px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                  />

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Object.entries(COLUMN_COLORS).map(([key, value]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => recolorColumn(column.id, key)}
                        title={value.label}
                        className={`w-5 h-5 rounded-full flex-shrink-0 transition duration-150 hover:scale-110 active:scale-90 ${value.dot} ${
                          column.color === key
                            ? `ring-2 ring-offset-2 ${darkMode ? 'ring-gray-300 ring-offset-gray-800' : 'ring-gray-500 ring-offset-white'}`
                            : 'opacity-40 hover:opacity-80'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => removeColumn(column.id)}
                    disabled={columns.length <= 1}
                    className={`p-2 rounded-lg disabled:opacity-30 press-icon ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-red-50'}`}
                    title="Delete column"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={e => setNewColumnTitle(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addColumn()}
                  placeholder="New column..."
                  className={`flex-1 px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                />
                <button
                  onClick={addColumn}
                  className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 flex items-center gap-2 press"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reset */}
        <div className={`rounded-lg border p-4 sm:p-6 ${cardBorderClass}`}>
          <h3 className={`text-xs font-medium uppercase tracking-wide mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Reset
          </h3>

          {confirmingReset ? (
            <div className="space-y-3 animate-pop-in">
              <p className={`text-sm ${labelClass}`}>
                This erases everything across the site — projects, tasks, columns, weekly plan,
                wishlist and notes — and restores the default settings. It cannot be undone.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 press"
                >
                  Yes, reset everything
                </button>
                <button
                  onClick={() => setConfirmingReset(false)}
                  className={`px-4 py-2 rounded-lg font-medium border press ${
                    darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmingReset(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border text-red-500 press ${
                  darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-red-50'
                }`}
              >
                <RotateCcw size={18} />
                Reset to defaults
              </button>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Clears all site data and restores the default settings.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
