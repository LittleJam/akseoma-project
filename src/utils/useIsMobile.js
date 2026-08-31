import { useEffect, useState } from 'react';

// Граница мобильной раскладки. Совпадает с брейкпоинтом sm из tailwind.config.js:
// одни и те же экраны должны переключаться и в CSS, и здесь, иначе на 639px
// получится каша из половины десктопной вёрстки и половины мобильной.
//
// Хук нужен там, где раскладки не просто по-разному оформлены, а состоят из
// разных элементов: на телефоне борд показывает одну колонку из пяти, а окна
// разворачиваются на весь экран. Прятать вторую раскладку классом sm:hidden
// в таких местах нельзя — она всё равно смонтируется и будет жить своей жизнью.
const MOBILE_QUERY = '(max-width: 639px)';

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(query.matches);
    // Между первой отрисовкой и подпиской экран мог повернуться
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}
