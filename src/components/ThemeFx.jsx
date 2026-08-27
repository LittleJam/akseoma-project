import React, { useEffect, useMemo, useRef } from 'react';

const BURST_SIZE = 8;

// Оформление тем поверх страницы: статичный декор (волна, лента факультетов)
// и короткий отклик на клик. Фон намеренно неподвижен — ничего не летает и не мерцает
export default function ThemeFx({ theme }) {
  const layerRef = useRef(null);
  const active = theme === 'wizard' || theme === 'surf' || theme === 'millenial';

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

      if (theme === 'millenial') return;

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
          <>
            <span className="fx-sunglare" />
            {/* Волна Индийского океана: тело вала, загибающийся гребень и пена */}
            <svg className="fx-ocean" viewBox="0 0 1440 560" preserveAspectRatio="xMidYMax slice" aria-hidden>
              <defs>
                <linearGradient id="oceanDeep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1aa3ab" />
                  <stop offset="0.5" stopColor="#0d7a95" />
                  <stop offset="1" stopColor="#063f5c" />
                </linearGradient>
                <linearGradient id="oceanFace" x1="0.85" y1="0" x2="0.2" y2="1">
                  <stop offset="0" stopColor="#8ff2e0" />
                  <stop offset="0.4" stopColor="#2ec0bd" />
                  <stop offset="1" stopColor="#0a6d8c" />
                </linearGradient>
                <linearGradient id="oceanSwell" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#a5ece0" stopOpacity="0.7" />
                  <stop offset="1" stopColor="#20a8ad" stopOpacity="0.85" />
                </linearGradient>
              </defs>

              {/* дальний вал */}
              <path
                d="M0 404C260 374 520 424 780 408c220-14 420-50 660-58v206H0z"
                fill="url(#oceanSwell)"
              />

              {/* тело воды */}
              <path
                d="M0 470c200-18 420 0 640 16 260 19 520 14 800 0v74H0z"
                fill="url(#oceanDeep)"
              />

              {/* лицо волны, поднимающееся справа */}
              <path
                d="M1440 116c-152 0-264 82-354 204-70 94-160 152-272 182h626z"
                fill="url(#oceanFace)"
              />

              {/* полутень внутри бочки */}
              <path
                d="M1330 178c-96 22-176 92-232 176 78-48 152-100 214-152 26-22 34-24 18-24z"
                fill="#07566f"
                fillOpacity="0.28"
              />

              {/* загибающийся гребень */}
              <path
                d="M1440 112c-114-10-216 34-288 118-42 48-84 86-136 110 74-2 146-40 204-98 56-56 128-88 220-80z"
                fill="#ffffff"
                fillOpacity="0.92"
              />

              {/* пена в основании обрушения */}
              <path
                d="M760 512c150-26 258-80 336-166-14 92-102 158-206 186-56 15-102 8-130-20z"
                fill="#ffffff"
                fillOpacity="0.6"
              />

              {/* брызги над гребнем */}
              <g fill="#ffffff" fillOpacity="0.65">
                <circle cx="1300" cy="96" r="5" />
                <circle cx="1356" cy="74" r="3.5" />
                <circle cx="1244" cy="126" r="3" />
                <circle cx="1392" cy="112" r="4" />
                <circle cx="1180" cy="176" r="2.6" />
                <circle cx="1120" cy="236" r="2.2" />
              </g>

              {/* барашки на ближней воде */}
              <g stroke="#ffffff" strokeOpacity="0.5" strokeWidth="4" fill="none" strokeLinecap="round">
                <path d="M120 486c56-14 104 6 156-6" />
                <path d="M360 470c50-12 92 8 140-4" />
                <path d="M600 476c48-14 88 6 134-8" />
              </g>
            </svg>
            <span className="fx-foam" />
          </>
        )}

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
