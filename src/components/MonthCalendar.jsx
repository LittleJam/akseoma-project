import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date, delta) => new Date(date.getFullYear(), date.getMonth() + delta, 1);
const sameDay = (a, b) => a.toDateString() === b.toDateString();

// Понедельник, с которого начинается сетка месяца — может быть в предыдущем
// месяце, если 1-е число само не понедельник
const gridStart = (monthStart) => {
  const d = new Date(monthStart);
  const weekday = (d.getDay() + 6) % 7; // 0 = понедельник
  d.setDate(d.getDate() - weekday);
  return d;
};

// Календарь на месяц, а не колесо дат: неделя строкой уже есть в Schedule,
// здесь нужен обзор на месяц вперёд — например, чтобы поставить задачу на
// поездку через три недели, не листая неделю за неделей
export default function MonthCalendar({ value, onChange, darkMode }) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value || new Date()));
  const today = new Date();

  const start = gridStart(viewMonth);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = (viewMonth.getDay() + 6) % 7;
  // Ровно столько строк, сколько нужно месяцу — без лишней пустой недели в конце
  const rows = Math.ceil((firstWeekday + daysInMonth) / 7);
  const days = Array.from({ length: rows * 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const mutedText = darkMode ? 'text-gray-500' : 'text-gray-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setViewMonth(prev => addMonths(prev, -1))}
          title="Previous month"
          aria-label="Previous month"
          className={`p-1.5 rounded press-icon ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ChevronLeft size={16} />
        </button>
        <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(prev => addMonths(prev, 1))}
          title="Next month"
          aria-label="Next month"
          className={`p-1.5 rounded press-icon ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={`grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide mb-1 ${mutedText}`}>
        {WEEKDAY_LABELS.map(label => <span key={label}>{label}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(date => {
          const inMonth = date.getMonth() === viewMonth.getMonth();
          const isToday = sameDay(date, today);
          const isSelected = value && sameDay(date, value);

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onChange(date)}
              aria-pressed={isSelected}
              className={`aspect-square rounded-lg text-sm press ${
                isSelected
                  ? 'bg-green-600 text-white font-semibold'
                  : !inMonth
                    ? `${mutedText} opacity-50 hover:opacity-80`
                    : isToday
                      ? darkMode ? 'border border-green-700 text-green-400' : 'border border-green-300 text-green-700'
                      : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
