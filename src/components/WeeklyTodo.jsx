import React, { useEffect, useRef, useState } from 'react';
import {
  Edit2, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Star, Clock, ArrowLeft
} from 'lucide-react';
import { themeIcon } from '../themes';
import { getWeekStart, addWeeks, getWeekKey, getWeekDates, isSameDay } from '../utils/weeks';
import { getQuoteForDate } from '../quotes';
import { getSign, getHoroscopeForDate, getHoroscopeDetails } from '../horoscope';
import PageShell from './PageShell';
import { SCHEDULE_LAYOUTS, DEFAULT_SCHEDULE_LAYOUT } from '../constants';
import ScrollMore from './ScrollMore';
import Modal from './Modal';
import MonthCalendar from './MonthCalendar';
import useIsMobile from '../utils/useIsMobile';

export default function WeeklyTodo({ weeklyTasks, addWeeklyTask, deleteWeeklyTask, toggleWeeklyTask, editWeeklyTask, moveWeeklyTask, toggleWeeklyTaskImportant, darkMode, theme, weekDays, zodiacSign, risingSign, moonSign, moonExact, horoscopeOpen, setHoroscopeOpen, scheduleLayout = DEFAULT_SCHEDULE_LAYOUT }) {
  // Сохранённая раскладка могла остаться от варианта, которого в списке уже нет
  const layoutGrid = (SCHEDULE_LAYOUTS.find(item => item.id === scheduleLayout)
    || SCHEDULE_LAYOUTS[0]).grid;
  const AddIcon = themeIcon(theme, 'add');
  const [weekOffset, setWeekOffset] = useState(0);
  // Фраза привязана к дате. Если вкладку не закрывали, в полночь надо перерисоваться —
  // один таймер до следующей полуночи, без опроса каждую минуту
  const [dayStamp, setDayStamp] = useState(() => new Date().toDateString());
  const [newTasks, setNewTasks] = useState({});
  const [newTimes, setNewTimes] = useState({});
  // Время нужно не каждой задаче, поэтому поле появляется по клику на часы:
  // пустое «--:--» в каждой карточке дня читалось как сломанные данные
  const [timeOpen, setTimeOpen] = useState({});
  // То же самое, но для строки правки готовой задачи: открыто ли там поле
  // времени. Строка правки в приложении всегда одна, поэтому флаг один,
  // а не словарь по дням, как у строки добавления
  const [editTimeOpen, setEditTimeOpen] = useState(false);
  // Прошедшие дни текущей недели на телефоне свёрнуты в одну строку над
  // сегодняшним: они уже позади, а место дорогое. Разворачиваются все разом
  const [pastOpen, setPastOpen] = useState(false);
  const isMobile = useIsMobile();
  // Вся неделя разом на телефоне — это восемь карточек в четыре столбца,
  // около 80px на каждую. Ни обычная типографика, ни поле ввода туда не
  // помещаются, поэтому у такого режима свой, ужатый вид (см. index.css)
  const compact = isMobile && scheduleLayout === 'week';
  // Какой день раскрыт списком под сеткой. null — ещё не выбирали, показываем
  // сегодняшний; при листании недель выбор сохраняется по дню недели
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // { day, taskId }
  const [editingText, setEditingText] = useState('');
  const [editingTime, setEditingTime] = useState('');
  // Что тащим и над каким днём держим — подсветка дня-приёмника
  const [draggedTask, setDraggedTask] = useState(null); // { day, taskId }
  const [dragOverDay, setDragOverDay] = useState(null);
  // Куда именно ляжет задача внутри дня: линия между строками { day, index }
  const [dropAt, setDropAt] = useState(null);
  // Быстрое добавление — задача на любой день недели без прокрутки к его
  // карточке: на телефоне прошедшие дни ещё и свёрнуты, до них не дотянуться
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState(() => new Date());
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddTime, setQuickAddTime] = useState('');
  // Время скрыто по умолчанию, как и в карточке дня: пустое поле «--:--»
  // выглядит как незаполненные данные, хотя задача без времени — обычное дело
  const [quickAddTimeOpen, setQuickAddTimeOpen] = useState(false);
  // Системный пикер открывается сразу по клику на «Add a time», без второго
  // тапа по уже показанному полю: фокус ставим в эффекте следом за тем же
  // рендером, что открыл поле — жест пользователя ещё свежий
  const quickAddTimeRef = useRef(null);
  useEffect(() => {
    if (quickAddTimeOpen) quickAddTimeRef.current?.focus();
  }, [quickAddTimeOpen]);
  // Правка и удаление задач, уже стоящих на выбранный день — прямо в этом же
  // окне, без похода в само Расписание
  const [quickEditId, setQuickEditId] = useState(null);
  const [quickEditText, setQuickEditText] = useState('');
  const [quickEditTime, setQuickEditTime] = useState('');

  const today = new Date();
  const weekStart = addWeeks(getWeekStart(today), weekOffset);
  const weekKey = getWeekKey(weekStart);
  const weekDates = getWeekDates(weekStart);
  const weekTasks = weeklyTasks[weekKey] || {};
  // Цитата привязана к дате и меняется сама, в полночь: кнопки «другая
  // цитата» больше нет, и смещение перебирать некому
  const quote = getQuoteForDate(today, 0);

  // Порядок дней всегда обычный, с понедельника: неделя должна читаться как
  // неделя. До сегодняшнего дня на телефоне сворачивается — прошедшие дни
  // стоят на своих местах перед текущим, но строкой, а не карточкой.
  // Свернуть можно только то, что позади, и только на телефоне: в пролистанных
  // неделях сегодня нет, а прошлую неделю открывают, чтобы её прочитать
  const days = weekDays.map((day, index) => ({ day, date: weekDates[index] }));
  const todayIndex = days.findIndex(({ date }) => isSameDay(date, today));
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Сворачивать прошедшие дни в этом режиме незачем: его и выбирают ради
  // того, чтобы видеть неделю целиком
  const isPastDay = (date) => isMobile && !compact && todayIndex >= 0 && date < startOfToday;

  const pastDays = days.filter(({ date }) => isPastDay(date));
  const restDays = days.filter(({ date }) => !isPastDay(date));
  // Свёрнутые дни стоят на своих местах — перед сегодняшним, — поэтому строка
  // с ними идёт первой, а сами карточки появляются под ней только развёрнутыми
  const shownDays = pastOpen ? [...pastDays, ...restDays] : restDays;
  const dayDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // В ужатом виде карточка дня — только обзор: в ней не прочитать задачу
  // целиком и тем более не отредактировать. Разбор идёт списком под сеткой,
  // и он открыт всегда — по умолчанию на сегодняшнем дне
  const activeDay = selectedDay && weekDays.includes(selectedDay)
    ? selectedDay
    : (todayIndex >= 0 ? days[todayIndex].day : days[0]?.day);
  const activeDayEntry = days.find(entry => entry.day === activeDay) || null;
  const activeDayTasks = weekTasks[activeDay] || [];
  const pastLeft = pastDays.reduce(
    (count, { day }) => count + (weekTasks[day] || []).filter(task => !task.completed).length,
    0
  );

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setDayStamp(new Date().toDateString()), nextMidnight - now + 1000);
    return () => clearTimeout(timer);
  }, [dayStamp]);

  // Черновики и незакрытое редактирование относятся к прошлой неделе — сбрасываем при переходе
  useEffect(() => {
    setPastOpen(false);
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

  const openQuickAdd = () => {
    setQuickAddDate(new Date());
    setQuickAddTitle('');
    setQuickAddTime('');
    setQuickAddTimeOpen(false);
    setQuickEditId(null);
    setQuickAddOpen(true);
  };

  const handleQuickAdd = () => {
    if (!quickAddTitle.trim()) return;
    // Дата выбрана в календаре на любой месяц, поэтому неделя считается от
    // неё самой, а не от той, что сейчас открыта на экране
    addWeeklyTask(getWeekKey(getWeekStart(quickAddDate)), weekDays[(quickAddDate.getDay() + 6) % 7], quickAddTitle, quickAddTime);
    setQuickAddOpen(false);
  };

  const startQuickEdit = (task) => {
    setQuickEditId(task.id);
    setQuickEditText(task.title);
    setQuickEditTime(task.time || '');
  };

  const saveQuickEdit = () => {
    if (quickEditId && quickEditText.trim()) {
      editWeeklyTask(getWeekKey(getWeekStart(quickAddDate)), weekDays[(quickAddDate.getDay() + 6) % 7], quickEditId, quickEditText, quickEditTime);
    }
    setQuickEditId(null);
  };

  // Тот же трюк, что у правки в карточке дня: сохраняем, только когда фокус
  // ушёл со строки целиком, а не при переходе между полем времени и текстом
  const handleQuickEditBlur = (e) => {
    const row = e.currentTarget;
    setTimeout(() => {
      if (row.contains(document.activeElement)) return;
      saveQuickEdit();
    }, 0);
  };

  // Закрываем часы — забываем и время: иначе задача уедет со скрытым значением
  // Поле времени, которое только что открыли: его надо не просто показать, а
  // сразу раскрыть системный выбор времени. Иначе после нажатия на часы нужно
  // было ещё раз попасть пальцем в появившееся поле
  const openedTimeField = useRef(null);
  const timeFieldRefs = useRef({});
  const setTimeFieldEl = (day) => (el) => {
    if (el) timeFieldRefs.current[day] = el;
    else delete timeFieldRefs.current[day];
  };

  useEffect(() => {
    const day = openedTimeField.current;
    if (!day) return;
    openedTimeField.current = null;
    const el = timeFieldRefs.current[day];
    if (!el) return;
    el.focus();
    // showPicker есть не везде и вне жеста пользователя может быть запрещён —
    // тогда остаётся обычный фокус, и поле всё равно открыто
    try {
      el.showPicker?.();
    } catch {
      // браузер не дал — не беда
    }
  });

  const toggleTimeField = (day) => {
    setTimeOpen(prev => {
      const next = !prev[day];
      if (!next) setNewTimes(times => ({ ...times, [day]: '' }));
      else openedTimeField.current = day;
      return { ...prev, [day]: next };
    });
  };

  // «Сброс» в системном выборе времени обнуляет поле. Времени у задачи после
  // этого нет, и пустому прямоугольнику места тоже нет — убираем его вместе
  // со значением, остаются часы
  const handleNewTimeChange = (day, value) => {
    setNewTimes(times => ({ ...times, [day]: value }));
    if (!value) setTimeOpen(prev => ({ ...prev, [day]: false }));
  };

  const startEditing = (day, task) => {
    setEditingItem({ day, taskId: task.id });
    setEditingText(task.title);
    setEditingTime(task.time || '');
    // Время у задачи уже есть — показываем его; нет — показываем часы
    setEditTimeOpen(Boolean(task.time));
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
    setEditTimeOpen(false);
  };

  // Поле времени в строке правки появляется так же, как в строке добавления:
  // по нажатию на часы, сразу с фокусом и системным выбором времени, чтобы не
  // пришлось вторым касанием попадать в только что возникшее поле
  const editTimeRef = useRef(null);
  const openingEditTime = useRef(false);

  useEffect(() => {
    if (!openingEditTime.current) return;
    openingEditTime.current = false;
    const el = editTimeRef.current;
    if (!el) return;
    el.focus();
    try {
      el.showPicker?.();
    } catch {
      // браузер не дал — остаётся обычный фокус, поле всё равно открыто
    }
  });

  const openEditTimeField = () => {
    openingEditTime.current = true;
    setEditTimeOpen(true);
  };

  // Стереть время. Родное поле времени очистить нечем: у него нет ни крестика,
  // ни клавиши, и однажды проставленный час оставался бы навсегда. На телефоне
  // вместе со значением убираем и само поле — обратно к часам
  const clearEditTime = () => {
    setEditingTime('');
    if (isMobile) setEditTimeOpen(false);
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

  // Время в строке правки. На телефоне родное поле времени без значения — это
  // пустой серый прямоугольник: он занимает место в и без того тесной строке,
  // ничего не сообщает и читается как сломанный ввод. Вместо него часы, по
  // которым поле и появляется — тот же жест, что в строке «Add task...».
  // На десктопе поле видно всегда: там у него есть «--:--» и есть место
  const editTimeField = (inputClass, clearSize) => (
    isMobile && !editTimeOpen ? (
      <button
        /* Фокус не уводим нажатием: его тут же заберёт себе поле времени,
           а строка правки закрывается по уходу фокуса из неё целиком */
        onMouseDown={e => e.preventDefault()}
        onClick={openEditTimeField}
        title="Set time"
        aria-label="Set time"
        className={`p-1 rounded press-icon flex-shrink-0 ${mutedIcon}`}
      >
        <Clock size={15} />
      </button>
    ) : (
      <>
        <input
          type="time"
          ref={editTimeRef}
          value={editingTime}
          onChange={e => {
            setEditingTime(e.target.value);
            // «Сброс» в системном выборе времени — то же самое, что крестик
            if (!e.target.value && isMobile) setEditTimeOpen(false);
          }}
          title="Task time"
          aria-label="Task time"
          className={`px-1 py-0.5 rounded text-xs flex-shrink-0 ${inputClass} ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          }`}
        />
        {editingTime && (
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={clearEditTime}
            title="Clear time"
            aria-label="Clear time"
            className={`p-1 rounded press-icon flex-shrink-0 ${mutedIcon}`}
          >
            <X size={clearSize} />
          </button>
        )}
      </>
    )
  );

  const navButtonClass = `h-control w-control flex items-center justify-center rounded-lg border press ${
    darkMode
      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
  }`;

  // Добавить задачу — главное действие страницы, поэтому на телефоне кнопка
  // стоит в одной строке с заголовком, в правом верхнем углу: до него палец
  // дотягивается первым, и место под цитатой остаётся листанию недель.
  // На десктопе строка заголовка пустая и широкая, а кнопки страницы собраны
  // в одну группу — там она остаётся рядом со стрелками
  const addTaskButton = (
    <button
      onClick={openQuickAdd}
      title="Add task to any day"
      aria-label="Add task to any day"
      className={navButtonClass}
    >
      <AddIcon size={16} />
    </button>
  );

  // Листание недель — действия страницы, поэтому уезжают в шапку каркаса рядом
  // с заголовком. На телефоне они стоят там же, где и «плюс», — справа от него
  // в строке заголовка: это соседние по смыслу действия («какая неделя» и
  // «добавить»), и держать их в двух разных строках значило бежать глазами
  // через всю шапку. Освободившаяся строка под цитатой убрана совсем
  const weekNav = (
    <>
      {!isMobile && addTaskButton}

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

  // Фраза дня — не действие, а украшение, поэтому отдельной строкой над кнопками недели
  const quoteLine = (
    <div className="flex items-center gap-2 min-w-0">
      <p className={`text-body sm:text-base leading-relaxed ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <span className="italic">“{quote.text}”</span>
        <span className="ml-1.5">— {quote.source}</span>
      </p>
    </div>
  );

  // Что уже стоит на выбранный в календаре день — показываем в самом окне
  // добавления: не глядя в само Расписание, легко поставить задачу впритык
  // к уже существующей или продублировать её
  const quickAddWeekKey = getWeekKey(getWeekStart(quickAddDate));
  const quickAddDayName = weekDays[(quickAddDate.getDay() + 6) % 7];
  const quickAddDayTasks = weeklyTasks[quickAddWeekKey]?.[quickAddDayName] || [];

  return (
    <PageShell
      darkMode={darkMode}
      title="Schedule"
      titleActions={isMobile ? <>{addTaskButton}{weekNav}</> : null}
      actions={isMobile ? null : weekNav}
      subheader={quoteLine}
    >
      {/* Колонки задаёт выбранная раскладка (см. constants.js): одна неделя
          целиком или по дню за раз. Своего горизонтального отступа у сетки
          нет — его даёт PageShell, один на шапку и на тело. Раньше здесь были
          лишние 16px на телефоне, чтобы карточка дня совпала по ширине с
          задачей на борде, но из-за них карточки стояли левее заголовка и
          кнопок недели, и страница читалась как собранная из двух кусков */}
      <div className={`grid gap-4 w-full ${layoutGrid} ${compact ? 'schedule-compact' : ''}`}>
          {/* Гороскоп стоит первым, до понедельника: он про сегодня, а не про
              день недели, и читают его раньше, чем разбирают дела. Восьмой
              карточкой сетка складывается в ровные 4×2 на широком экране.
              Показываем всегда сегодняшний день, независимо от листания недель:
              гороскоп на прошлый понедельник ничего не значит */}
          {(() => {
            const sign = getSign(zodiacSign);
            const rising = risingSign ? getSign(risingSign) : null;
            const moon = moonSign ? getSign(moonSign) : null;
            return (
              <div
                data-card="day"
                /* Карточка целиком открывает разбор: отдельная кнопка «More»
                   занимала строку и была единственным, по чему здесь можно
                   нажать, — проще отдать под это всю плитку. role и обработчик
                   клавиш нужны, чтобы она осталась кнопкой и без мыши */
                role="button"
                tabIndex={0}
                onClick={() => setHoroscopeOpen(true)}
                onKeyDown={e => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  setHoroscopeOpen(true);
                }}
                aria-label="Open today's horoscope"
                className={`rounded-lg p-2.5 sm:p-4 flex flex-col h-auto sm:h-day-card min-h-0 min-w-0 border text-left cursor-pointer press ${
                  darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="mb-2 sm:mb-4 flex-shrink-0 flex items-baseline gap-2 min-w-0">
                  <span className={`text-base sm:text-lg font-semibold truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {sign.symbol} {sign.label}
                  </span>
                  <span className={`text-xs font-medium uppercase tracking-wide truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Today
                  </span>
                </div>

                {/* Три главные точки карты. Пишем ровно то, что посчитано: Луна
                    без времени рождения помечена «≈», асцендента без координат
                    нет вовсе */}
                <div className={`horoscope-points flex flex-wrap gap-x-3 gap-y-1 mb-3 flex-shrink-0 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span>☉ {sign.label}</span>
                  {moon && <span>☾ {moonExact ? '' : '≈'}{moon.label}</span>}
                  {rising && <span>ASC {rising.label}</span>}
                </div>

                {/* На карточке только сводка; разбор по пунктам не влезает и
                    уезжает на отдельный экран, как заметка */}
                <p className={`horoscope-summary flex-1 min-h-0 overflow-hidden text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {getHoroscopeForDate(sign.key, today, risingSign, moonSign)}
                </p>

              </div>
            );
          })()}
          {/* Прошедшие дни этой недели — одной строкой на всех: дата первого
              и последнего, сколько дел осталось несделанными, и разворот сразу
              всей пачки. Порознь они занимали по строке каждый */}
          {pastDays.length > 0 && (
            <button
              onClick={() => setPastOpen(prev => !prev)}
              aria-expanded={pastOpen}
              className={`rounded-lg px-2.5 py-2 flex items-center gap-2 min-w-0 border text-left press ${
                darkMode ? 'border-gray-800 bg-gray-800/40' : 'border-gray-200 bg-white/60'
              }`}
            >
              <span className={`text-sm font-semibold truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {pastDays.length === 1
                  ? dayDate(pastDays[0].date)
                  : `${dayDate(pastDays[0].date)} – ${dayDate(pastDays[pastDays.length - 1].date)}`}
              </span>
              <span className={`flex-1 min-w-0 text-xs font-medium uppercase tracking-wide truncate ${
                darkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
                Earlier
              </span>
              {pastLeft > 0 && (
                <span className={`text-xs flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {pastLeft} left
                </span>
              )}
              {pastOpen
                ? <ChevronUp size={14} className={`flex-shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                : <ChevronDown size={14} className={`flex-shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />}
            </button>
          )}

          {shownDays.map(({ day, date }) => {
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
                /* В ужатом виде карточка работает ещё и переключателем: по
                   ней выбирают, чей список раскрыт внизу. Нажатия на флажок,
                   крестик и «+» остаются своими — их не перехватываем */
                onClick={compact ? (e => {
                  if (e.target.closest('button, input, label')) return;
                  setSelectedDay(day);
                }) : undefined}
                /* Ровные карточки нужны сетке: в четыре колонки разнобой высот
                   выглядел бы рваным. На телефоне колонка одна, и фиксированные
                   315px превращались бы в пустоту под парой дел */
                data-card="day"
                className={`rounded-lg p-2.5 sm:p-4 flex flex-col h-auto sm:h-day-card min-h-0 min-w-0 border transition duration-150 ${
                  isToday
                    ? darkMode ? 'border-green-700 bg-green-950/40' : 'border-green-200 bg-green-50'
                    : darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white'
                } ${
                  dragOverDay === day && draggedTask?.day !== day ? 'ring-2 ring-green-600 scale-[1.01]' : ''
                } ${
                  compact && day === activeDay ? 'ring-2 ring-green-600' : ''
                }`}
              >
                {/* День недели и дата — одной строкой */}
                <div className="mb-2 sm:mb-4 flex-shrink-0 flex items-baseline gap-2 min-w-0">
                  <span className={`text-base sm:text-lg font-semibold truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`text-xs font-medium uppercase tracking-wide truncate ${
                    isToday
                      ? darkMode ? 'text-green-400' : 'text-green-700'
                      : darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {/* В ужатом виде полное название не встаёт рядом с датой —
                        три буквы читаются так же, а место остаётся тексту */}
                    {compact ? day.slice(0, 3) : day}
                  </span>

                </div>

                {/* Список с отметкой «ниже ещё столько-то»: карточка ровной
                    высоты, и без неё день на пять дел выглядел бы как день на
                    два — прокрутка внутри карточки почти не видна */}
                <ScrollMore
                  className="day-tasks space-y-0.5 sm:space-y-1 h-full overflow-y-auto"
                  hintClassName={darkMode
                    ? 'bg-gray-800 border-gray-600 text-gray-300'
                    : 'bg-white border-gray-300 text-gray-500'}
                >
                  {weekTasks[day]?.map((task, taskIndex) => {
                    const isEditingThis = !compact && editingItem?.day === day && editingItem?.taskId === task.id;
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
                      className={`day-task relative flex items-start gap-1.5 py-1 sm:py-1.5 min-w-0 group rounded transition duration-150 ${
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
                          {editTimeField('w-[5.5rem] sm:w-[70px]', 12)}
                          <input
                            type="text"
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
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
                          onClick={() => { if (isMobile && !compact) startEditing(day, task); }}
                          className={`day-task-text flex-1 min-w-0 text-sm break-words transition-colors duration-200 ${
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
                </ScrollMore>

                <div className={`day-add mt-2 sm:mt-3 flex items-center gap-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
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
                      ref={setTimeFieldEl(day)}
                      value={newTimes[day] || ''}
                      onChange={e => handleNewTimeChange(day, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTask(day);
                        if (e.key === 'Escape') toggleTimeField(day);
                      }}
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
                    /* Фокус из поля не уводим: без этого первое нажатие уходило
                       на закрытие клавиатуры. Поле теряло фокус, страница под
                       уехавшей клавиатурой перестраивалась, кнопка уезжала
                       из-под пальца — и click до неё уже не доходил. Задачу
                       добавляло только второе нажатие. Заодно клавиатура
                       остаётся поднятой, и следующую задачу можно набирать
                       сразу, не целясь в поле заново */
                    onMouseDown={e => e.preventDefault()}
                    /* В ужатом виде поля ввода на карточке нет — набрать текст
                       в колонке шириной в палец всё равно невозможно, поэтому
                       «+» открывает обычное окно добавления, сразу на этот день */
                    onClick={() => {
                      if (!compact) {
                        handleAddTask(day);
                        return;
                      }
                      setQuickAddDate(date);
                      setQuickAddOpen(true);
                    }}
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

      {/* Задачи выбранного дня — списком под сеткой. В ужатом виде карточка
          слишком мала, чтобы прочитать задачу целиком и тем более поправить
          её; здесь на то же самое есть вся ширина экрана. По умолчанию открыт
          сегодняшний день, нажатие на любую карточку переключает список */}
      {compact && activeDayEntry && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline gap-2">
            <span className={`text-base font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              {dayDate(activeDayEntry.date)}
            </span>
            <span className={`text-xs font-medium uppercase tracking-wide ${
              activeDayEntry.date && isSameDay(activeDayEntry.date, today)
                ? darkMode ? 'text-green-400' : 'text-green-700'
                : darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {activeDay}
            </span>
          </div>

          <div className={`rounded-lg border p-3 ${darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white'}`}>
            {activeDayTasks.length === 0 && (
              <p className={`text-sm py-1 ${mutedIcon}`}>Nothing planned yet</p>
            )}

            {activeDayTasks.map(task => {
              const isEditingThis = editingItem?.day === activeDay && editingItem?.taskId === task.id;
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-2 py-1.5 min-w-0 rounded ${
                    task.important
                      ? darkMode
                        ? 'bg-amber-400/10 border-l-[3px] border-amber-400 pl-1.5'
                        : 'bg-amber-50 border-l-[3px] border-amber-400 pl-1.5'
                      : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleWeeklyTask(weekKey, activeDay, task.id)}
                    className={`w-5 h-5 mt-0.5 cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
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
                      {editTimeField('w-[5.5rem]', 14)}
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
                      onClick={() => startEditing(activeDay, task)}
                      className={`flex-1 min-w-0 text-sm break-words cursor-text ${
                        task.important && !task.completed ? 'font-semibold' : ''
                      } ${
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

                  {/* Звёздочки нет на карточке — значит ставить важность можно
                      только отсюда, и прятать её здесь нельзя */}
                  <button
                    onClick={() => toggleWeeklyTaskImportant(weekKey, activeDay, task.id)}
                    title={task.important ? 'Not important' : 'Mark as important'}
                    aria-label={task.important ? 'Not important' : 'Mark as important'}
                    className={`p-1.5 rounded press-icon flex-shrink-0 ${
                      task.important ? 'text-amber-500' : mutedIcon
                    }`}
                  >
                    <Star size={15} fill={task.important ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => deleteWeeklyTask(weekKey, activeDay, task.id)}
                    title="Delete task"
                    aria-label="Delete task"
                    className={`p-1.5 rounded press-icon flex-shrink-0 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-red-100'}`}
                  >
                    <X size={15} className={darkMode ? 'text-red-400' : 'text-red-500'} />
                  </button>
                </div>
              );
            })}

            {/* Здесь поле ввода помещается — в отличие от карточки */}
            <div className={`mt-2 flex items-center gap-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => toggleTimeField(activeDay)}
                title={timeOpen[activeDay] ? 'Without time' : 'Set time'}
                aria-label={timeOpen[activeDay] ? 'Without time' : 'Set time'}
                aria-pressed={!!timeOpen[activeDay]}
                className={`p-1 flex-shrink-0 rounded press-icon ${
                  timeOpen[activeDay]
                    ? darkMode ? 'text-green-400' : 'text-green-700'
                    : mutedIcon
                }`}
              >
                <Clock size={16} />
              </button>

              {timeOpen[activeDay] && (
                <input
                  type="time"
                  ref={setTimeFieldEl(activeDay)}
                  value={newTimes[activeDay] || ''}
                  onChange={e => handleNewTimeChange(activeDay, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddTask(activeDay);
                    if (e.key === 'Escape') toggleTimeField(activeDay);
                  }}
                  aria-label="Task time"
                  className={`text-xs py-1 bg-transparent focus:outline-none flex-shrink-0 w-[62px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
                />
              )}

              <input
                type="text"
                value={newTasks[activeDay] || ''}
                onChange={e => setNewTasks({ ...newTasks, [activeDay]: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAddTask(activeDay)}
                placeholder="Add task..."
                className={`flex-1 min-w-0 text-sm py-1 bg-transparent focus:outline-none ${darkMode ? 'text-white placeholder-gray-500' : 'placeholder-gray-400'}`}
              />
              <button
                /* Фокус остаётся в поле — см. такую же кнопку в карточке дня */
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleAddTask(activeDay)}
                title="Add task"
                aria-label="Add task"
                className={`p-1 flex-shrink-0 press ${darkMode ? 'text-green-500 hover:text-green-400' : 'text-green-700 hover:text-green-800'}`}
              >
                <AddIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {horoscopeOpen && (() => {
        const sign = getSign(zodiacSign);
        const rising = risingSign ? getSign(risingSign) : null;
        const moon = moonSign ? getSign(moonSign) : null;
        const details = getHoroscopeDetails(sign.key, today, risingSign, moonSign);
        return (
          <Modal
            onClose={() => setHoroscopeOpen(false)}
            size="md"
            sheet
            /* Гороскоп — свой адрес, запись в истории у него уже есть */
            backCloses={false}
            panelClassName={`h-[100dvh] sm:h-auto overflow-hidden rounded-none sm:rounded-xl border-0 sm:border shadow-xl ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className={`flex items-center gap-2 p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setHoroscopeOpen(false)}
                title="Back"
                aria-label="Back"
                className={`p-2 -ml-2 rounded press-icon flex-shrink-0 ${mutedIcon}`}
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className={`flex-1 min-w-0 text-title truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {sign.symbol} {sign.label}
              </h2>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
              {/* Карта рождения: что где стоит. Чего не посчитали — того и не
                  пишем, вместо знака стоит, каких данных не хватает */}
              <div className={`rounded-lg border p-3 space-y-1.5 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                {[
                  ['Sun', `${sign.symbol} ${sign.label}`],
                  ['Moon', moon ? `${moon.symbol} ${moon.label}${moonExact ? '' : ' (approx.)'}` : 'needs a birth date'],
                  ['Rising', rising ? `${rising.symbol} ${rising.label}` : 'needs birth time and place']
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline gap-2">
                    <span className={`w-16 flex-shrink-0 text-xs uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {label}
                    </span>
                    <span className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div>
                <h3 className={`text-section uppercase mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Today for you
                </h3>
                <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {details.summary}
                </p>
              </div>

              {/* Разбор дня подряд: Луна по фазе, стихии, сферы жизни, время
                  дня и вечер. Всё собрано из тех же данных, что в карте выше */}
              {details.sections.map(section => (
                <div key={section.key}>
                  <h3 className={`text-section uppercase mb-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {section.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {section.text}
                  </p>
                </div>
              ))}

              {/* Прямо говорим, что здесь расчёт, а что — текст дня */}
              <p className={`text-xs pt-2 border-t ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                Sun, Moon and rising sign are calculated from your birth data; the Moon phase
                for today is the angle between the Moon and the Sun, not a calendar
                approximation. The readings below are built from all of it — sign, rising sign,
                phase and the sign the Moon is in today — but the wording is the app\'s own.{' '}
                {moon && !moonExact && ' Without a birth time the Moon is taken at noon, so it can be the next sign if you were born close to a change.'}
                Other planets, houses and aspects are not calculated.
              </p>
            </div>
          </Modal>
        );
      })()}

      {quickAddOpen && (
        <Modal
          onClose={() => setQuickAddOpen(false)}
          size="sm"
          sheet
          /* Тот же формат, что у редактора задачи в проектах: на телефоне
             окно во весь экран, на десктопе — диалог с шапкой и подвалом */
          panelClassName={`max-h-[100dvh] sm:max-h-[calc(100vh-3rem)] overflow-hidden rounded-none sm:rounded-lg border-0 sm:border shadow-xl ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className={`flex items-center gap-2 p-4 sm:p-6 sm:pb-4 flex-shrink-0 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <button
              onClick={() => setQuickAddOpen(false)}
              title="Back"
              aria-label="Back"
              className={`p-2 -ml-2 rounded press-icon flex-shrink-0 ${mutedIcon}`}
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className={`flex-1 min-w-0 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Add task</h2>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div>
              {/* Календарь на месяц, а не только на видимую неделю: задачу
                  можно поставить на любой день вперёд, не листая недели.
                  Подпись «Day» над ним лишняя — календарь и так понятен */}
              <MonthCalendar
                value={quickAddDate}
                onChange={date => { setQuickAddDate(date); setQuickEditId(null); }}
                darkMode={darkMode}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Task</label>
              <input
                type="text"
                value={quickAddTitle}
                onChange={e => setQuickAddTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                placeholder="What needs doing..."
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-green-500 font-normal ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Time</label>

              {!quickAddTimeOpen ? (
                <button
                  type="button"
                  onClick={() => setQuickAddTimeOpen(true)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border press ${
                    darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Clock size={14} />
                  Add a time
                </button>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={quickAddTimeRef}
                      type="time"
                      value={quickAddTime}
                      onChange={e => {
                        setQuickAddTime(e.target.value);
                        // «Сброс» в системном выборе — то же самое, что крестик рядом
                        if (!e.target.value) setQuickAddTimeOpen(false);
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                      className={`px-3 py-2 border rounded-lg focus:outline-none focus:border-green-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                      }`}
                    />
                    {/* Родное поле времени очистить нечем — на телефоне у него
                        нет ни крестика, ни клавиши, и однажды проставленный
                        час оставался бы навсегда без своей кнопки */}
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setQuickAddTime(''); setQuickAddTimeOpen(false); }}
                      title="Remove time"
                      aria-label="Remove time"
                      className={`p-1.5 rounded press-icon flex-shrink-0 ${mutedIcon}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Что уже стоит на этот день — прямо здесь можно поправить текст,
                время или удалить: не только для справки, чтобы не поставить
                задачу впритык к уже существующей или не продублировать её */}
            {quickAddDayTasks.length > 0 && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Already on this day
                </label>
                <div className={`space-y-1.5 rounded-lg border p-2.5 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  {quickAddDayTasks.map(task => {
                    const isEditing = quickEditId === task.id;
                    if (isEditing) {
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-1.5"
                          onBlur={handleQuickEditBlur}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveQuickEdit();
                            if (e.key === 'Escape') setQuickEditId(null);
                          }}
                        >
                          <input
                            type="time"
                            value={quickEditTime}
                            onChange={e => setQuickEditTime(e.target.value)}
                            className={`px-1.5 py-1 rounded text-xs flex-shrink-0 w-[5.5rem] ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                          />
                          <input
                            type="text"
                            value={quickEditText}
                            onChange={e => setQuickEditText(e.target.value)}
                            className={`flex-1 min-w-0 px-1.5 py-1 rounded text-sm ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={task.id} className="flex items-center gap-2 text-sm min-w-0 group">
                        {task.time && (
                          <span className={`font-mono text-xs flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {task.time}
                          </span>
                        )}
                        <span
                          onClick={() => startQuickEdit(task)}
                          className={`flex-1 min-w-0 truncate cursor-text ${
                            task.completed
                              ? darkMode ? 'text-gray-600 line-through' : 'text-gray-400 line-through'
                              : darkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}
                        >
                          {task.title}
                        </span>
                        <button
                          onClick={() => deleteWeeklyTask(getWeekKey(getWeekStart(quickAddDate)), weekDays[(quickAddDate.getDay() + 6) % 7], task.id)}
                          title="Delete task"
                          aria-label="Delete task"
                          className={`p-1 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 press-icon flex-shrink-0 ${mutedIcon}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={`flex items-center gap-3 p-4 sm:p-6 sm:pt-4 flex-shrink-0 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex-1" />
            <button
              onClick={handleQuickAdd}
              disabled={!quickAddTitle.trim()}
              className="min-w-[110px] px-6 py-2 border border-transparent bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed press"
            >
              Add task
            </button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}
