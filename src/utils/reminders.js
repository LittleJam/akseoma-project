import { getWeekKey } from './weeks';
import { parseTaskTime } from './ics';

// Напоминания о задачах Расписания.
//
// Честно про границы: это местные уведомления, а не настоящий push. Настоящий
// приходит с сервера, для него нужны VAPID-ключи, хранилище подписок и служба,
// которая просыпается в нужную минуту, — у приложения ничего этого нет, оно
// живёт на статике. Поэтому напоминания ставятся таймерами на ближайшие часы:
// они срабатывают, пока вкладка или установленное приложение открыты, и
// перезаводятся при каждом возвращении к приложению. Это покрывает обычный
// случай «телефон в руке весь день» и не обещает того, чего не может.
//
// Показываем через сервис-воркер: на Android только его уведомление
// переживает сворачивание приложения. Если воркера нет — обычным Notification.

export const DEFAULT_REMINDERS = { enabled: false, lead: 10 };

// За сколько минут предупреждать. Ноль — ровно в назначенное время
export const LEAD_OPTIONS = [0, 5, 10, 30, 60];

// Дальше этого горизонта таймеры не ставим: браузер их всё равно не сохранит
// между сессиями, а при следующем открытии приложения список пересоберётся
const HORIZON_MS = 12 * 60 * 60 * 1000;

const BASE = import.meta.env.BASE_URL;

export const notificationsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const notificationPermission = () =>
  (notificationsSupported() ? Notification.permission : 'unsupported');

export const requestNotificationPermission = async () => {
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

// Ставит таймеры на сегодняшние задачи со временем. Возвращает функцию отмены —
// её зовут перед каждой пересборкой, иначе таймеры копятся
export const scheduleDayReminders = ({
  weeklyTasks = {},
  weekDays = [],
  lead = DEFAULT_REMINDERS.lead,
  now = new Date()
}) => {
  if (notificationPermission() !== 'granted') return () => {};

  // Понедельник у недели первый, а getDay() считает от воскресенья
  const dayName = weekDays[(now.getDay() + 6) % 7];
  const tasks = weeklyTasks[getWeekKey(now)]?.[dayName] || [];
  const timers = [];

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
