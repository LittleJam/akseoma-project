import React, { useState } from 'react';
import { ArrowDownWideNarrow } from 'lucide-react';
import TaskCard from './TaskCard';
import { COLUMN_COLORS } from '../constants';

export default function DropZone({
  column,
  darkMode,
  tasks,
  setEditingTask,
  moveTask,
  reorderTasksInColumn,
  sortColumnByPriority,
  getTaskNumber,
  deleteTask
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const palette = COLUMN_COLORS[column.color] || COLUMN_COLORS.gray;
  const headerBg = darkMode ? 'bg-gray-800' : 'bg-white';
  const tintBg = darkMode ? palette.dark : palette.light;
  const borderClass = darkMode ? 'border-gray-800' : 'border-gray-200';

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
      className={`border ${borderClass} rounded-lg transition h-full flex flex-col ${isDragOver ? 'ring-1 ring-green-600 border-green-600' : ''}`}
    >
      <div className={`${headerBg} flex items-center gap-2 p-4 pb-2 sticky top-0 z-10 rounded-t-lg`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${palette.dot}`} />
        <h3 className={`text-xs font-medium uppercase tracking-wide flex-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {column.title} ({tasks.length})
        </h3>
        {tasks.length > 1 && (
          <button
            onClick={() => sortColumnByPriority(column.id)}
            title="Сортировать по приоритету"
            className={`p-1 rounded flex-shrink-0 ${darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <ArrowDownWideNarrow size={14} />
          </button>
        )}
      </div>
      <div className={`${tintBg} space-y-3 min-h-[100px] px-4 pb-4 pt-1 flex-1 rounded-b-lg`}>
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            column={column}
            setEditingTask={setEditingTask}
            reorderTasksInColumn={reorderTasksInColumn}
            darkMode={darkMode}
            taskNumber={getTaskNumber(task.id)}
            deleteTask={deleteTask}
          />
        ))}
      </div>
    </div>
  );
}
