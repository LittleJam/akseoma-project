// Выгрузка Расписания в родной календарь. Писать в календарь телефона или
// Mac из браузера нельзя — общий язык у всех календарей один, формат ICS
// (RFC 5545): приложение отдаёт файл, календарь его импортирует.
//
// В календарь уходят только задачи с временем: строка без времени — это пункт
// списка на день, и в сетке календаря ей делать нечего.

const PRODID = '-//Surf the Task//Schedule//EN';

// Сколько длится задача. Времени конца в Расписании нет, а событие нулевой
// длины часть календарей рисует неразличимой полоской, поэтому час по умолчанию
const DEFAULT_MINUTES = 60;

const HHMM = /^(\d{1,2}):(\d{2})$/;

// Приложение хранит «15:00» без часового пояса, и таким же уходит в файл:
// floating time по RFC 5545 календарь читает как местное время смотрящего.
// Задача на 15:00 останется на 15:00 и в другом поясе, а в файл не приходится
// тащить описание зоны со всеми переходами на летнее время
const pad = (n) => String(n).padStart(2, '0');

const localStamp = (date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;

const utcStamp = (date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

// В тексте события запятая, точка с запятой и обратный слэш — служебные символы
const escapeText = (value) =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

// Строка длиннее 75 октетов по стандарту переносится, продолжение начинается с
// пробела. Считаем именно октеты: в кириллице символ занимает два байта, и по
// символам счёт дал бы слишком длинные строки
const encoder = new TextEncoder();

const foldLine = (line) => {
  const parts = [];
  let current = '';
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    // 75 — предел для первой строки, у продолжений один октет уходит на пробел
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }

  parts.push(current);
  return parts.join('\r\n ');
};

// Одна и та же задача при повторном экспорте должна обновить событие, а не
// добавить второе, поэтому UID собран из ключей, а не случайный
const eventUid = (weekKey, day, taskId) => `${weekKey}-${day}-${taskId}@surf-the-task`;

// Календарь считает свежей ту версию события, у которой SEQUENCE больше.
// Секунды с 2020 года монотонно растут и влезают в 32-битное целое, поэтому
// каждый следующий экспорт заведомо перекрывает предыдущий
const SEQUENCE_EPOCH = Date.UTC(2020, 0, 1);
const sequenceFor = (now) => Math.floor((now.getTime() - SEQUENCE_EPOCH) / 1000);

const parseTime = (time) => {
  const match = HHMM.exec(String(time || '').trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return { hours, minutes };
};

// Задачи недели, у которых есть время: только они попадают в календарь
export const timedWeekTasks = ({ weekTasks = {}, weekDays = [], weekDates = [] }) =>
  weekDays.flatMap((day, index) => {
    const date = weekDates[index];
    if (!date) return [];

    return (weekTasks[day] || [])
      .map(task => ({ task, day, date, at: parseTime(task.time) }))
      .filter(item => item.at);
  });

// Файл календаря из задач одной недели. Возвращает null, если выгружать нечего
export const buildWeekIcs = ({
  weekKey,
  weekTasks,
  weekDays,
  weekDates,
  calendarName = 'Surf the Task',
  minutes = DEFAULT_MINUTES,
  now = new Date()
}) => {
  const items = timedWeekTasks({ weekTasks, weekDays, weekDates });
  if (items.length === 0) return null;

  const stamp = utcStamp(now);
  const sequence = sequenceFor(now);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`
  ];

  items.forEach(({ task, day, date, at }) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), at.hours, at.minutes);
    const end = new Date(start.getTime() + minutes * 60000);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${eventUid(weekKey, day, task.id)}`,
      `DTSTAMP:${stamp}`,
      `SEQUENCE:${sequence}`,
      `DTSTART:${localStamp(start)}`,
      `DTEND:${localStamp(end)}`,
      `SUMMARY:${escapeText(task.title)}`
    );

    // Отмеченная звездой задача уходит с высоким приоритетом, сделанная —
    // подтверждённой: два флага Расписания, которым есть пара в стандарте
    if (task.important) lines.push('PRIORITY:1');
    if (task.completed) lines.push('STATUS:CONFIRMED');

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  // Стандарт требует CRLF, и файл заканчивается переводом строки
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
};

// Отдать файл броузеру. Календарь на Mac и на телефоне открывает .ics сам,
// поэтому «скачать» здесь и означает «добавить в календарь»
export const downloadIcs = (filename, text) => {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Ссылку освобождаем не сразу: Safari успевает открыть файл только после клика
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
