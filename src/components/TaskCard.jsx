import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { getLabelColor } from '../constants';

export default function TaskCard({ task, index, column, setEditingTask, reorderTasksInColumn, darkMode, taskNumber, deleteTask, hasSubtasks, subtasksCollapsed, onToggleSubtasks, showLabels, onLabelClick, likesEnabled, currentUsername, onToggleLike, prevColumn, nextColumn, onMoveToColumn }) {
  const [isDragging, setIsDragging] = useState(false);

  // Лайки храним списком пользователей: сердце залито, если отметил ты сам,
  // а число рядом показывает, сколько всего набралось
  const likes = task.likes || [];
  const likedByMe = currentUsername ? likes.includes(currentUsername) : false;

  const cardBg = darkMode
    ? 'bg-gray-900 border border-gray-700 hover:border-gray-600'
    : 'bg-white border border-gray-200 hover:border-gray-300';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-800';
  // Приоритет показываем одной точкой и только ей: цвет уже говорит всё,
  // а слово «High» рядом с красной точкой было вторым именем той же вещи
  const PRIORITY_STYLES = {
    high: { label: 'High', dot: 'bg-red-500' },
    medium: { label: 'Medium', dot: 'bg-amber-500' },
    low: { label: 'Low', dot: darkMode ? 'bg-gray-600' : 'bg-gray-300' }
  };
  const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low;
  // Описание хранится как HTML — для превью на карточке оставляем чистый текст
  const descriptionHtml = typeof task.description === 'string' ? task.description : task.description?.content;
  const descriptionText = (descriptionHtml || '')
    .replace(/<br\s*\/?>(\s*)/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

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

  const handleLikeClick = (e) => {
    e.stopPropagation();
    onToggleLike?.();
  };

  return (
    <div
      /* Хук для тем: в Handwriting карточка становится листком из блокнота */
      data-card="task"
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
        {/* Уже отмеченное сердце видно всегда, пустое — только при наведении:
            иначе на борде появился бы частокол одинаковых серых значков */}
        {likesEnabled && (
          <button
            onClick={handleLikeClick}
            title={likedByMe ? 'Remove like' : 'Like'}
            aria-label={likedByMe ? 'Remove like' : 'Like'}
            aria-pressed={likedByMe}
            className={`flex items-center gap-0.5 px-1 py-1 rounded press ${
              likes.length > 0 ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            } ${
              likedByMe
                ? 'text-rose-500'
                : darkMode ? 'text-gray-500 hover:text-rose-400' : 'text-gray-400 hover:text-rose-500'
            }`}
          >
            <Heart size={13} fill={likedByMe ? 'currentColor' : 'none'} />
            {likes.length > 0 && (
              <span className="text-[10px] font-medium leading-none">{likes.length}</span>
            )}
          </button>
        )}
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
          /* На телефоне наведения не бывает: то, что на десктопе проявляется
             под курсором, здесь должно быть видно сразу, иначе недоступно */
          className={`p-2 sm:p-1 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 press ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          title="Delete task"
        >
          <Trash2 size={14} className={darkMode ? 'text-red-400' : 'text-red-500'} />
        </button>
      </div>
      <div className="mb-2 pr-6">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {task.sticker && <span className="text-base leading-none flex-shrink-0">{task.sticker}</span>}
          <span className={`font-mono text-[11px] whitespace-nowrap ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {task.taskId || `#${taskNumber}`}
          </span>
          <span
            title={`Priority: ${priority.label}`}
            aria-label={`Priority: ${priority.label}`}
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priority.dot}`}
          />
        </div>
        <h4 className={`font-medium text-sm ${textColor} break-words`}>{task.title}</h4>

        {/* Лейблы показываем, только когда их включили значком на борде */}
        {showLabels && (task.labels || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {task.labels.map(label => (
              <button
                key={label}
                type="button"
                // Клик по лейблу фильтрует борд и не открывает саму задачу
                onClick={e => {
                  e.stopPropagation();
                  onLabelClick?.(label);
                }}
                title={`Filter by ${label}`}
                className={`px-1.5 py-0.5 text-[10px] leading-tight rounded-full border press ${getLabelColor(label, darkMode)}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
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

      {/* Перенос по колонкам для телефона. На борде задачу таскают мышью, но
          HTML5 drag-and-drop не отвечает на касания, и без этих двух кнопок
          задача осталась бы навсегда в той колонке, где её завели.
          Подписаны соседями, а не «влево-вправо»: так видно, куда попадёшь */}
      {(prevColumn || nextColumn) && (
        <div className={`sm:hidden flex items-stretch gap-2 mt-3 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {prevColumn && (
            <button
              onClick={e => {
                e.stopPropagation();
                onMoveToColumn?.(prevColumn.id);
              }}
              title={`Move to ${prevColumn.title}`}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-2 rounded text-xs press ${
                darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft size={14} className="flex-shrink-0" />
              <span className="truncate">{prevColumn.title}</span>
            </button>
          )}
          {nextColumn && (
            <button
              onClick={e => {
                e.stopPropagation();
                onMoveToColumn?.(nextColumn.id);
              }}
              title={`Move to ${nextColumn.title}`}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-2 rounded text-xs press ${
                darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="truncate">{nextColumn.title}</span>
              <ChevronRight size={14} className="flex-shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
