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

export const getHoroscopeForDate = (signKey, date = new Date()) => {
  const index = Math.max(0, ZODIAC.findIndex(s => s.key === signKey));
  const seed = dayNumber(date) * ZODIAC.length + index;
  // Соль у каждой части своя, иначе все три двигались бы вместе и текст выглядел
  // бы одним и тем же, только переставленным
  const pick = (pool, salt) => pool[mix(seed * 1024 + salt) % pool.length];
  return [pick(OPENINGS, 1), pick(FOCUS, 2), pick(CLOSINGS, 3)].join(' ');
};
