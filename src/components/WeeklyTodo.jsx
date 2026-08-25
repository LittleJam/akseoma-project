import React, { useState, useEffect } from 'react';
import { Edit2, X, Plus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getWeekStart, addWeeks, getWeekKey, getWeekDates, isSameDay } from '../utils/weeks';
import { getQuoteForDate } from '../quotes';

export default function WeeklyTodo({ weeklyTasks, addWeeklyTask, deleteWeeklyTask, toggleWeeklyTask, editWeeklyTask, darkMode, weekDays }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [quoteOffset, setQuoteOffset] = useState(0);
  // Фраза привязана к дате. Если вкладку не закрывали, в полночь надо перерисоваться —
  // один таймер до следующей полуночи, без опроса каждую минуту
  const [dayStamp, setDayStamp] = useState(() => new Date().toDateString());
  const [newTasks, setNewTasks] = useState({});
  const [newTimes, setNewTimes] = useState({});
  const [editingItem, setEditingItem] = useState(null); // { day, taskId }
  const [editingText, setEditingText] = useState('');
  const [editingTime, setEditingTime] = useState('');

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
  }, [weekKey]);

  const handleAddTask = (day) => {
    if (newTasks[day]?.trim()) {
      addWeeklyTask(weekKey, day, newTasks[day], newTimes[day] || '');
      setNewTasks({ ...newTasks, [day]: '' });
      setNewTimes({ ...newTimes, [day]: '' });
    }
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
    setEditingItem(null);
    setEditingText('');
    setEditingTime('');
  };

  const navButtonClass = `p-1.5 rounded-lg border press ${
    darkMode
      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
  }`;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="px-5 sm:px-10 pt-8 sm:pt-14 pb-1 sm:pb-2 flex-shrink-0">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <div className="flex items-center gap-2">
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
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border press ${
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
          </div>
        </div>

        {/* Фраза дня над расписанием */}
        <div className="flex items-start gap-2 mt-4 group/quote">
          <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className="italic">“{quote.text}”</span>
            <span className="ml-1.5">— {quote.source}</span>
          </p>
          <button
            onClick={() => setQuoteOffset(prev => prev + 1)}
            title="Another quote"
            aria-label="Another quote"
            className={`p-0.5 rounded opacity-0 group-hover/quote:opacity-100 press-icon flex-shrink-0 mt-px ${
              darkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'
            }`}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-5 sm:p-10 pt-2 sm:pt-4 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 grid-rows-4 sm:grid-rows-2 gap-3 sm:gap-4 w-full">
          {weekDays.map((day, i) => {
            const date = weekDates[i];
            const isToday = isSameDay(date, today);

            return (
              <div
                key={day}
                className={`rounded-lg p-3 sm:p-4 flex flex-col h-[315px] min-h-0 border transition duration-150 ${
                  isToday
                    ? darkMode ? 'border-green-700 bg-green-950/40' : 'border-green-200 bg-green-50'
                    : darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="mb-4 flex-shrink-0">
                  <div className={`text-xs font-medium uppercase tracking-wide ${
                    isToday
                      ? darkMode ? 'text-green-400' : 'text-green-700'
                      : darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {day}
                  </div>
                  <div className={`text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                <div className="space-y-1 mb-3 flex-1 min-h-0 overflow-y-auto">
                  {weekTasks[day]?.map(task => (
                    <div key={task.id} className="flex items-center gap-2 py-1.5 group">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleWeeklyTask(weekKey, day, task.id)}
                        className={`w-4 h-4 cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
                          task.completed ? 'animate-check-pop' : ''
                        }`}
                      />
                      {editingItem?.day === day && editingItem?.taskId === task.id ? (
                        <>
                          <input
                            type="time"
                            value={editingTime}
                            onChange={e => setEditingTime(e.target.value)}
                            onBlur={saveEditing}
                            onKeyPress={e => e.key === 'Enter' && saveEditing()}
                            className={`px-1 py-0.5 rounded text-xs flex-shrink-0 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                          />
                          <input
                            type="text"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            onBlur={saveEditing}
                            onKeyPress={e => e.key === 'Enter' && saveEditing()}
                            autoFocus
                            className={`flex-1 px-1 py-0.5 rounded text-sm ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                          />
                        </>
                      ) : (
                        <span
                          onClick={() => startEditing(day, task)}
                          className={`flex-1 text-sm cursor-text transition-colors duration-200 ${
                            task.completed
                              ? darkMode ? 'line-through text-gray-500' : 'line-through text-gray-400'
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
                        onClick={() => startEditing(day, task)}
                        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 press-icon flex-shrink-0 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-green-100'}`}
                      >
                        <Edit2 size={12} className={darkMode ? 'text-green-400' : 'text-green-600'} />
                      </button>
                      <button
                        onClick={() => deleteWeeklyTask(weekKey, day, task.id)}
                        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 press-icon flex-shrink-0 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-red-100'}`}
                      >
                        <X size={13} className={darkMode ? 'text-red-400' : 'text-red-500'} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className={`flex items-center gap-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <input
                    type="time"
                    value={newTimes[day] || ''}
                    onChange={e => setNewTimes({ ...newTimes, [day]: e.target.value })}
                    className={`text-xs bg-transparent focus:outline-none flex-shrink-0 w-[70px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                  />
                  <input
                    type="text"
                    value={newTasks[day] || ''}
                    onChange={e => setNewTasks({ ...newTasks, [day]: e.target.value })}
                    onKeyPress={e => e.key === 'Enter' && handleAddTask(day)}
                    placeholder="Add task..."
                    className={`flex-1 text-sm bg-transparent focus:outline-none ${darkMode ? 'text-white placeholder-gray-500' : 'placeholder-gray-400'}`}
                  />
                  <button
                    onClick={() => handleAddTask(day)}
                    className={`press ${darkMode ? 'text-green-500 hover:text-green-400' : 'text-green-700 hover:text-green-800'}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
