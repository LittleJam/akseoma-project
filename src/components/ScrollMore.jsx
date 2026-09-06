import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Список, который честно говорит, что в него влезло не всё.
//
// Карточка дня в расписании имеет ровную высоту — этого требует сетка, иначе
// в четыре колонки дни выглядели бы рваными. Дела, которые не поместились,
// прокручиваются внутри карточки, но полоса прокрутки на светлом фоне почти не
// видна, и день на пять дел выглядел так же, как день на два.
//
// Поэтому считаем, сколько строк оказалось ниже видимой части, и показываем это
// числом. Считаем по разметке, а не по предполагаемой высоте строки: строки
// разной высоты — у задачи может быть время, перенос, полоса важного.
export default function ScrollMore({ className = '', hintClassName = '', children }) {
  const listRef = useRef(null);
  const [hidden, setHidden] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      // Нижняя граница видимого. Пиксель запаса — чтобы строка, упирающаяся
      // в край ровно, не считалась спрятанной из-за дробных высот
      const limit = list.scrollTop + list.clientHeight + 1;
      let count = 0;
      for (const row of list.children) {
        if (row.offsetTop + row.offsetHeight > limit) count += 1;
      }
      setHidden(count);
    };

    measure();

    // Меняется и размер карточки, и состав списка, и текст внутри строки
    const resize = new ResizeObserver(measure);
    resize.observe(list);
    const mutate = new MutationObserver(measure);
    mutate.observe(list, { childList: true, subtree: true, characterData: true });
    list.addEventListener('scroll', measure, { passive: true });

    return () => {
      resize.disconnect();
      mutate.disconnect();
      list.removeEventListener('scroll', measure);
    };
  }, []);

  const scrollOn = () => {
    const list = listRef.current;
    if (list) list.scrollBy({ top: list.clientHeight * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div ref={listRef} className={className}>{children}</div>

      {hidden > 0 && (
        <button
          onClick={scrollOn}
          title={`${hidden} more below`}
          aria-label={`${hidden} more below`}
          /* Кнопка лежит поверх последней строки, поэтому фон у неё свой:
             сквозь прозрачную читались бы две строки разом */
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[10px] leading-none press ${hintClassName}`}
        >
          +{hidden}
          <ChevronDown size={11} />
        </button>
      )}
    </div>
  );
}
