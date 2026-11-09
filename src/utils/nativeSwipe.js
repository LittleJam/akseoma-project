// Живая анимация свайпа назад от края экрана на iOS. Сам жест распознаётся
// нативно (MainViewController.swift, UIScreenEdgePanGestureRecognizer) —
// оттуда во время движения пальца сюда прилетает прогресс через
// evaluateJavaScript, и текущее окно сдвигается вслед за пальцем в реальном
// времени, открывая то, что было под ним. Досвайпали дальше половины (или
// резко) — окно закрывается взаправду; отпустили раньше — едет обратно
// на место
//
// Модалка сама помечает себя data-swipe-panel (см. Modal.jsx). Если открыто
// несколько слоёв разом (просмотрщик картинки поверх заметки), двигаем
// верхний — он последний в DOM
const getTopPanel = () => {
  const panels = document.querySelectorAll('[data-swipe-panel]');
  return panels.length ? panels[panels.length - 1] : null;
};

window.__edgeSwipeProgress = (progress) => {
  const panel = getTopPanel();
  if (!panel) return;
  panel.style.transition = 'none';
  panel.style.transform = `translateX(${Math.max(0, Math.min(1, progress)) * 100}%)`;
};

window.__edgeSwipeCommit = () => {
  const panel = getTopPanel();
  if (panel) {
    panel.style.transition = '';
    panel.style.transform = '';
  }
  window.history.back();
};

window.__edgeSwipeCancel = () => {
  const panel = getTopPanel();
  if (!panel) return;
  panel.style.transition = 'transform .2s cubic-bezier(.16,1,.3,1)';
  panel.style.transform = 'translateX(0)';
  const clear = () => {
    panel.style.transition = '';
    panel.style.transform = '';
    panel.removeEventListener('transitionend', clear);
  };
  panel.addEventListener('transitionend', clear);
};
