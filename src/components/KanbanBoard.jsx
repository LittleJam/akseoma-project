import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Tag, X, ArrowDownWideNarrow, Heart } from 'lucide-react';
import DropZone from './DropZone';
import { getLabelColor } from '../constants';
import PageShell from './PageShell';

export default function KanbanBoard({
  currentProject,
  projects,
  tasks,
  columns,
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
  deleteTask,
  likesEnabled,
  currentUsername,
  toggleTaskLike
}) {
  // Лейблы прячем, чтобы борд не рябил: показываются по клику на значок
  const [showLabels, setShowLabels] = useState(false);
  // Одна строка добавления на весь борд: поле открыто всегда, чтобы внести
  // задачу можно было не целясь в кнопку. Задача уходит в первую колонку —
  // оттуда её и растаскивают дальше
  const [draft, setDraft] = useState('');
  const defaultColumn = columns[0]?.id;
  // Фильтр борда по лейблам: выбрано несколько — показываем задачи с любым из них
  const [activeLabels, setActiveLabels] = useState([]);
  // Отдельный фильтр: оставить на борде только отмеченные сердцем
  const [onlyLiked, setOnlyLiked] = useState(false);

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

  // Лайки выключили в настройках или сменили проект — фильтр по ним больше не к чему применять
  useEffect(() => {
    if (!likesEnabled) setOnlyLiked(false);
  }, [likesEnabled, currentProject]);

  const toggleLabel = (label) => {
    setActiveLabels(prev => (prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]));
  };

  // Поле не закрывается после добавления — задачи обычно вносят пачкой
  const submitDraft = () => {
    if (!draft.trim()) return;
    createTask(draft, defaultColumn);
    setDraft('');
  };

  const visibleTasks = (columnTasks = []) => {
    const byLabel = activeLabels.length === 0
      ? columnTasks
      : columnTasks.filter(task => (task.labels || []).some(label => activeLabels.includes(label)));
    return onlyLiked ? byLabel.filter(task => (task.likes || []).length > 0) : byLabel;
  };

  return (
    <PageShell
      darkMode={darkMode}
      title={projects.find(p => p.id === currentProject)?.name || ''}
      flushTop
      subheader={currentProject && (
            /* Добавление и фильтры одной строкой. Она есть всегда: без неё
               в пустом проекте не с чего было бы начать */
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitDraft();
                  if (e.key === 'Escape') setDraft('');
                }}
                placeholder={`New task in ${columns[0]?.title || ''}...`}
                aria-label="New task title"
                className={`h-control w-80 sm:w-[30rem] max-w-full px-4 text-body rounded-lg border focus:outline-none focus:border-green-500 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 placeholder-gray-400'
                }`}
              />
              <button
                onClick={submitDraft}
                title={`Add a task to ${columns[0]?.title || ''}`}
                className="h-control flex items-center gap-1.5 pl-3 pr-4 text-body font-medium rounded-lg bg-green-800 text-white hover:bg-green-900 press"
              >
                <Plus size={16} /> Task
              </button>

              {/* Одна кнопка сортирует по важности сразу все колонки */}
              {projectTasks.length > 1 && (
                <button
                  onClick={sortBoardByPriority}
                  title="Sort all columns by priority"
                  className={`h-control flex items-center gap-1.5 px-3.5 text-xs rounded-full border press ${
                    darkMode
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ArrowDownWideNarrow size={13} /> Priority
                </button>
              )}

              {/* Появляется только там, где лайки включены для проекта */}
              {likesEnabled && (
                <button
                  onClick={() => setOnlyLiked(prev => !prev)}
                  title={onlyLiked ? 'Show all tasks' : 'Show only liked tasks'}
                  aria-pressed={onlyLiked}
                  className={`h-control flex items-center gap-1.5 px-3.5 text-xs rounded-full border press ${
                    onlyLiked
                      ? 'border-rose-500 text-rose-500'
                      : darkMode
                        ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Heart size={13} fill={onlyLiked ? 'currentColor' : 'none'} /> Likes
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
                  className={`h-control flex items-center gap-1.5 px-3.5 text-xs rounded-full border press ${
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
                    className={`h-control px-3 text-xs rounded-full border press ${getLabelColor(label, darkMode)} ${
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
                  className={`h-control flex items-center gap-1 px-2.5 text-xs rounded-full press ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
      )}
    >
          {/* Борд прокручивается целиком, все колонки разом. По горизонтали
              колонки жмутся до читаемого минимума и только потом появляется
              прокрутка — на 1280px пять колонок ещё помещаются.
              Верхний отступ здесь, а не у скроллера (flushTop): иначе над
              липкими заголовками колонок остаётся полоса, в которой видно
              уезжающие карточки */}
          {currentProject && (
            <div className="flex gap-3 sm:gap-4 min-h-full pt-4 sm:pt-6">
              {columns.map(column => (
                <div key={column.id} className="flex-1 min-w-[170px] sm:min-w-[180px]">
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
                    likesEnabled={likesEnabled}
                    currentUsername={currentUsername}
                    toggleTaskLike={toggleTaskLike}
                  />
                </div>
              ))}
            </div>
          )}
    </PageShell>
  );
}
