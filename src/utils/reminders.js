import { Capacitor } from '@capacitor/core';
import { getWeekKey } from './weeks';
import { parseTaskTime } from './ics';

// Напоминания о задачах Расписания. Работают по-разному в двух оболочках, и
// разница принципиальная.
//
// В браузере это таймеры на ближайшие часы: настоящий push приходит с сервера,
// для него нужны VAPID-ключи, хранилище подписок и служба, которая просыпается
// в нужную минуту, — у сайта на статике ничего этого нет. Поэтому там
// напоминание срабатывает, пока вкладка или установленное приложение открыты,
// и перезаводится при каждом возвращении. Показываем через сервис-воркер: на
// Android только его уведомление переживает сворачивание. Воркера нет —
// обычным Notification.
//
// В нативной оболочке всё честнее: iOS сама будит приложение в назначенную
// минуту, поэтому напоминания отдаются системе заранее и срабатывают даже
// когда приложение закрыто. Оттуда и горизонт другой — неделя вперёд, а не
// двенадцать часов.

export const DEFAULT_REMINDERS = {
  enabled: false,   // напоминание о каждой задаче со временем
  lead: 10,
  digest: false,    // одна сводка с утра на весь день
  digestAt: '08:00'
};

// За сколько минут предупреждать. Ноль — ровно в назначенное время
export const LEAD_OPTIONS = [0, 5, 10, 30, 60];

// Дальше этого горизонта таймеры не ставим: браузер их всё равно не сохранит
// между сессиями, а при следующем открытии приложения список пересоберётся
const HORIZON_MS = 12 * 60 * 60 * 1000;

// Нативные напоминания живут у системы, поэтому их можно отдать заранее.
// Неделя — это ровно та неделя, которую показывает Расписание. Больше шести
// десятков ждущих уведомлений iOS не держит, поэтому счёт ограничен
const NATIVE_DAYS_AHEAD = 7;
const NATIVE_LIMIT = 60;

// Сколько задач перечислять в сводке. Уведомление всё равно показывает
// несколько строк, а дальше система обрезает его сама — лучше обрезать
// осмысленно и сказать, сколько осталось
const DIGEST_LINES = 6;

const isNative = () => Capacitor.isNativePlatform();

// Разрешение у системы спрашивается асинхронно, а экран настроек читает его
// прямо во время отрисовки. Поэтому держим последний известный ответ здесь
let nativePermission = 'default';

const refreshNativePermission = async () => {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const status = await LocalNotifications.checkPermissions();
    nativePermission = status.display === 'granted' ? 'granted'
      : status.display === 'denied' ? 'denied'
      : 'default';
  } catch (error) {
    console.error('Native notifications check failed:', error);
  }
  return nativePermission;
};

if (isNative()) refreshNativePermission();

const BASE = import.meta.env.BASE_URL;

export const notificationsSupported = () =>
  isNative() || (typeof window !== 'undefined' && 'Notification' in window);

export const notificationPermission = () => {
  if (isNative()) return nativePermission;
  return 'Notification' in window ? Notification.permission : 'unsupported';
};

export const requestNotificationPermission = async () => {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const status = await LocalNotifications.requestPermissions();
      nativePermission = status.display === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      console.error('Native notifications request failed:', error);
      nativePermission = 'denied';
    }
    return nativePermission;
  }

  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    // Старый Safari отвечает колбэком и промиса не возвращает
    return Notification.permission;
  }
};

const showReminder = async (title, body, tag) => {
  const options = {
    body,
    tag,                       // одна задача — одно уведомление, а не стопка
    icon: `${BASE}icon-192.png`,
    badge: `${BASE}icon-192.png`
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // Воркера нет или он не отвечает — покажем сами
  }

  try {
    new Notification(title, options);
  } catch {
    // На Android конструктор запрещён вовсе; без воркера напомнить нечем
  }
};

// «08:00» — в часы и минуты. Время сводки хранится строкой: его вводят
// через <input type="time">, который отдаёт именно такую
const parseDigestAt = (value) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
};

// Заголовок и тело сводки по задачам одного дня. null — если перечислять
// нечего: молчание в пустой день полезнее уведомления «сегодня ничего»
const buildDigest = (tasks) => {
  const open = tasks.filter(task => !task.completed);
  if (open.length === 0) return null;

  // Сначала задачи со временем, по возрастанию, потом всё остальное:
  // сводка читается как расписание дня, а не как список в порядке ввода
  const minutesOf = (task) => {
    const at = parseTaskTime(task.time);
    return at ? at.hours * 60 + at.minutes : Infinity;
  };
  const sorted = [...open].sort((a, b) => minutesOf(a) - minutesOf(b));

  const lines = sorted
    .slice(0, DIGEST_LINES)
    .map(task => (task.time ? `${task.time} · ${task.title}` : task.title));
  const rest = sorted.length - lines.length;
  if (rest > 0) lines.push(`and ${rest} more`);

  return {
    title: open.length === 1 ? 'Today · 1 task' : `Today · ${open.length} tasks`,
    body: lines.join('\n')
  };
};

// Ждущие уведомления системе нужны с числовым идентификатором. Собираем его из
// id задачи и дня: одна задача в один день — одно напоминание, а не стопка
const notificationId = (taskId, dueAt) => {
  const source = `${taskId}@${dueAt.toDateString()}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  // 31 бит: отрицательные и слишком большие числа система не принимает
  return Math.abs(hash) % 2147483647;
};

// Нативный путь: отдаём напоминания системе на неделю вперёд. Прежние снимаем
// целиком — все ждущие уведомления здесь наши, и пересборка списка должна
// заменять их, а не добавляться к ним
const scheduleNativeReminders = async ({
  weeklyTasks, weekDays, lead, taskReminders, digest, digestAt, now
}) => {
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) await LocalNotifications.cancel(pending);

  if (nativePermission !== 'granted') return;

  const notifications = [];
  const digestTime = digest ? parseDigestAt(digestAt) : null;

  // Сводки ставим первым проходом, до отдельных напоминаний: их всего семь,
  // а задач может оказаться больше, чем система готова держать, — и вытеснять
  // должно не сводку, ради которой всё и затевалось
  if (digestTime) {
    for (let offset = 0; offset < NATIVE_DAYS_AHEAD; offset += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const dayName = weekDays[(day.getDay() + 6) % 7];
      const summary = buildDigest(weeklyTasks[getWeekKey(day)]?.[dayName] || []);
      if (!summary) continue;

      const fireAt = new Date(
        day.getFullYear(), day.getMonth(), day.getDate(), digestTime.hours, digestTime.minutes
      );
      if (fireAt <= now) continue;

      notifications.push({
        id: notificationId('digest', fireAt),
        title: summary.title,
        body: summary.body,
        schedule: { at: fireAt, allowWhileIdle: true }
      });
    }
  }

  if (!taskReminders) {
    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
    return;
  }

  for (let offset = 0; offset < NATIVE_DAYS_AHEAD; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const dayName = weekDays[(day.getDay() + 6) % 7];
    const tasks = weeklyTasks[getWeekKey(day)]?.[dayName] || [];

    tasks.forEach(task => {
      if (task.completed || notifications.length >= NATIVE_LIMIT) return;

      const at = parseTaskTime(task.time);
      if (!at) return;

      const dueAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), at.hours, at.minutes);
      const fireAt = new Date(dueAt.getTime() - lead * 60000);
      if (fireAt <= now) return;

      notifications.push({
        id: notificationId(task.id, dueAt),
        title: task.title,
        body: lead > 0 ? `In ${lead} min · ${task.time}` : `Now · ${task.time}`,
        schedule: { at: fireAt, allowWhileIdle: true }
      });
    });
  }

  if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
};

// Ставит напоминания на ближайшие задачи со временем. Возвращает функцию
// отмены — её зовут перед каждой пересборкой, иначе таймеры копятся
export const scheduleDayReminders = ({
  weeklyTasks = {},
  weekDays = [],
  lead = DEFAULT_REMINDERS.lead,
  taskReminders = true,
  digest = false,
  digestAt = DEFAULT_REMINDERS.digestAt,
  now = new Date()
}) => {
  if (notificationPermission() !== 'granted') return () => {};

  if (isNative()) {
    scheduleNativeReminders({ weeklyTasks, weekDays, lead, taskReminders, digest, digestAt, now })
      .catch(error => console.error('Native reminders error:', error));
    // Отменять нечего: уведомления лежат у системы и должны пережить и
    // сворачивание, и закрытие приложения. Прежние снимет следующая пересборка
    return () => {};
  }

  const timers = [];

  // Сводка в браузере — такой же таймер, как и остальные, и живёт только
  // пока открыто приложение. Горизонта в полсуток хватает на завтрашнее утро,
  // если приложение оставили открытым с вечера
  const digestTime = digest ? parseDigestAt(digestAt) : null;
  if (digestTime) {
    for (let offset = 0; offset < 2; offset += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const summary = buildDigest(weeklyTasks[getWeekKey(day)]?.[weekDays[(day.getDay() + 6) % 7]] || []);
      if (!summary) continue;

      const fireAt = new Date(
        day.getFullYear(), day.getMonth(), day.getDate(), digestTime.hours, digestTime.minutes
      );
      const delay = fireAt.getTime() - now.getTime();
      if (delay <= 0 || delay > HORIZON_MS) continue;

      timers.push(setTimeout(
        () => showReminder(summary.title, summary.body, `digest-${fireAt.toDateString()}`),
        delay
      ));
    }
  }

  if (!taskReminders) return () => timers.forEach(clearTimeout);

  // Понедельник у недели первый, а getDay() считает от воскресенья
  const dayName = weekDays[(now.getDay() + 6) % 7];
  const tasks = weeklyTasks[getWeekKey(now)]?.[dayName] || [];

  tasks.forEach(task => {
    if (task.completed) return;

    const at = parseTaskTime(task.time);
    if (!at) return;

    const dueAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), at.hours, at.minutes);
    const delay = dueAt.getTime() - lead * 60000 - now.getTime();
    if (delay <= 0 || delay > HORIZON_MS) return;

    timers.push(setTimeout(() => {
      showReminder(
        lead > 0 ? `In ${lead} min · ${task.time}` : `Now · ${task.time}`,
        task.title,
        `weekly-${task.id}`
      );
    }, delay));
  });

  return () => timers.forEach(clearTimeout);
};
