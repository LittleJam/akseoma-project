import { scrollCaretIntoView, scrollVertically } from './caretScroll';

// Подвести поле, в котором стоит курсор, в видимую часть экрана.
//
// Веб-вью ужимается под клавиатуру (плагин Keyboard, resize: native), но
// прокручивать внутренние контейнеры за нас никто не будет: WebKit сам ведёт
// курсор к клавиатуре только в тот момент, когда поле получает фокус, и
// только если считает его скрытым. Поля, оказавшегося под клавиатурой уже
// после того, как область сжалась, это не касается — а именно так и выглядит
// набор в нижней строке длинного списка.
//
// Поэтому один общий обработчик на всё приложение: он срабатывает и на фокус,
// и на изменение видимой области, и работает с любым полем — от строки
// «Add task...» до заметки, — а не только там, где про него вспомнили.
const MARGIN = 24;

const isField = (el) =>
  Boolean(el) && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));

// Ближайший предок, который действительно прокручивается. Спрашиваем у
// стилей, а не ищем по классу: вёрстка каркаса не обязана оставаться прежней
const scrollableAncestor = (el) => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
};

const reveal = () => {
  const el = document.activeElement;
  if (!isField(el)) return;

  const scroller = scrollableAncestor(el);
  if (!scroller) return;

  // У редактируемого текста важен не прямоугольник всего блока, а сам курсор:
  // в длинной заметке строка может быть выше экрана целиком. Этим уже занят
  // caretScroll — второй раз то же самое не пишем
  if (el.isContentEditable) {
    scrollCaretIntoView(scroller, { smooth: true });
    return;
  }

  const box = scroller.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  // Низ видимого — край контейнера или край видимой области, смотря что выше:
  // окно под клавиатуру может и не ужиматься, и тогда его низ уходит под неё
  const vv = window.visualViewport;
  const visibleBottom = Math.min(box.bottom, vv ? vv.offsetTop + vv.height : window.innerHeight);

  const below = rect.bottom - (visibleBottom - MARGIN);
  if (below > 0) {
    scrollVertically(scroller, below, true);
    return;
  }

  const above = (box.top + MARGIN) - rect.top;
  if (above > 0) scrollVertically(scroller, -above, true);
};

// Клавиатура выезжает с анимацией, и область сжимается не сразу: один заход
// сразу (вдруг прокручивать уже есть что) и повторный, когда всё улеглось.
// Второй заход ждёт чуть дольше самой прокрутки: он должен мерить готовую
// картинку, а не догонять едущий контейнер и целиться по дороге
let settleTimer = null;
const revealSoon = () => {
  requestAnimationFrame(reveal);
  clearTimeout(settleTimer);
  settleTimer = setTimeout(reveal, 450);
};

document.addEventListener('focusin', revealSoon);

// Область изменилась, пока в поле стоит курсор: клавиатура появилась, сменилась
// на другую (эмодзи выше буквенной) или экран повернули
const onViewportChange = () => {
  if (isField(document.activeElement)) revealSoon();
};

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', onViewportChange);
} else {
  window.addEventListener('resize', onViewportChange);
}
