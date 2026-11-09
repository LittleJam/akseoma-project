// Показать курсор над клавиатурой. Само по себе это не делает никто: WebKit
// прокручивает ближайшего прокручиваемого предка сам, но только когда считает
// курсор скрытым, — а при interactive-widget=overlays-content (см. index.html)
// раскладочная область от клавиатуры не меняется, и скрытым он его не считает

// Прямоугольник курсора. У схлопнутого выделения нулевая ширина — это
// нормально, а вот в только что созданной пустой строке WebKit отдаёт совсем
// пустой прямоугольник. Тогда берём саму строку: курсор всё равно внутри неё
const caretRect = () => {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    // Сначала последний из прямоугольников выделения: у схлопнутого он один,
    // а у растянутого через перенос строки нужен именно нижний
    const rects = range.getClientRects();
    const last = rects.length > 0 ? rects[rects.length - 1] : null;
    if (last && last.height > 0) return last;
    const rect = range.getBoundingClientRect();
    if (rect && rect.height > 0) return rect;
  }
  // Проверено замером на устройстве: в пустой строке в конце заметки оба
  // способа выше дают нули. Строка здесь — отдельный contentEditable, так
  // что её собственный прямоугольник и есть прямоугольник курсора
  const active = document.activeElement;
  if (!active || !active.getBoundingClientRect) return null;
  const rect = active.getBoundingClientRect();
  return rect.height > 0 ? rect : null;
};

// Прокручиваем именно переданный контейнер, а не через scrollIntoView: тот
// пошёл бы вверх по предкам и утащил бы заодно подложку и документ — ровно
// то, от чего написаны оговорки в Modal.jsx. Запись в scrollTop одного
// известного элемента наружу выйти не может.
// margin — насколько курсор должен отстоять от края: строка вплотную к
// клавиатуре читается плохо, а следующую уже не видно вовсе
// smooth — только для разовых скачков: появилась клавиатура, сменился экран.
// На наборе плавность противопоказана: там подводка идёт на каждое нажатие,
// сдвиги крошечные, и анимация просто не успевала бы за курсором
export const scrollCaretIntoView = (scroller, { margin = 28, smooth = false } = {}) => {
  if (!scroller) return;
  // Курсор не в этом контейнере — прокручивать нечего
  if (!scroller.contains(document.activeElement)) return;
  const rect = caretRect();
  if (!rect) return;

  // Нижний край — не край контейнера, а край видимой области: карточка окна
  // под клавиатуру не ужимается (см. Modal.jsx), клавиатура ложится поверх
  // неё, и низ контейнера оказывается под ней. visualViewport знает, докуда
  // видно на самом деле; offsetTop учитывает сдвиг, если iOS его сделал.
  //
  // Только вниз и только когда курсор реально ушёл за этот край. Вверх не
  // прокручиваем никогда: подтягивать курсор из-под клавиатуры — единственное,
  // что здесь нужно, а любая ошибка в измерении прямоугольника вверх означала
  // бы промотку заметки к самому началу
  const box = scroller.getBoundingClientRect();
  const vv = window.visualViewport;
  const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const below = rect.bottom - (Math.min(box.bottom, visibleBottom) - margin);
  if (below > 0) scrollVertically(scroller, below, smooth);
};

// Сдвиг контейнера на delta пикселей. Плавно — только когда об этом просят и
// когда система не просила убрать движение: «уменьшить движение» в настройках
// телефона касается и прокрутки тоже
export const scrollVertically = (scroller, delta, smooth) => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (!smooth || reduced) {
    scroller.scrollTop += delta;
    return;
  }
  scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: 'smooth' });
};
