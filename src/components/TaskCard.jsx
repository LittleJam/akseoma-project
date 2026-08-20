import React, { useState } from 'react';
import { Trash2, ListChecks } from 'lucide-react';

export default function TaskCard({ task, index, column, setEditingTask, reorderTasksInColumn, darkMode, taskNumber, deleteTask }) {
  const [isDragging, setIsDragging] = useState(false);

  const cardBg = darkMode
    ? 'bg-gray-900 border border-gray-700 hover:border-gray-600'
    : 'bg-gray-50 border border-gray-200 hover:border-gray-300';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-800';
  const descriptionText = typeof task.description === 'string' ? task.description : task.description?.content;
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;

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
    if (confirm('Удалить эту задачу?')) {
      deleteTask(task.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`${cardBg} p-3 rounded-lg cursor-grab active:cursor-grabbing group relative transition ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      onClick={() => setEditingTask(task)}
    >
      <button
        onClick={handleDeleteClick}
        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition bg-red-100 hover:bg-red-200 z-10"
        title="Удалить задачу"
      >
        <Trash2 size={14} className="text-red-600" />
      </button>
      <div className="flex items-start gap-2 mb-2 pr-6">
        <span className={`font-bold text-xs px-2 py-1 rounded bg-green-500 text-white whitespace-nowrap`}>{task.taskId || `#${taskNumber}`}</span>
        <h4 className={`font-bold text-sm ${textColor} flex-1 break-words`}>{task.title}</h4>
      </div>
      {descriptionText && descriptionText.trim() && (
        <p className={`text-xs truncate mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {descriptionText}
        </p>
      )}
      {subtasks.length > 0 && (
        <div className={`flex items-center gap-1.5 text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <ListChecks size={13} />
          <span>{completedSubtasks}/{subtasks.length}</span>
        </div>
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
      <div className="mt-2">
        <span className={`text-xs px-2 py-1 rounded ${
          task.priority === 'high' ? 'bg-red-100 text-red-700' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
        </span>
      </div>
    </div>
  );
}
