import React, { useState } from 'react';
import { ArrowDownWideNarrow } from 'lucide-react';
import TaskCard from './TaskCard';
import SubtaskCard from './SubtaskCard';
import { COLUMN_COLORS } from '../constants';

export default function DropZone({
  column,
  darkMode,
  tasks,
  setEditingTask,
  moveTask,
  reorderTasksInColumn,
  sortColumnByPriority,
  toggleTaskSubtask,
  collapsedSubtasks,
  toggleSubtasksCollapsed,
  getTaskNumber,
  deleteTask
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const palette = COLUMN_COLORS[column.color] || COLUMN_COLORS.gray;
  // Одна поверхность на всю колонку вместо «рамка + заливка + отдельный фон заголовка»
  const surfaceBg = darkMode ? 'bg-gray-800' : 'bg-gray-100';

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const taskId = e.dataTransfer.getData('taskId');
    const fromColumn = e.dataTransfer.getData('fromColumn');

    if (fromColumn !== column.id) {
      moveTask(taskId, fromColumn, column.id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${surfaceBg} rounded-lg h-full flex flex-col transition duration-150 ${
        isDragOver ? 'ring-2 ring-green-600 scale-[1.01]' : ''
      }`}
    >
      <div className={`${surfaceBg} flex items-center gap-2 p-4 pb-2 sticky top-0 z-10 rounded-t-lg`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${palette.dot}`} />
        <h3 className={`text-xs font-medium uppercase tracking-wide flex-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {column.title} ({tasks.length})
        </h3>
        {tasks.length > 1 && (
          <button
            onClick={() => sortColumnByPriority(column.id)}
            title="Sort by priority"
            className={`p-1 rounded flex-shrink-0 press-icon ${darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <ArrowDownWideNarrow size={14} />
          </button>
        )}
      </div>
      <div className="space-y-3 min-h-[100px] px-4 pb-4 pt-3 flex-1 rounded-b-lg">
        {tasks.map((task, index) => {
          const parentDisplayId = task.taskId || `#${getTaskNumber(task.id)}`;
          const hasSubtasks = (task.subtasks || []).length > 0;
          const isCollapsed = !!collapsedSubtasks[task.id];
          return (
            <div key={task.id} className="space-y-1.5">
              <TaskCard
                task={task}
                index={index}
                column={column}
                setEditingTask={setEditingTask}
                reorderTasksInColumn={reorderTasksInColumn}
                darkMode={darkMode}
                taskNumber={getTaskNumber(task.id)}
                deleteTask={deleteTask}
                hasSubtasks={hasSubtasks}
                subtasksCollapsed={isCollapsed}
                onToggleSubtasks={() => toggleSubtasksCollapsed(task.id)}
              />
              {hasSubtasks && !isCollapsed && task.subtasks.map((subtask, subIndex) => (
                <SubtaskCard
                  key={subtask.id}
                  subtask={subtask}
                  index={subIndex}
                  parentDisplayId={parentDisplayId}
                  onToggle={() => toggleTaskSubtask(task.id, column.id, subtask.id)}
                  darkMode={darkMode}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
