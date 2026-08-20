import React from 'react';
import { Plus } from 'lucide-react';
import DropZone from './DropZone';

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
  sortColumnByPriority,
  darkMode,
  getTaskNumber,
  deleteTask
}) {
  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {currentProject && (
        <>
          <div className="px-8 pt-8 flex-shrink-0">
            <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {projects.find(p => p.id === currentProject)?.name}
            </h2>

            {/* Форма добавления задачи */}
            <div className={`mb-8 p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && createTask()}
                  placeholder="Добавить новую задачу..."
                  className={`flex-1 px-4 py-2 border rounded focus:outline-none focus:border-green-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
                />
                <select
                  value={newTaskColumn}
                  onChange={e => setNewTaskColumn(e.target.value)}
                  className={`px-3 py-2 border rounded focus:outline-none focus:border-green-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`}
                >
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={createTask}
                  className="px-6 py-2 bg-green-800 text-white rounded hover:bg-green-900 flex items-center gap-2"
                >
                  <Plus size={18} /> Добавить
                </button>
              </div>
            </div>
          </div>

          {/* Канбан доска: одна общая вертикальная прокрутка для всех колонок, без горизонтального скролла */}
          <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
            <div className="flex gap-4 min-h-full">
              {columns.map(column => (
                <div key={column.id} className="flex-1 min-w-0">
                  <DropZone
                    column={column}
                    darkMode={darkMode}
                    tasks={tasks[currentProject]?.[column.id] || []}
                    setEditingTask={setEditingTask}
                    moveTask={moveTask}
                    reorderTasksInColumn={reorderTasksInColumn}
                    sortColumnByPriority={sortColumnByPriority}
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
