// Выгрузка Расписания в родной календарь. Писать в календарь телефона или
// Mac из браузера нельзя — общий язык у всех календарей один, формат ICS
// (RFC 5545): приложение отдаёт файл, календарь его импортирует.
//
// В календарь уходят только задачи с временем: строка без времени — это пункт
// списка на день, и в сетке календаря ей делать нечего.

import { Capacitor } from '@capacitor/core';

import { getWeekKey, getWeekStart, addWeeks } from './weeks';

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

export const parseTaskTime = (time) => {
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
      .map(task => ({ task, day, date, at: parseTaskTime(task.time) }))
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

// Отдать файл наружу. Календарь на Mac и на телефоне открывает .ics сам,
// поэтому «скачать» здесь и означает «добавить в календарь».
//
// В нативной оболочке скачивания нет вовсе: WKWebView не умеет ни <a download>,
// ни blob-ссылку, и кнопка молча ничего бы не делала. Там файл кладётся во
// временную папку приложения и отдаётся системному «Поделиться» — из него iOS
// сама предлагает «Добавить в Календарь»
const shareIcsFile = async (filename, text) => {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  await Filesystem.writeFile({
    path: filename,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  });

  const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
  await Share.share({ title: 'Schedule', url: uri });
};

export const downloadIcs = (filename, text) => {
  if (Capacitor.isNativePlatform()) {
    return shareIcsFile(filename, text).catch(error => {
      // Отмена «Поделиться» тоже приходит ошибкой — это не сбой
      if (!/cancel/i.test(error?.message || '')) console.error('Calendar share error:', error);
    });
  }

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
  return Promise.resolve();
};

// ── Ввоз из других календарей ──────────────────────────────────────────────
// Приложение читает тот же формат, что и отдаёт: .ics, выгруженный из Google
// Calendar, Apple Calendar, Outlook. Подписку по ссылке (webcal://) браузер
// достать не может — чужой сервер не отдаёт заголовки CORS, — поэтому ввоз
// идёт файлом, который выгружают сами календари.
//
// Разбираем то, что в этих выгрузках действительно встречается: одиночные
// события и простые повторы (каждый день, каждую неделю). Всё остальное —
// сложные правила, исключения, вложенные часовые пояса — пропускаем и честно
// сообщаем числом: выдумать за календарь его расписание нельзя.

// По стандарту длинные строки перенесены, и продолжение начинается с пробела
// или табуляции. Сначала склеиваем их обратно
const unfoldIcs = (text) => text.replace(/\r\n[ \t]/g, '').replace(/[\r\n][ \t]/g, '');

const unescapeIcs = (value) =>
  value.replace(/\\n/gi, '\n').replace(/\\([;,\\])/g, '$1');

// Строка вида DTSTART;TZID=Europe/Minsk:20260907T150000
const parseIcsLine = (line) => {
  const colon = line.indexOf(':');
  if (colon === -1) return null;

  const [name, ...paramParts] = line.slice(0, colon).split(';');
  const params = {};
  paramParts.forEach(part => {
    const [key, value = ''] = part.split('=');
    params[key.toUpperCase()] = value;
  });

  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
};

// 20260907 | 20260907T150000 | 20260907T150000Z
//
// Z — момент в UTC, его переводим в местное время. Без Z время местное: и для
// «floating», и для TZID. Своей базы часовых поясов у приложения нет, а
// переводить из чужой зоны без неё — гадание; для расписания на день
// разница видна только у событий из другого пояса, и об этом сказано на экране
const parseIcsDate = (value, params = {}) => {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(value).trim());
  if (!match) return null;

  const [, year, month, day, hours, minutes, seconds, utc] = match;
  const allDay = !hours || params.VALUE === 'DATE';

  const date = utc
    ? new Date(Date.UTC(+year, +month - 1, +day, +hours, +minutes, +(seconds || 0)))
    : new Date(+year, +month - 1, +day, +(hours || 0), +(minutes || 0), +(seconds || 0));

  return { date, allDay };
};

const parseRrule = (value) => {
  const rule = {};
  String(value).split(';').forEach(part => {
    const [key, val = ''] = part.split('=');
    rule[key.toUpperCase()] = val;
  });
  return rule;
};

// Даты повторов внутри окна. BYDAY не разбираем: день недели берём у самого
// события, а перечисление дней в одном правиле встречается реже, чем кажется
const expandOccurrences = (start, rule, windowEnd) => {
  if (!rule) return [start];

  const freq = (rule.FREQ || '').toUpperCase();
  if (freq !== 'DAILY' && freq !== 'WEEKLY') return null;   // не развернём — пропустим

  const stepDays = (Number(rule.INTERVAL) || 1) * (freq === 'WEEKLY' ? 7 : 1);
  const count = Number(rule.COUNT) || Infinity;
  const until = rule.UNTIL ? parseIcsDate(rule.UNTIL)?.date : null;

  const dates = [];
  const cursor = new Date(start);

  // Предохранитель на случай правила без конца: окно всё равно ограничено,
  // но цикл не должен зависеть от того, что в файле
  for (let i = 0; i < 500 && dates.length < count; i += 1) {
    if (cursor > windowEnd) break;
    if (until && cursor > until) break;
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + stepDays);
  }

  return dates;
};

export const parseIcsEvents = (text) => {
  const events = [];
  let current = null;

  unfoldIcs(String(text)).split(/\r?\n/).forEach(rawLine => {
    const line = parseIcsLine(rawLine.trim());
    if (!line) return;

    if (line.name === 'BEGIN' && line.value === 'VEVENT') {
      current = {};
      return;
    }
    if (line.name === 'END' && line.value === 'VEVENT') {
      if (current?.start) events.push(current);
      current = null;
      return;
    }
    if (!current) return;

    if (line.name === 'DTSTART') {
      const parsed = parseIcsDate(line.value, line.params);
      if (parsed) {
        current.start = parsed.date;
        current.allDay = parsed.allDay;
      }
    } else if (line.name === 'SUMMARY') {
      current.title = unescapeIcs(line.value).trim();
    } else if (line.name === 'UID') {
      current.uid = line.value.trim();
    } else if (line.name === 'RRULE') {
      current.rrule = parseRrule(line.value);
    }
  });

  return events;
};

const pad2 = (n) => String(n).padStart(2, '0');

// Ввоз в расписание. Возвращает новую карту недель и числа: сколько дел
// добавлено, сколько уже стояло и сколько событий разобрать не удалось.
// Окно ограничено (по умолчанию восемь недель вперёд): календарь может
// содержать годы истории, а расписание — план на неделю, а не архив
export const importIcsIntoWeeks = ({
  text,
  weeklyTasks = {},
  weekDays = [],
  from = new Date(),
  weeks = 8
}) => {
  const events = parseIcsEvents(text);
  const windowStart = getWeekStart(from);
  const windowEnd = addWeeks(windowStart, weeks);

  const next = { ...weeklyTasks };
  let added = 0;
  let duplicates = 0;
  let unsupported = 0;

  events.forEach(event => {
    const occurrences = expandOccurrences(event.start, event.rrule, windowEnd);
    if (!occurrences) {
      unsupported += 1;
      return;
    }

    occurrences.forEach(date => {
      if (date < windowStart || date > windowEnd) return;

      const weekKey = getWeekKey(date);
      // Понедельник у недели первый, а getDay() считает от воскресенья
      const day = weekDays[(date.getDay() + 6) % 7];
      if (!day) return;

      const week = next[weekKey] ? { ...next[weekKey] } : {};
      const list = week[day] ? [...week[day]] : [];

      // Один и тот же ввоз дважды не должен удваивать дела: событие узнаём по
      // его UID и дате повтора
      const stamp = `${event.uid || event.title}@${date.toDateString()}`;
      if (list.some(task => task.icsUid === stamp)) {
        duplicates += 1;
        return;
      }

      list.push({
        id: `${Date.now().toString(36)}-${added}`,
        title: event.title || 'Untitled event',
        time: event.allDay ? '' : `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
        completed: false,
        icsUid: stamp
      });

      week[day] = list;
      next[weekKey] = week;
      added += 1;
    });
  });

  return { weeklyTasks: next, added, duplicates, unsupported, events: events.length };
};
