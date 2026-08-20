import React, { useState } from 'react';
import { Edit2, X, Plus } from 'lucide-react';

function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday ... 6 = Saturday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const isSameDay = (a, b) => a.toDateString() === b.toDateString();

export default function WeeklyTodo({ weeklyTasks, addWeeklyTask, deleteWeeklyTask, toggleWeeklyTask, editWeeklyTask, darkMode, weekDays }) {
  const [newTasks, setNewTasks] = useState({});
  const [editingItem, setEditingItem] = useState(null); // { day, taskId }
  const [editingText, setEditingText] = useState('');

  const today = new Date();
  const weekDates = getWeekDates();

  const handleAddTask = (day) => {
    if (newTasks[day]?.trim()) {
      addWeeklyTask(day, newTasks[day]);
      setNewTasks({ ...newTasks, [day]: '' });
    }
  };

  const startEditing = (day, task) => {
    setEditingItem({ day, taskId: task.id });
    setEditingText(task.title);
  };

  const saveEditing = () => {
    if (editingItem && editingText.trim()) {
      editWeeklyTask(editingItem.day, editingItem.taskId, editingText);
    }
    setEditingItem(null);
    setEditingText('');
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="px-8 pt-8 pb-6 flex-shrink-0">
        <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Schedule
        </h2>
      </div>

      <div className="flex-1 min-h-0 px-8 pb-8 flex items-center justify-center">
        <div className="grid grid-cols-4 grid-rows-2 gap-4 h-[56%] w-full">
          {weekDays.map((day, i) => {
            const date = weekDates[i];
            const isToday = isSameDay(date, today);

            return (
              <div
                key={day}
                className={`rounded-lg p-4 flex flex-col h-full min-h-0 border ${
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
                  {weeklyTasks[day]?.map(task => (
                    <div key={task.id} className="flex items-center gap-2 py-1.5 group">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleWeeklyTask(day, task.id)}
                        className="w-4 h-4 cursor-pointer flex-shrink-0"
                      />
                      {editingItem?.day === day && editingItem?.taskId === task.id ? (
                        <input
                          type="text"
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onBlur={saveEditing}
                          onKeyPress={e => e.key === 'Enter' && saveEditing()}
                          autoFocus
                          className={`flex-1 px-1 py-0.5 rounded text-sm ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                        />
                      ) : (
                        <span
                          onClick={() => startEditing(day, task)}
                          className={`flex-1 text-sm cursor-text ${
                            task.completed
                              ? darkMode ? 'line-through text-gray-500' : 'line-through text-gray-400'
                              : darkMode ? 'text-gray-200' : 'text-gray-700'
                          }`}
                        >
                          {task.title}
                        </span>
                      )}
                      <button
                        onClick={() => startEditing(day, task)}
                        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 flex-shrink-0 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-green-100'}`}
                      >
                        <Edit2 size={12} className={darkMode ? 'text-green-400' : 'text-green-600'} />
                      </button>
                      <button
                        onClick={() => deleteWeeklyTask(day, task.id)}
                        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 flex-shrink-0 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-red-100'}`}
                      >
                        <X size={13} className={darkMode ? 'text-red-400' : 'text-red-500'} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className={`flex items-center gap-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
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
                    className={darkMode ? 'text-green-500 hover:text-green-400' : 'text-green-700 hover:text-green-800'}
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
