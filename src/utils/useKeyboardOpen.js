import { useEffect, useRef, useState } from 'react';

// Поднята ли сейчас экранная клавиатура.
//
// Спрашиваем у visualViewport: это единственное, что меняется на всех
// платформах одинаково. Раскладочная область (window.innerHeight) от
// клавиатуры меняться не обязана — в index.html стоит
// interactive-widget=overlays-content, — а видимая область уменьшается
// всегда, потому что клавиатура ложится поверх страницы.
//
// Сравниваем не с текущей раскладочной высотой, а с последней, какой она была
// без клавиатуры: если WebKit всё-таки ужал веб-вью, innerHeight уменьшится
// вместе с видимой областью, и разница между ними снова окажется нулевой.
// Пока в фокусе ничего нет, эта опора обновляется сама — заодно переживает
// поворот экрана.
//
// Порог, а не точное равенство: видимую область подъедают и адресная строка
// браузера, и панель подсказок над клавиатурой. Клавиатура занимает заметно
// больше, промахнуться нечем
const KEYBOARD_MIN = 160;

const isTyping = () => {
  const el = document.activeElement;
  if (!el) return false;
  return el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName);
};

export default function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  const baseHeight = useRef(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const check = () => {
      if (!isTyping()) baseHeight.current = window.innerHeight;
      else baseHeight.current = Math.max(baseHeight.current, window.innerHeight);
      setOpen(baseHeight.current - vv.height > KEYBOARD_MIN);
    };

    check();
    vv.addEventListener('resize', check);
    // Клавиатура умеет не менять высоту, а сдвигать видимую область вверх
    vv.addEventListener('scroll', check);
    window.addEventListener('focusin', check);
    window.addEventListener('focusout', check);
    return () => {
      vv.removeEventListener('resize', check);
      vv.removeEventListener('scroll', check);
      window.removeEventListener('focusin', check);
      window.removeEventListener('focusout', check);
    };
  }, []);

  return open;
}
