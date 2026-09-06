import React, { useEffect, useMemo, useRef } from 'react';

const BURST_SIZE = 8;

// Оформление тем поверх страницы: статичный декор (волна, лента факультетов)
// и короткий отклик на клик. Фон намеренно неподвижен — ничего не летает и не мерцает
export default function ThemeFx({ theme }) {
  const layerRef = useRef(null);
  const active = theme === 'wizard' || theme === 'surf' || theme === 'millenial' || theme === 'handwriting';

  const reducedMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    []
  );

  useEffect(() => {
    if (!active || reducedMotion) return;

    // Клик рассыпает искры (Wizard) или расходится кругом по воде (Surf)
    const handleClick = (e) => {
      const layer = layerRef.current;
      if (!layer) return;

      if (theme === 'millenial' || theme === 'handwriting') return;

      if (theme === 'surf') {
        const ripple = document.createElement('span');
        ripple.className = 'fx-ripple';
        ripple.style.left = `${e.clientX}px`;
        ripple.style.top = `${e.clientY}px`;
        ripple.addEventListener('animationend', () => ripple.remove());
        layer.appendChild(ripple);
        return;
      }

      for (let i = 0; i < BURST_SIZE; i += 1) {
        const spark = document.createElement('span');
        const angle = (Math.PI * 2 * i) / BURST_SIZE + Math.random() * 0.4;
        const distance = 26 + Math.random() * 34;
        spark.className = 'fx-spark';
        spark.style.left = `${e.clientX}px`;
        spark.style.top = `${e.clientY}px`;
        spark.style.setProperty('--fx-dx', `${Math.cos(angle) * distance}px`);
        spark.style.setProperty('--fx-dy', `${Math.sin(angle) * distance}px`);
        spark.addEventListener('animationend', () => spark.remove());
        layer.appendChild(spark);
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      if (layerRef.current) layerRef.current.innerHTML = '';
    };
  }, [active, theme, reducedMotion]);

  if (!active) return null;

  return (
    <>
      {/* Фон уходит за содержимое: -z-10 держит слои позади карточек и текста */}
      <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {theme === 'surf' && (
          /* Один спокойный вал: два мягких слоя и тонкая линия гребня */
          <svg className="fx-ocean" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden>
            <path
              d="M0 158c220-46 430-46 640-6 214 40 424 44 800-14v182H0z"
              fill="#0f8fa3"
              fillOpacity="0.07"
            />
            <path
              d="M0 214c250-44 470-30 700 10 210 36 420 30 740-26v122H0z"
              fill="#0f8fa3"
              fillOpacity="0.12"
            />
            <path
              d="M0 214c250-44 470-30 700 10 210 36 420 30 740-26"
              stroke="#ffffff"
              strokeOpacity="0.7"
              strokeWidth="2"
              fill="none"
            />
            {/* Полоса песка у самой кромки: вода приходит на берег, а не
                обрывается краем экрана. Тон тёплый — единственное тёплое
                пятно в теме, и потому его хватает, чтобы читался пляж */}
            <path
              d="M0 272c260-26 520-14 760 8 200 18 420 18 680-12v52H0z"
              fill="#e6d5b8"
              fillOpacity="0.5"
            />
          </svg>
        )}

        {theme === 'handwriting' && <span className="fx-paper" />}

        {theme === 'millenial' && (
          <>
            {/* Зелёные холмы под синим небом — привет обоям Bliss */}
            <span className="fx-bliss" />
            <span className="fx-cloud" style={{ left: '12%', top: '14%', width: '190px', height: '58px' }} />
            <span className="fx-cloud" style={{ left: '38%', top: '9%', width: '130px', height: '42px' }} />
            <span className="fx-cloud" style={{ left: '68%', top: '18%', width: '220px', height: '64px' }} />
          </>
        )}
      </div>

      {/* Поверх содержимого — только лента факультетов и отклик на клик */}
      <div ref={layerRef} aria-hidden className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        {theme === 'wizard' && <span className="fx-house-band" />}
      </div>
    </>
  );
}
