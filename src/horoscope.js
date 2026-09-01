// Гороскоп дня для карточки в расписании.
//
// Текст собирается здесь, а не приходит из интернета. Причины две: приложение
// живёт на статическом хостинге и умеет работать офлайн — запрос к чужому
// сервису сломал бы и то, и другое, — и ни один бесплатный гороскопный API не
// обещает ни доступности, ни того, что завтра не потребует ключ.
// Поэтому это генератор: текст складывается из трёх частей и жёстко привязан к
// паре «знак + дата», так что за день не меняется и у разных знаков разный.
export const ZODIAC = [
  { key: 'aries',       label: 'Aries',       symbol: '♈', from: [3, 21],  to: [4, 19] },
  { key: 'taurus',      label: 'Taurus',      symbol: '♉', from: [4, 20],  to: [5, 20] },
  { key: 'gemini',      label: 'Gemini',      symbol: '♊', from: [5, 21],  to: [6, 20] },
  { key: 'cancer',      label: 'Cancer',      symbol: '♋', from: [6, 21],  to: [7, 22] },
  { key: 'leo',         label: 'Leo',         symbol: '♌', from: [7, 23],  to: [8, 22] },
  { key: 'virgo',       label: 'Virgo',       symbol: '♍', from: [8, 23],  to: [9, 22] },
  { key: 'libra',       label: 'Libra',       symbol: '♎', from: [9, 23],  to: [10, 22] },
  { key: 'scorpio',     label: 'Scorpio',     symbol: '♏', from: [10, 23], to: [11, 21] },
  { key: 'sagittarius', label: 'Sagittarius', symbol: '♐', from: [11, 22], to: [12, 21] },
  { key: 'capricorn',   label: 'Capricorn',   symbol: '♑', from: [12, 22], to: [1, 19] },
  { key: 'aquarius',    label: 'Aquarius',    symbol: '♒', from: [1, 20],  to: [2, 18] },
  { key: 'pisces',      label: 'Pisces',      symbol: '♓', from: [2, 19],  to: [3, 20] }
];

export const DEFAULT_SIGN = 'taurus';

export const getSign = key => ZODIAC.find(s => s.key === key) || ZODIAC.find(s => s.key === DEFAULT_SIGN);

// Солнечный знак по дате рождения. Полноценная натальная карта — это асцендент,
// дома и положения планет, для них нужны эфемериды и время с местом рождения;
// без них считать нечего, и выдавать выдуманное за расчёт нечестно. Знак по дате
// — то, что действительно вычисляется, и именно он определяет гороскоп дня.
export const signFromBirthDate = (value) => {
  if (!value) return null;
  const [, month, day] = value.split('-').map(Number);
  if (!month || !day) return null;
  const found = ZODIAC.find(({ from, to }) => (
    from[0] === to[0]
      ? day >= from[1] && day <= to[1]
      // Козерог переходит через Новый год, поэтому у него две половины
      : (month === from[0] && day >= from[1]) || (month === to[0] && day <= to[1])
  ));
  return found ? found.key : null;
};

// ── Асцендент ──────────────────────────────────────────────────────────────
// Из натальной карты здесь считается ровно то, что можно посчитать без таблиц
// эфемерид: солнечный знак по дате и восходящий знак (асцендент) по дате,
// времени и координатам. Положения Луны и планет, дома и аспекты требуют
// эфемерид — их тут нет, и рисовать их «примерно» значило бы выдавать выдумку
// за расчёт. Формулы стандартные: юлианская дата → звёздное время → асцендент.

const RAD = Math.PI / 180;

const julianDay = (year, month, day, hoursUT) => {
  let y = year;
  let m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5 + hoursUT / 24;
};

// Среднее звёздное время в Гринвиче, градусы
const gmstDegrees = (jd) => {
  const t = (jd - 2451545) / 36525;
  const theta = 280.46061837 + 360.98564736629 * (jd - 2451545)
    + 0.000387933 * t * t - (t * t * t) / 38710000;
  return ((theta % 360) + 360) % 360;
};

const obliquity = (jd) => 23.439291 - 0.0130042 * ((jd - 2451545) / 36525);

// Долгота точки эклиптики, восходящей над горизонтом
const ascendantLongitude = (lstDeg, latDeg, eps) => {
  const ramc = lstDeg * RAD;
  const e = eps * RAD;
  const phi = latDeg * RAD;
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(e) + Math.tan(phi) * Math.sin(e))
  ) / RAD;
  return ((asc % 360) + 360) % 360;
};

// Знак по долготе на эклиптике: 0° — начало Овна, дальше по 30°
const signFromLongitude = (lon) => ZODIAC[Math.floor((((lon % 360) + 360) % 360) / 30)].key;

// Смещение часового пояса на конкретную дату — по названию зоны из геокодера.
// Intl знает историю переводов часов, поэтому Минск 5 мая 1990 даёт +3, а не +2,
// который получился бы по долготе: тогда действовало летнее время СССР.
// Именно час ошибки сдвигает асцендент примерно на ползнака
export const offsetForZone = (zone, birthDate, birthTime = '12:00') => {
  if (!zone || !birthDate) return null;
  try {
    const [y, m, d] = birthDate.split('-').map(Number);
    const [hh, mm] = birthTime.split(':').map(Number);
    const probe = new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0));
    const name = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
      .formatToParts(probe).find(part => part.type === 'timeZoneName')?.value;
    const found = /GMT([+-])(\d{2}):(\d{2})/.exec(name || '');
    if (!found) return null;
    return (found[1] === '-' ? -1 : 1) * (Number(found[2]) + Number(found[3]) / 60);
  } catch {
    return null;
  }
};

// Часовой пояс по долготе — грубая прикидка на случай, когда зоны нет.
// Настоящий пояс определяется границами государств и переводом часов, поэтому
// значение только предлагается, а поправить его может только сам человек
export const guessUtcOffset = (longitude) => {
  const lon = Number(longitude);
  return Number.isFinite(lon) ? Math.round(lon / 15) : 0;
};

// Восходящий знак. null, если данных не хватает: без времени и координат
// асцендент не определён вовсе — он меняется примерно раз в два часа и зависит
// от широты
export const getAscendantSign = ({ birthDate, birthTime, latitude, longitude, utcOffset } = {}) => {
  if (!birthDate || !birthTime) return null;
  const lat = toCoord(latitude);
  const lon = toCoord(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 89) return null;   // на полюсах асцендент вырождается

  const [year, month, day] = birthDate.split('-').map(Number);
  const [hh, mm] = birthTime.split(':').map(Number);
  if (!year || !month || !day || !Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  const offset = Number.isFinite(toCoord(utcOffset)) ? toCoord(utcOffset) : 0;
  const hoursUT = hh + mm / 60 - offset;
  const jd = julianDay(year, month, day, hoursUT);
  const lst = ((gmstDegrees(jd) + lon) % 360 + 360) % 360;
  return signFromLongitude(ascendantLongitude(lst, lat, obliquity(jd)));
};

// ── Солнце и Луна ──────────────────────────────────────────────────────────
// Долготы считаются по коротким рядам (Пол Шлютер, «Computing planetary
// positions»): Солнце с точностью около 0.02°, Луна около 0.03° после учёта
// основных возмущений. Знак занимает 30°, так что этого хватает с большим
// запасом, и таблицы эфемерид не нужны.
//
// d — дни от эпохи 2000 Jan 0.0 TDT.
const daysFromEpoch = (jd) => jd - 2451543.5;

const sin = deg => Math.sin(deg * RAD);
const cos = deg => Math.cos(deg * RAD);
const norm = deg => ((deg % 360) + 360) % 360;

// Эклиптическая долгота Солнца
const sunLongitude = (d) => {
  const w = 282.9404 + 4.70935e-5 * d;      // долгота перигелия
  const e = 0.016709 - 1.151e-9 * d;        // эксцентриситет
  const M = norm(356.0470 + 0.9856002585 * d);
  const E = M + e * (180 / Math.PI) * sin(M) * (1 + e * cos(M));
  const xv = cos(E) - e;
  const yv = Math.sqrt(1 - e * e) * sin(E);
  return norm(Math.atan2(yv, xv) / RAD + w);
};

// Эклиптическая долгота Луны. Ряд возмущений короткий, но без него ошибка
// доходит до нескольких градусов — этого уже хватает, чтобы промахнуться знаком
const moonLongitude = (d) => {
  const N = 125.1228 - 0.0529538083 * d;    // долгота восходящего узла
  const i = 5.1454;
  const w = 318.0634 + 0.1643573223 * d;    // аргумент перигея
  const e = 0.054900;
  const M = norm(115.3654 + 13.0649929509 * d);

  let E = M + e * (180 / Math.PI) * sin(M) * (1 + e * cos(M));
  for (let k = 0; k < 3; k += 1) {
    E = E - (E - e * (180 / Math.PI) * sin(E) - M) / (1 - e * cos(E));
  }

  const xv = Math.cos(E * RAD) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E * RAD);
  const v = Math.atan2(yv, xv) / RAD;
  const lonecl = norm(N + Math.atan2(
    Math.sin((N + v + w - N) * RAD) * Math.cos(i * RAD),
    Math.cos((v + w) * RAD)
  ) / RAD);

  // Возмущения: эвекция, вариация, годичное уравнение и далее по убыванию
  const Ls = norm(282.9404 + 4.70935e-5 * d + 356.0470 + 0.9856002585 * d);
  const Lm = norm(N + w + M);
  const Ms = norm(356.0470 + 0.9856002585 * d);
  const D = norm(Lm - Ls);
  const F = norm(Lm - N);

  const corr =
    -1.274 * sin(M - 2 * D)
    + 0.658 * sin(2 * D)
    - 0.186 * sin(Ms)
    - 0.059 * sin(2 * M - 2 * D)
    - 0.057 * sin(M - 2 * D + Ms)
    + 0.053 * sin(M + 2 * D)
    + 0.046 * sin(2 * D - Ms)
    + 0.041 * sin(M - Ms)
    - 0.035 * sin(D)
    - 0.031 * sin(M + Ms)
    - 0.015 * sin(2 * F - 2 * D)
    + 0.011 * sin(M - 4 * D);

  return norm(lonecl + corr);
};

// Пустое поле — это отсутствие координаты, а не ноль. Number('') равно нулю, и
// без этой проверки очищенная широта давала бы асцендент для точки 0°,0°
// в Атлантике — то есть уверенный, но неверный ответ вместо честного «нет данных»
const toCoord = (value) => {
  const text = String(value ?? '').trim();
  return text === '' ? NaN : Number(text);
};

// Три главные точки карты. Солнце и Луна считаются от даты и времени, асцендент
// требует ещё и координат. Без времени Луну считаем на полдень: за сутки она
// проходит около 13°, поэтому у рождённых близко к смене знака она может
// оказаться в соседнем — об этом сказано на экране разбора.
export const getNatalChart = (zodiac = {}) => {
  const { birthDate, birthTime, latitude, longitude, utcOffset } = zodiac;
  if (!birthDate) return { sun: null, moon: null, rising: null, moonExact: false };

  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return { sun: null, moon: null, rising: null, moonExact: false };

  const hasTime = !!birthTime;
  const [hh, mm] = hasTime ? birthTime.split(':').map(Number) : [12, 0];
  const offset = Number.isFinite(toCoord(utcOffset)) ? toCoord(utcOffset) : 0;
  const jd = julianDay(year, month, day, (hh || 0) + (mm || 0) / 60 - (hasTime ? offset : 0));
  const d = daysFromEpoch(jd);

  return {
    sun: signFromLongitude(sunLongitude(d)),
    moon: signFromLongitude(moonLongitude(d)),
    moonExact: hasTime,
    rising: getAscendantSign(zodiac)
  };
};

const OPENINGS = [
  'The day starts quietly and rewards those who do not rush it.',
  'Energy runs high this morning — spend it before it spends you.',
  'A slow start today is not a lost one.',
  'Something you postponed comes back around, and it is smaller than you remember.',
  'The mood is steady, and steadiness is exactly what today asks for.',
  'You will notice more than usual today; that noticing is the point.',
  'Plans made today hold better than plans made yesterday.',
  'An ordinary day, and ordinary days are where most things actually get built.',
  'You have more room to manoeuvre than the calendar suggests.',
  'Momentum is on your side, provided you pick one direction.',
  'The first hour sets the tone — protect it.',
  'Not everything needs deciding today, and that is a relief.'
];

const FOCUS = [
  'Work goes best in one long stretch rather than many short ones.',
  'A conversation you have been avoiding turns out to be easy.',
  'Money and small logistics want attention before anything creative.',
  'Someone close needs a plain answer, not a careful one.',
  'The task you like least is the one that unblocks the rest.',
  'Details matter more than usual — read the thing twice.',
  'Rest counts as progress today; the body keeps the schedule.',
  'A small tidy-up clears far more than it costs.',
  'Say yes to one thing and no to two.',
  'Your attention is the scarce resource, not your time.',
  'What looks like a setback is a change of route.',
  'Finishing beats starting today.'
];

const CLOSINGS = [
  'By evening, keep something for yourself.',
  'Do not sign anything you have not slept on.',
  'Let the last hour be slow.',
  'A short walk settles what thinking will not.',
  'Write down what worked — you will want it next week.',
  'Good day to close a tab, literally or otherwise.',
  'Leave a little undone; tomorrow will want a running start.',
  'Ask once more before assuming.',
  'The evening is better company than the afternoon.',
  'Small kindness lands well tonight.',
  'Trust the plainest explanation.',
  'Sleep early if the day allows it.'
];

// День считаем в UTC — иначе перевод часов сдвинул бы гороскоп на сутки.
// Тот же приём, что у фразы дня в quotes.js
const dayNumber = (date) =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);

// Перемешивание битов. Брать остаток прямо от номера дня нельзя: seed вида
// «день × число знаков» делится на длину пула нацело, день сокращается, и текст
// не меняется вообще никогда — ровно это и случилось в первой версии.
const mix = (n) => {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 15), 2246822507);
  x = Math.imul(x ^ (x >>> 13), 3266489909);
  return (x ^ (x >>> 16)) >>> 0;
};

// Восходящий знак входит в текст: иначе поля времени и места рождения были бы
// украшением — заполнил, а читаешь то же самое
const horoscopeSeed = (signKey, date, risingKey, moonKey) => {
  const index = Math.max(0, ZODIAC.findIndex(s => s.key === signKey));
  const rising = risingKey ? ZODIAC.findIndex(s => s.key === risingKey) + 1 : 0;
  const moon = moonKey ? ZODIAC.findIndex(s => s.key === moonKey) + 1 : 0;
  return ((dayNumber(date) * ZODIAC.length + index) * 13 + rising) * 13 + moon;
};

export const getHoroscopeForDate = (signKey, date = new Date(), risingKey = null, moonKey = null) => {
  const seed = horoscopeSeed(signKey, date, risingKey, moonKey);
  // Соль у каждой части своя, иначе все три двигались бы вместе и текст выглядел
  // бы одним и тем же, только переставленным
  const pick = (pool, salt) => pool[mix(seed * 1024 + salt) % pool.length];
  return [pick(OPENINGS, 1), pick(FOCUS, 2), pick(CLOSINGS, 3)].join(' ');
};

// Разделы подробного разбора. Каждый — своя колода, чтобы «работа» и «деньги»
// не выдавали одну и ту же мысль разными словами
const AREAS = [
  {
    key: 'work',
    title: 'Work',
    lines: [
      'One task carries the day; the rest can wait until it is done.',
      'Progress comes from finishing, not from starting something new.',
      'Interruptions cluster in the middle of the day — plan the hard part early.',
      'A second pair of eyes saves more time than it costs.',
      'What looks like a blocker is a missing decision, not a missing skill.',
      'Slow and correct beats fast and re-done today.',
      'Write the plan down; it will be shorter than it feels.',
      'Delegating one thing frees the whole afternoon.'
    ]
  },
  {
    key: 'money',
    title: 'Money',
    lines: [
      'Small recurring costs deserve a look — they add up quietly.',
      'A purchase you have been circling can wait one more week.',
      'Check the numbers before agreeing to them.',
      'Not a day for a big commitment; a day for tidying the ledger.',
      'Something owed to you is worth one polite reminder.',
      'Value the hour you spend, not just the sum you save.',
      'A plain budget beats a clever one right now.',
      'Spend on what removes friction, not on what adds novelty.'
    ]
  },
  {
    key: 'people',
    title: 'People',
    lines: [
      'Say the plain version; the careful one will be misread.',
      'Someone is waiting for you to go first.',
      'A short message today prevents a long conversation later.',
      'Listen past the first sentence — the point comes second.',
      'Good day to make peace over something small.',
      'Do not read tone into brevity; people are busy, not cold.',
      'Ask instead of assuming, once.',
      'One honest no protects two future yeses.'
    ]
  },
  {
    key: 'energy',
    title: 'Energy',
    lines: [
      'The body sets the pace today — do not argue with it.',
      'A walk does more for your head than another hour at the desk.',
      'Sleep is the cheapest fix available.',
      'Energy peaks early; use it on what matters.',
      'Eat properly before the afternoon, not after it.',
      'Stretch the shoulders; that is where the day is sitting.',
      'An early evening pays for tomorrow morning.',
      'Do one thing at a time and the tiredness halves.'
    ]
  }
];

// Подробный разбор: сводка плюс четыре основных пункта. Всё то же семя, поэтому
// за день не меняется, у разных знаков и асцендентов разное
export const getHoroscopeDetails = (signKey, date = new Date(), risingKey = null, moonKey = null) => ({
  summary: getHoroscopeForDate(signKey, date, risingKey, moonKey),
  areas: AREAS.map((area, i) => ({
    key: area.key,
    title: area.title,
    text: area.lines[mix(horoscopeSeed(signKey, date, risingKey, moonKey) * 1024 + 17 + i) % area.lines.length]
  }))
});
