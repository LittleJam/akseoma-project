import React, { useEffect, useMemo, useRef } from 'react';

const BURST_SIZE = 8;

// Оформление тем поверх страницы: статичный декор (волна, лента факультетов)
// и короткий отклик на клик. Фон намеренно неподвижен — ничего не летает и не мерцает
export default function ThemeFx({ theme }) {
  const layerRef = useRef(null);
  const active = theme === 'wizard' || theme === 'surf';

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
    <div ref={layerRef} aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
      {theme === 'wizard' && <span className="fx-house-band" />}

      {theme === 'surf' && (
        <>
          <span className="fx-sunglare" />
          {/* Прибой у нижней кромки: три слоя, ближний с пенным гребнем */}
          <span className="fx-wave fx-wave-back" />
          <span className="fx-wave fx-wave-mid" />
          <span className="fx-wave fx-wave-front" />
        </>
      )}
    </div>
  );
}
