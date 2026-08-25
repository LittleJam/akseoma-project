// Недели считаются с понедельника. Ключ недели — локальная дата её понедельника (YYYY-MM-DD).
// Локальная, а не toISOString(): UTC-сдвиг мог бы увести ключ на предыдущий день.

export const getWeekStart = (date = new Date()) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = d.getDay(); // 0 = воскресенье
  d.setDate(d.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
  return d;
};

export const addWeeks = (date, weeks) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + weeks * 7);
  return d;
};

export const getWeekKey = (date = new Date()) => {
  const weekStart = getWeekStart(date);
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
  return `${weekStart.getFullYear()}-${month}-${day}`;
};

// Семь дат недели, начиная с понедельника
export const getWeekDates = (weekStart) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    d.setDate(weekStart.getDate() + i);
    return d;
  });

export const isSameDay = (a, b) => a.toDateString() === b.toDateString();

// «Aug 24 – Aug 30», а внутри одного месяца — «Aug 24 – 30»
export const formatWeekRange = (weekStart) => {
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const start = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = weekEnd.toLocaleDateString(
    'en-US',
    weekStart.getMonth() === weekEnd.getMonth() ? { day: 'numeric' } : { month: 'short', day: 'numeric' }
  );
  return `${start} – ${end}`;
};

// Ярлык относительно текущей недели; дальше ±1 говорим только диапазоном дат
export const getWeekLabel = (offset) => {
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Next week';
  if (offset === -1) return 'Last week';
  return null;
};
