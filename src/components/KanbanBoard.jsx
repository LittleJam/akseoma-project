import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Tag, X, ArrowDownWideNarrow } from 'lucide-react';
import DropZone from './DropZone';
import { getLabelColor } from '../constants';
import Select from './Select';

export default function KanbanBoard({
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
  sortBoardByPriority,
  toggleTaskSubtask,
  promoteSubtaskToTask,
  collapsedSubtasks,
  toggleSubtasksCollapsed,
  darkMode,
  getTaskNumber,
  deleteTask
}) {
  // Лейблы прячем, чтобы борд не рябил: показываются по клику на значок
  const [showLabels, setShowLabels] = useState(false);
  // Фильтр борда по лейблам: выбрано несколько — показываем задачи с любым из них
  const [activeLabels, setActiveLabels] = useState([]);

  const projectTasks = useMemo(
    () => columns.flatMap(column => tasks[currentProject]?.[column.id] || []),
    [columns, tasks, currentProject]
  );

  const allLabels = useMemo(
    () => [...new Set(projectTasks.flatMap(t => t.labels || []))].sort(),
    [projectTasks]
  );

  // Сменили проект или лейбл исчез из задач — фильтр больше не актуален
  useEffect(() => {
    setActiveLabels(prev => prev.filter(label => allLabels.includes(label)));
  }, [allLabels, currentProject]);

  const toggleLabel = (label) => {
    setActiveLabels(prev => (prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]));
  };

  const visibleTasks = (columnTasks = []) =>
    (activeLabels.length === 0
      ? columnTasks
      : columnTasks.filter(task => (task.labels || []).some(label => activeLabels.includes(label))));

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {currentProject && (
        <>
          <div className="px-3 sm:px-8 pt-4 sm:pt-8 flex-shrink-0">
            <h2 className={`text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {projects.find(p => p.id === currentProject)?.name}
            </h2>

            {/* Add task form */}
            <div className={`mb-4 sm:mb-8 p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && createTask()}
                  placeholder="Add new task..."
                  className={`flex-1 min-w-[120px] px-4 py-2 border rounded focus:outline-none focus:border-green-500 transition-colors duration-150 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
                />
                <Select
                  value={newTaskColumn}
                  onChange={e => setNewTaskColumn(e.target.value)}
                  options={columns.map(col => ({ value: col.id, label: col.title }))}
                  darkMode={darkMode}
                  ariaLabel="Column for the new task"
                  wrapperClassName="w-40"
                  className={`px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                />
                <button
                  onClick={createTask}
                  className="px-6 py-2 bg-green-800 text-white rounded hover:bg-green-900 flex items-center gap-2 press"
                >
                  <Plus size={18} /> Add
                </button>
              </div>
            </div>

          {/* Фильтр по лейблам — показываем, только когда лейблы вообще есть */}
            {(allLabels.length > 0 || projectTasks.length > 1) && (
            <div className="flex items-center gap-2 flex-wrap mb-4 sm:mb-6 -mt-1">
              {/* Одна кнопка сортирует по важности сразу все колонки */}
              {projectTasks.length > 1 && (
                <button
                  onClick={sortBoardByPriority}
                  title="Sort all columns by priority"
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border press ${
                    darkMode
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ArrowDownWideNarrow size={13} /> Priority
                </button>
              )}

              {allLabels.length > 0 && (
                <button
                  onClick={() => {
                    // Прячем лейблы вместе с фильтром: невидимый фильтр только путает
                    setShowLabels(prev => {
                      if (prev) setActiveLabels([]);
                      return !prev;
                    });
                  }}
                  title={showLabels ? 'Hide labels' : 'Show labels'}
                  aria-label={showLabels ? 'Hide labels' : 'Show labels'}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border press ${
                    showLabels
                      ? darkMode
                        ? 'border-green-700 text-green-400'
                        : 'border-green-600 text-green-700'
                      : darkMode
                        ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Tag size={13} /> Labels
                  {activeLabels.length > 0 && ` (${activeLabels.length})`}
                </button>
              )}

              {showLabels && allLabels.map(label => {
                const active = activeLabels.includes(label);
                return (
                  <button
                    key={label}
                    onClick={() => toggleLabel(label)}
                    className={`px-2 py-1 text-xs rounded-full border press ${getLabelColor(label, darkMode)} ${
                      active ? 'ring-2 ring-green-600' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}

              {showLabels && activeLabels.length > 0 && (
                <button
                  onClick={() => setActiveLabels([])}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full press ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            )}
          </div>

          {/* Kanban board: shared scroll for all columns; columns shrink equally down to a readable minimum, then the board scrolls horizontally as a fallback */}
          <div className="flex-1 min-h-0 overflow-auto px-3 sm:px-8 pb-4 sm:pb-8">
            <div className="flex gap-3 sm:gap-4 min-h-full">
              {columns.map(column => (
                <div key={column.id} className="flex-1 min-w-[200px] sm:min-w-[220px]">
                  <DropZone
                    column={column}
                    darkMode={darkMode}
                    tasks={visibleTasks(tasks[currentProject]?.[column.id])}
                    showLabels={showLabels}
                    onLabelClick={toggleLabel}
                    setEditingTask={setEditingTask}
                    moveTask={moveTask}
                    reorderTasksInColumn={reorderTasksInColumn}
                    toggleTaskSubtask={toggleTaskSubtask}
                    promoteSubtaskToTask={promoteSubtaskToTask}
                    collapsedSubtasks={collapsedSubtasks}
                    toggleSubtasksCollapsed={toggleSubtasksCollapsed}
                    getTaskNumber={getTaskNumber}
                    deleteTask={deleteTask}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
