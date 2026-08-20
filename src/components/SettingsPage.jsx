import React, { useState, useEffect } from 'react';
import { Moon, Sun, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { COLUMN_COLORS } from '../constants';

export default function SettingsPage({
  darkMode,
  setDarkMode,
  projects,
  currentProject,
  getProjectColumns,
  updateProjectColumns
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(currentProject);
  const [newColumnTitle, setNewColumnTitle] = useState('');

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
    if (!confirm('Удалить колонку? Задачи из неё нужно будет заранее переместить, иначе они окажутся скрыты.')) return;
    persistColumns(columns.filter(c => c.id !== columnId));
  };

  const renameColumn = (columnId, title) => {
    persistColumns(columns.map(c => (c.id === columnId ? { ...c, title } : c)));
  };

  const recolorColumn = (columnId, color) => {
    persistColumns(columns.map(c => (c.id === columnId ? { ...c, color } : c)));
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
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <h2 className={`text-2xl font-semibold ${textClass}`}>Настройки</h2>

        {/* Тема */}
        <div className={`rounded-lg border p-6 ${cardBorderClass}`}>
          <h3 className={`text-xs font-medium uppercase tracking-wide mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Тема оформления
          </h3>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border ${
              darkMode ? 'border-gray-700 text-yellow-400 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Светлая тема' : 'Тёмная тема'}
          </button>
        </div>

        {/* Колонки проекта */}
        <div className={`rounded-lg border p-6 ${cardBorderClass}`}>
          <h3 className={`text-xs font-medium uppercase tracking-wide mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Колонки проекта
          </h3>

          <div className="mb-4">
            <label className={`block text-sm font-medium ${labelClass} mb-2`}>Проект</label>
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
                  className={`flex items-center gap-3 p-3 rounded-lg border ${borderClass}`}
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveColumn(index, -1)}
                      disabled={index === 0}
                      className={`p-1 rounded disabled:opacity-30 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <ArrowUp size={14} className={labelClass} />
                    </button>
                    <button
                      onClick={() => moveColumn(index, 1)}
                      disabled={index === columns.length - 1}
                      className={`p-1 rounded disabled:opacity-30 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <ArrowDown size={14} className={labelClass} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={column.title}
                    onChange={e => renameColumn(column.id, e.target.value)}
                    className={`flex-1 px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                  />

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {Object.entries(COLUMN_COLORS).map(([key, value]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => recolorColumn(column.id, key)}
                        title={value.label}
                        className={`w-5 h-5 rounded-full flex-shrink-0 transition ${value.dot} ${
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
                    className={`p-2 rounded-lg disabled:opacity-30 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-red-50'}`}
                    title="Удалить колонку"
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
                  placeholder="Новая колонка..."
                  className={`flex-1 px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                />
                <button
                  onClick={addColumn}
                  className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 flex items-center gap-2"
                >
                  <Plus size={16} /> Добавить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
