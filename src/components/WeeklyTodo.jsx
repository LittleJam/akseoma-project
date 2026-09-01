import React, { useState, useEffect } from 'react';
import { Edit2, X, ChevronLeft, ChevronRight, Star, Clock } from 'lucide-react';
import { themeIcon } from '../themes';
import { getWeekStart, addWeeks, getWeekKey, getWeekDates, isSameDay } from '../utils/weeks';
import { getQuoteForDate } from '../quotes';
import PageShell from './PageShell';
import useIsMobile from '../utils/useIsMobile';

export default function WeeklyTodo({ weeklyTasks, addWeeklyTask, deleteWeeklyTask, toggleWeeklyTask, editWeeklyTask, moveWeeklyTask, toggleWeeklyTaskImportant, darkMode, theme, weekDays }) {
  const AddIcon = themeIcon(theme, 'add');
  const RefreshIcon = themeIcon(theme, 'refresh');
  const [weekOffset, setWeekOffset] = useState(0);
  const [quoteOffset, setQuoteOffset] = useState(0);
  // Фраза привязана к дате. Если вкладку не закрывали, в полночь надо перерисоваться —
  // один таймер до следующей полуночи, без опроса каждую минуту
  const [dayStamp, setDayStamp] = useState(() => new Date().toDateString());
  const [newTasks, setNewTasks] = useState({});
  const [newTimes, setNewTimes] = useState({});
  // Время нужно не каждой задаче, поэтому поле появляется по клику на часы:
  // пустое «--:--» в каждой карточке дня читалось как сломанные данные
  const [timeOpen, setTimeOpen] = useState({});
  const isMobile = useIsMobile();
  const [editingItem, setEditingItem] = useState(null); // { day, taskId }
  const [editingText, setEditingText] = useState('');
  const [editingTime, setEditingTime] = useState('');
  // Что тащим и над каким днём держим — подсветка дня-приёмника
  const [draggedTask, setDraggedTask] = useState(null); // { day, taskId }
  const [dragOverDay, setDragOverDay] = useState(null);
  // Куда именно ляжет задача внутри дня: линия между строками { day, index }
  const [dropAt, setDropAt] = useState(null);

  const today = new Date();
  const weekStart = addWeeks(getWeekStart(today), weekOffset);
  const weekKey = getWeekKey(weekStart);
  const weekDates = getWeekDates(weekStart);
  const weekTasks = weeklyTasks[weekKey] || {};
  const quote = getQuoteForDate(today, quoteOffset);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setDayStamp(new Date().toDateString()), nextMidnight - now + 1000);
    return () => clearTimeout(timer);
  }, [dayStamp]);

  // Черновики и незакрытое редактирование относятся к прошлой неделе — сбрасываем при переходе
  useEffect(() => {
    setEditingItem(null);
    setEditingText('');
    setEditingTime('');
    setNewTasks({});
    setNewTimes({});
    setTimeOpen({});
    setDraggedTask(null);
    setDragOverDay(null);
    setDropAt(null);
  }, [weekKey]);

  const handleAddTask = (day) => {
    if (newTasks[day]?.trim()) {
      addWeeklyTask(weekKey, day, newTasks[day], newTimes[day] || '');
      setNewTasks({ ...newTasks, [day]: '' });
      setNewTimes({ ...newTimes, [day]: '' });
      setTimeOpen({ ...timeOpen, [day]: false });
    }
  };

  // Закрываем часы — забываем и время: иначе задача уедет со скрытым значением
  const toggleTimeField = (day) => {
    setTimeOpen(prev => {
      const next = !prev[day];
      if (!next) setNewTimes(times => ({ ...times, [day]: '' }));
      return { ...prev, [day]: next };
    });
  };

  const startEditing = (day, task) => {
    setEditingItem({ day, taskId: task.id });
    setEditingText(task.title);
    setEditingTime(task.time || '');
  };

  const saveEditing = () => {
    if (editingItem && editingText.trim()) {
      editWeeklyTask(weekKey, editingItem.day, editingItem.taskId, editingText, editingTime);
    }
    cancelEditing();
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditingText('');
    setEditingTime('');
  };

  // Правку закрываем, только когда фокус ушёл из строки целиком. Переход с текста
  // на поле времени — это всё ещё правка той же задачи: иначе до времени
  // не добраться, редактор закрывался бы на первом же клике по нему.
  //
  // Смотрим, где фокус оказался, а не куда он шёл: relatedTarget в мобильных
  // браузерах приходит пустым, когда касание открывает системный выбор времени.
  // По нему выходило, что фокус ушёл со строки, правка закрывалась в тот же миг,
  // и время существующей задачи на телефоне поменять было нельзя.
  const handleEditBlur = (e) => {
    const row = e.currentTarget;
    setTimeout(() => {
      if (row.contains(document.activeElement)) return;
      saveEditing();
    }, 0);
  };

  const handleTaskDragStart = (e, day, task) => {
    setDraggedTask({ day, taskId: task.id });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('weeklytask', JSON.stringify({ day, taskId: task.id }));
  };

  const resetDrag = () => {
    setDraggedTask(null);
    setDragOverDay(null);
    setDropAt(null);
  };

  // Откуда тащат — источник правды в dataTransfer: состояние может ещё не
  // обновиться, да и тащить могли из другой вкладки
  const readDragPayload = (e) => {
    try {
      const raw = e.dataTransfer.getData('weeklytask');
      if (raw) return JSON.parse(raw);
    } catch {
      // оставляем то, что запомнили на старте перетаскивания
    }
    return draggedTask;
  };

  const handleDayDragOver = (e, day) => {
    // Тип в dataTransfer — источник правды: состояние может ещё не успеть обновиться,
    // да и тащить могли из другой вкладки
    if (!draggedTask && !e.dataTransfer.types.includes('weeklytask')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(day);
    setDropAt(null);
  };

  // Наведение на строку: верхняя половина — встать перед ней, нижняя — после.
  // Событие не пускаем дальше, иначе день сразу сотрёт линию как «пустое место»
  const handleTaskDragOver = (e, day, index) => {
    if (!draggedTask && !e.dataTransfer.types.includes('weeklytask')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const box = e.currentTarget.getBoundingClientRect();
    setDragOverDay(day);
    setDropAt({ day, index: e.clientY < box.top + box.height / 2 ? index : index + 1 });
  };

  const handleTaskDrop = (e, day, index) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = readDragPayload(e);
    if (payload) {
      const box = e.currentTarget.getBoundingClientRect();
      const at = e.clientY < box.top + box.height / 2 ? index : index + 1;
      moveWeeklyTask(weekKey, payload.day, day, payload.taskId, at);
    }
    resetDrag();
  };

  // Бросок на свободное место карточки дня — просто в конец списка
  const handleDayDrop = (e, day) => {
    e.preventDefault();
    const payload = readDragPayload(e);
    if (payload && payload.day !== day) {
      moveWeeklyTask(weekKey, payload.day, day, payload.taskId);
    }
    resetDrag();
  };

  const mutedIcon = darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600';

  const navButtonClass = `h-control w-control flex items-center justify-center rounded-lg border press ${
    darkMode
      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
  }`;

  // Листание недель — действия страницы, поэтому уезжают в шапку каркаса рядом с заголовком
  const weekNav = (
    <>
      <button
        onClick={() => setWeekOffset(prev => prev - 1)}
        title="Previous week"
        aria-label="Previous week"
        className={navButtonClass}
      >
        <ChevronLeft size={16} />
      </button>

      {weekOffset !== 0 && (
        <button
          onClick={() => setWeekOffset(0)}
          className={`h-control px-3 text-caption font-medium rounded-lg border press ${
            darkMode
              ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
              : 'border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          Today
        </button>
      )}

      <button
        onClick={() => setWeekOffset(prev => prev + 1)}
        title="Next week"
        aria-label="Next week"
        className={navButtonClass}
      >
        <ChevronRight size={16} />
      </button>
    </>
  );

  // Фраза дня — не действие, а украшение, поэтому отдельной строкой под заголовком
  const quoteLine = (
    <div className="flex items-center gap-2 min-w-0 group/quote">
      <p className={`text-body sm:text-base leading-relaxed ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <span className="italic">“{quote.text}”</span>
        <span className="ml-1.5">— {quote.source}</span>
      </p>
      <button
        onClick={() => setQuoteOffset(prev => prev + 1)}
        title="Another quote"
        aria-label="Another quote"
        className={`h-control-sm w-control-sm flex items-center justify-center rounded opacity-0 group-hover/quote:opacity-100 press-icon flex-shrink-0 ${
          darkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'
        }`}
      >
        <RefreshIcon size={14} />
      </button>
    </div>
  );

  return (
    <PageShell darkMode={darkMode} title="Schedule" actions={weekNav} subheader={quoteLine}>
      <div className="grid grid-cols-1 cards:grid-cols-2 wide:grid-cols-4 wide:grid-rows-2 gap-3 sm:gap-4 w-full">
          {weekDays.map((day, i) => {
            const date = weekDates[i];
            const isToday = isSameDay(date, today);

            return (
              <div
                key={day}
                onDragOver={e => handleDayDragOver(e, day)}
                onDragLeave={e => {
                  if (e.currentTarget.contains(e.relatedTarget)) return;
                  setDragOverDay(prev => (prev === day ? null : prev));
                }}
                onDrop={e => handleDayDrop(e, day)}
                /* Ровные карточки нужны сетке: в четыре колонки разнобой высот
                   выглядел бы рваным. На телефоне колонка одна, и фиксированные
                   315px превращались бы в пустоту под парой дел */
                className={`rounded-lg p-3 sm:p-4 flex flex-col h-auto sm:h-day-card min-h-0 min-w-0 border transition duration-150 ${
                  isToday
                    ? darkMode ? 'border-green-700 bg-green-950/40' : 'border-green-200 bg-green-50'
                    : darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white'
                } ${
                  dragOverDay === day && draggedTask?.day !== day ? 'ring-2 ring-green-600 scale-[1.01]' : ''
                }`}
              >
                {/* День недели и дата — одной строкой */}
                <div className="mb-4 flex-shrink-0 flex items-baseline gap-2 min-w-0">
                  <span className={`text-lg font-semibold truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`text-xs font-medium uppercase tracking-wide truncate ${
                    isToday
                      ? darkMode ? 'text-green-400' : 'text-green-700'
                      : darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {day}
                  </span>
                </div>

                <div className="space-y-1 mb-3 flex-1 min-h-0 overflow-y-auto">
                  {weekTasks[day]?.map((task, taskIndex) => {
                    const isEditingThis = editingItem?.day === day && editingItem?.taskId === task.id;
                    const isLastTask = taskIndex === weekTasks[day].length - 1;
                    return (
                    <div
                      key={task.id}
                      // Пока правим текст, перетаскивание выключено — иначе не выделить строку мышью
                      draggable={!isEditingThis}
                      onDragStart={e => handleTaskDragStart(e, day, task)}
                      onDragEnd={resetDrag}
                      onDragOver={e => handleTaskDragOver(e, day, taskIndex)}
                      onDrop={e => handleTaskDrop(e, day, taskIndex)}
                      title="Drag to reorder or to another day"
                      className={`relative flex items-start gap-1.5 py-1.5 min-w-0 group rounded transition duration-150 ${
                        isEditingThis ? '' : 'cursor-grab active:cursor-grabbing'
                      } ${
                        draggedTask?.taskId === task.id ? 'opacity-40' : ''
                      } ${
                        // Важная задача видна сразу: жёлтая полоса слева и тёплая подложка
                        task.important
                          ? darkMode
                            ? 'bg-amber-400/10 border-l-[3px] border-amber-400 pl-1.5'
                            : 'bg-amber-50 border-l-[3px] border-amber-400 pl-1.5'
                          : ''
                      }`}
                    >
                      {/* Линия показывает, куда именно встанет задача */}
                      {dropAt?.day === day && dropAt.index === taskIndex && (
                        <span className="absolute -top-px left-0 right-0 h-0.5 rounded-full bg-green-600 pointer-events-none" />
                      )}
                      {dropAt?.day === day && isLastTask && dropAt.index === taskIndex + 1 && (
                        <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-green-600 pointer-events-none" />
                      )}
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleWeeklyTask(weekKey, day, task.id)}
                        className={`w-5 h-5 sm:w-4 sm:h-4 mt-0.5 cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
                          task.completed ? 'animate-check-pop' : ''
                        }`}
                      />
                      {isEditingThis ? (
                        <div
                          className="flex-1 min-w-0 flex items-center gap-1.5"
                          onBlur={handleEditBlur}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEditing();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        >
                          <input
                            type="time"
                            value={editingTime}
                            onChange={e => setEditingTime(e.target.value)}
                            title="Task time"
                            aria-label="Task time"
                            className={`px-1 py-0.5 rounded text-xs flex-shrink-0 w-[70px] ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                          />
                          {/* Стереть время. Родное поле времени очистить нечем:
                              на телефоне у него нет ни крестика, ни клавиши, и
                              однажды проставленный час оставался навсегда.
                              preventDefault на нажатии удерживает фокус в строке —
                              иначе она закрылась бы по blur со старым значением */}
                          {editingTime && (
                            <button
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => setEditingTime('')}
                              title="Clear time"
                              aria-label="Clear time"
                              className={`p-1 rounded press-icon flex-shrink-0 ${mutedIcon}`}
                            >
                              <X size={12} />
                            </button>
                          )}
                          <input
                            type="text"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            autoFocus
                            aria-label="Task title"
                            className={`flex-1 min-w-0 px-1 py-0.5 rounded text-sm ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                          />
                        </div>
                      ) : (
                        <span
                          /* На телефоне текст сам открывает правку: карандаш в
                             каждой строке был третьим значком подряд, а места в
                             строке и так мало. На десктопе клик оставляем в покое —
                             там строку таскают мышью */
                          onClick={() => { if (isMobile) startEditing(day, task); }}
                          className={`flex-1 min-w-0 text-sm break-words transition-colors duration-200 ${
                            isMobile ? 'cursor-text' : ''
                          } ${
                            task.important && !task.completed ? 'font-semibold' : ''
                          } ${
                            // Выполненная задача просто гаснет: галочки достаточно
                            task.completed
                              ? darkMode ? 'text-gray-500' : 'text-gray-400'
                              : darkMode ? 'text-gray-200' : 'text-gray-700'
                          }`}
                        >
                          {task.time && (
                            <span className={`text-xs font-mono mr-1.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {task.time}
                            </span>
                          )}
                          {task.title}
                        </span>
                      )}
                      <button
                        onClick={() => toggleWeeklyTaskImportant(weekKey, day, task.id)}
                        title={task.important ? 'Not important' : 'Mark as important'}
                        aria-label={task.important ? 'Not important' : 'Mark as important'}
                        className={`p-1.5 sm:p-0.5 rounded press-icon flex-shrink-0 ${
                          task.important
                            ? 'opacity-100 text-amber-500'
                            : `opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${mutedIcon}`
                        }`}
                      >
                        <Star size={13} fill={task.important ? 'currentColor' : 'none'} />
                      </button>

                      <button
                        onClick={() => startEditing(day, task)}
                        title="Edit task"
                        aria-label="Edit task"
                        className={`hidden sm:block p-1.5 sm:p-0.5 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 press-icon flex-shrink-0 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-green-100'}`}
                      >
                        <Edit2 size={12} className={darkMode ? 'text-green-400' : 'text-green-600'} />
                      </button>
                      <button
                        onClick={() => deleteWeeklyTask(weekKey, day, task.id)}
                        title="Delete task"
                        aria-label="Delete task"
                        className={`p-1.5 sm:p-0.5 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 press-icon flex-shrink-0 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-red-100'}`}
                      >
                        <X size={13} className={darkMode ? 'text-red-400' : 'text-red-500'} />
                      </button>
                    </div>
                    );
                  })}
                </div>

                <div className={`flex items-center gap-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  {/* Часы открывают поле времени и сами становятся отметкой, что оно открыто */}
                  <button
                    onClick={() => toggleTimeField(day)}
                    title={timeOpen[day] ? 'Without time' : 'Set time'}
                    aria-label={timeOpen[day] ? 'Without time' : 'Set time'}
                    aria-pressed={!!timeOpen[day]}
                    className={`p-1 flex-shrink-0 rounded press-icon ${
                      timeOpen[day]
                        ? darkMode ? 'text-green-400' : 'text-green-700'
                        : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Clock size={14} />
                  </button>

                  {timeOpen[day] && (
                    <input
                      type="time"
                      value={newTimes[day] || ''}
                      onChange={e => setNewTimes({ ...newTimes, [day]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTask(day);
                        if (e.key === 'Escape') toggleTimeField(day);
                      }}
                      autoFocus
                      aria-label="Task time"
                      className={`text-xs py-1 bg-transparent focus:outline-none flex-shrink-0 w-[62px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                    />
                  )}

                  <input
                    type="text"
                    value={newTasks[day] || ''}
                    onChange={e => setNewTasks({ ...newTasks, [day]: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask(day)}
                    placeholder="Add task..."
                    className={`flex-1 min-w-0 text-sm py-1 bg-transparent focus:outline-none ${darkMode ? 'text-white placeholder-gray-500' : 'placeholder-gray-400'}`}
                  />
                  <button
                    onClick={() => handleAddTask(day)}
                    title="Add task"
                    aria-label="Add task"
                    className={`p-1 flex-shrink-0 press ${darkMode ? 'text-green-500 hover:text-green-400' : 'text-green-700 hover:text-green-800'}`}
                  >
                    <AddIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </PageShell>
  );
}
