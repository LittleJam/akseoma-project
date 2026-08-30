import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import TaskCard from './TaskCard';
import SubtaskCard from './SubtaskCard';
import { COLUMN_COLORS } from '../constants';

// Сколько сделанных задач видно без разворота. Свежие внизу — их и показываем,
// а всё, что накопилось раньше, прячем: колонка «сделано» растёт бесконечно и
// иначе перевешивает те колонки, в которых идёт работа
const DONE_VISIBLE = 5;

export default function DropZone({
  column,
  darkMode,
  tasks,
  showLabels,
  onLabelClick,
  setEditingTask,
  moveTask,
  reorderTasksInColumn,
  toggleTaskSubtask,
  promoteSubtaskToTask,
  collapsedSubtasks,
  toggleSubtasksCollapsed,
  getTaskNumber,
  deleteTask,
  likesEnabled,
  currentUsername,
  toggleTaskLike
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);

  const palette = COLUMN_COLORS[column.color] || COLUMN_COLORS.gray;
  // Сворачиваем только «сделано»: в остальных колонках задачи ждут работы,
  // и прятать их — значит прятать саму работу
  const collapsible = column.id === 'done' && tasks.length > DONE_VISIBLE;
  const hiddenCount = collapsible && !showAllDone ? tasks.length - DONE_VISIBLE : 0;
  const visibleTasks = hiddenCount > 0 ? tasks.slice(hiddenCount) : tasks;
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
      {/* Заголовок липкий, и под ним проезжают карточки. Поверхность колонки во
          многих темах намеренно полупрозрачная, поэтому подложку заголовку
          задаём отдельно — иначе статус читается сквозь чужой текст */}
      <div className="column-header flex items-center gap-2 p-4 pb-2 sticky top-0 z-10 rounded-t-lg">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${palette.dot}`} />
        <h3 className={`text-xs font-medium uppercase tracking-wide flex-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {column.title} ({tasks.length})
        </h3>
      </div>
      <div className="space-y-3 min-h-[100px] px-4 pb-4 pt-3 flex-1 rounded-b-lg">
        {visibleTasks.map((task, visibleIndex) => {
          // Индекс нужен настоящий, из полного списка: по нему работает перетаскивание
          const index = hiddenCount + visibleIndex;
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
                showLabels={showLabels}
                onLabelClick={onLabelClick}
                hasSubtasks={hasSubtasks}
                subtasksCollapsed={isCollapsed}
                onToggleSubtasks={() => toggleSubtasksCollapsed(task.id)}
                likesEnabled={likesEnabled}
                currentUsername={currentUsername}
                onToggleLike={() => toggleTaskLike(task.id, column.id)}
              />
              {hasSubtasks && !isCollapsed && task.subtasks.map((subtask, subIndex) => (
                <SubtaskCard
                  key={subtask.id}
                  subtask={subtask}
                  index={subIndex}
                  parentDisplayId={parentDisplayId}
                  onToggle={() => toggleTaskSubtask(task.id, column.id, subtask.id)}
                  onPromote={() => promoteSubtaskToTask(task.id, subtask.id)}
                  darkMode={darkMode}
                />
              ))}
            </div>
          );
        })}

        {/* Старые сделанные задачи прячутся за одну строку под списком — она же их и возвращает */}
        {collapsible && (
          <button
            onClick={() => setShowAllDone(prev => !prev)}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-dashed press ${
              darkMode
                ? 'border-gray-700 text-gray-400 hover:bg-gray-700/40'
                : 'border-gray-300 text-gray-500 hover:bg-gray-200/60'
            }`}
          >
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${showAllDone ? 'rotate-180' : ''}`}
            />
            {showAllDone ? 'Show less' : `${hiddenCount} more`}
          </button>
        )}

      </div>
    </div>
  );
}
