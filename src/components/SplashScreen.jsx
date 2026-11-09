import React from 'react';

// Экран загрузки, пока состояние читается из хранилища/облака. Тёмная вода и
// светлая кромка пены — тот же вид сверху, что на океанской волне. Два слоя:
// дальняя рябь по всей воде (медленно, тускло) и передняя кромка пены поверх
// неё (быстрее, покачивается по вертикали) — движение и глубина, а не плоский
// вырез, едущий вбок. Оба — бесшовные плитки, сдвиг фона вместо анимации
// самого пути, поэтому шва между повторами не видно
export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <span className="splash-ripples" />
      <span className="splash-wave-front" />
      <span className="splash-mark">Surf the Task</span>
    </div>
  );
}
