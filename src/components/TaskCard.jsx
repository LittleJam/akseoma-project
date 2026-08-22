import React, { useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';

export default function TaskCard({ task, index, column, setEditingTask, reorderTasksInColumn, darkMode, taskNumber, deleteTask, hasSubtasks, subtasksCollapsed, onToggleSubtasks }) {
  const [isDragging, setIsDragging] = useState(false);

  const cardBg = darkMode
    ? 'bg-gray-900 border border-gray-700 hover:border-gray-600'
    : 'bg-gray-50 border border-gray-200 hover:border-gray-300';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-800';
  const PRIORITY_STYLES = {
    high: { label: 'High', className: 'bg-red-100 text-red-700' },
    medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
    low: { label: 'Low', className: 'bg-green-100 text-green-700' }
  };
  const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low;
  const descriptionText = typeof task.description === 'string' ? task.description : task.description?.content;

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('fromColumn', column.id);
    e.dataTransfer.setData('fromIndex', index.toString());
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const fromColumn = e.dataTransfer.getData('fromColumn');
    const fromIndex = parseInt(e.dataTransfer.getData('fromIndex'));

    if (fromColumn === column.id) {
      reorderTasksInColumn(fromIndex, index, column.id);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (confirm('Delete this task?')) {
      deleteTask(task.id);
    }
  };

  const handleToggleSubtasksClick = (e) => {
    e.stopPropagation();
    onToggleSubtasks();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`${cardBg} p-3 rounded-lg cursor-grab active:cursor-grabbing group relative lift ${
        isDragging ? 'opacity-50 scale-[0.98]' : 'opacity-100'
      }`}
      onClick={() => setEditingTask(task)}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        {hasSubtasks && (
          <button
            onClick={handleToggleSubtasksClick}
            className={`flex items-center gap-0.5 px-1 py-1 rounded press ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
            title={subtasksCollapsed ? 'Show subtasks' : 'Hide subtasks'}
          >
            <span className="text-[10px] font-medium leading-none">{task.subtasks.length}</span>
            {/* Одна иконка, которая доворачивается — направление показывает, что будет по клику */}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${subtasksCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        )}
        <button
          onClick={handleDeleteClick}
          className="p-1 rounded opacity-0 group-hover:opacity-100 bg-red-100 hover:bg-red-200 press"
          title="Delete task"
        >
          <Trash2 size={14} className="text-red-600" />
        </button>
      </div>
      <div className="mb-2 pr-6">
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          {task.sticker && <span className="text-lg leading-none flex-shrink-0">{task.sticker}</span>}
          <span className="font-bold text-xs px-2 py-1 rounded bg-green-500 text-white whitespace-nowrap">
            {task.taskId || `#${taskNumber}`}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-1 rounded whitespace-nowrap ${priority.className}`}>
            {priority.label}
          </span>
        </div>
        <h4 className={`font-bold text-sm ${textColor} break-words`}>{task.title}</h4>
      </div>
      {descriptionText && descriptionText.trim() && (
        <p className={`text-xs truncate mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {descriptionText}
        </p>
      )}
      {task.images && task.images.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {task.images.slice(0, 2).map((img, idx) => (
            <img key={idx} src={img} alt="Task" className="w-12 h-12 object-cover rounded" />
          ))}
          {task.images.length > 2 && (
            <div className="w-12 h-12 bg-gray-400 rounded flex items-center justify-center text-white text-xs font-bold">
              +{task.images.length - 2}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
