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
  toggleTaskSubtask,
  promoteSubtaskToTask,
  collapsedSubtasks,
  toggleSubtasksCollapsed,
  darkMode,
  getTaskNumber,
  deleteTask
}) {
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
                  className="px-6 py-2 bg-green-800 text-white rounded hover:bg-green-900 flex items-center gap-2 press"
                >
                  <Plus size={18} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Kanban board: shared scroll for all columns; columns shrink equally down to a readable minimum, then the board scrolls horizontally as a fallback */}
          <div className="flex-1 min-h-0 overflow-auto px-3 sm:px-8 pb-4 sm:pb-8">
            <div className="flex gap-3 sm:gap-4 min-h-full">
              {columns.map(column => (
                <div key={column.id} className="flex-1 min-w-[200px] sm:min-w-[220px]">
                  <DropZone
                    column={column}
                    darkMode={darkMode}
                    tasks={tasks[currentProject]?.[column.id] || []}
                    setEditingTask={setEditingTask}
                    moveTask={moveTask}
                    reorderTasksInColumn={reorderTasksInColumn}
                    sortColumnByPriority={sortColumnByPriority}
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
