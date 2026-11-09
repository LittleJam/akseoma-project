import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward } from 'lucide-react';
import PageShell from './PageShell';
import LungsIcon from './LungsIcon';

const DURATION = 15 * 60;

// Плейлист чилла — настоящие треки в public/audio, зациклены на всю сессию.
// Раньше здесь пробовали скрытый YouTube-плеер и сгенерированный эмбиент —
// оба были обходом отсутствия своих файлов. Обычный <audio> надёжнее того
// и другого: тот же элемент, что и .play() из клика, без чужих iframe
// и без нюансов автовоспроизведения WKWebView
// Путь строим от BASE_URL: на Pages сайт живёт в подпапке репозитория, и
// корневой '/audio/…' там (и на локальном dev-сервере) отдавал 404
const TRACKS = [
  { label: 'Lonely Simon', src: `${import.meta.env.BASE_URL}audio/lonely-simon.mp3` },
  { label: 'The Flow Night', src: `${import.meta.env.BASE_URL}audio/the-flow-night.mp3` }
];

// Фазы дыхания по кругу, по четыре секунды на каждую: вдох слева, задержка
// сверху, выдох справа и снова задержка снизу. start — секунда, на которой
// фаза начинается; из неё же считаются задержки подсветки слова и счёта,
// поэтому подписи, счёт и лёгкие идут одним циклом и не расходятся
const PHASES = [
  { side: 'left', word: 'inhale', start: 0 },
  { side: 'top', word: 'hold', start: 4 },
  { side: 'right', word: 'exhale', start: 8 },
  // Круг идёт по часовой, и низ читается справа налево: там счёт стоит задом
  // наперёд, «4 3 2 hold», чтобы фаза начиналась с той стороны, откуда пришла
  { side: 'bottom', word: 'hold', start: 12, mirrored: true }
];
const CYCLE = 16;
const COUNTS = [2, 3, 4];

const MUSIC_KEY = 'jira-chill-music';
const today = () => new Date().toDateString();
const VOLUME = 0.7;
const FADE_MS = 500;

export default function ChillTimer({ darkMode, theme }) {
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  // Какой трек играть, решаем ещё до первого рендера: если прошлый сеанс дослушали
  // до конца или с тех пор наступил новый день — сдвигаемся на следующий
  const [trackIndex, setTrackIndex] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MUSIC_KEY) || 'null');
      if (!saved || typeof saved.index !== 'number') return 0;
      const shift = saved.completed || saved.day !== today() ? 1 : 0;
      return (saved.index + shift) % TRACKS.length;
    } catch (error) {
      console.error('Chill music state error:', error);
      return 0;
    }
  });
  // Сеанс дослушан до нуля — следующий запуск должен звучать иначе
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [dayStamp, setDayStamp] = useState(today);

  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const fadeRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        MUSIC_KEY,
        JSON.stringify({ index: trackIndex, day: dayStamp, completed: sessionCompleted })
      );
    } catch (error) {
      console.error('Chill music state error:', error);
    }
  }, [trackIndex, sessionCompleted, dayStamp]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setRunning(false);
            setSessionCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Плавно тянем громкость к цели и, если она в итоге нулевая, ставим на паузу —
  // без щелчка на старте/стопе и без немого зависания в фоне на все 15 минут
  const fadeTo = (target, onDone) => {
    const audio = audioRef.current;
    if (!audio) return;
    clearInterval(fadeRef.current);
    const steps = 12;
    const stepMs = FADE_MS / steps;
    const start = audio.volume;
    const delta = (target - start) / steps;
    let i = 0;
    fadeRef.current = setInterval(() => {
      i += 1;
      audio.volume = Math.max(0, Math.min(1, start + delta * i));
      if (i >= steps) {
        clearInterval(fadeRef.current);
        audio.volume = target;
        onDone?.();
      }
    }, stepMs);
  };

  const play = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0;
    // play() — прямой вызов внутри обработчика клика, а не эффекта: это тот
    // самый жест пользователя, который WKWebView и требует для автовоспроизведения
    audio.play().catch(error => console.error('Chill audio play error:', error));
    fadeTo(VOLUME);
  };

  const pause = () => {
    fadeTo(0, () => audioRef.current?.pause());
  };

  useEffect(() => () => clearInterval(fadeRef.current), []);

  const nextTrack = () => {
    setTrackIndex(prev => {
      const next = (prev + 1) % TRACKS.length;
      const audio = audioRef.current;
      if (audio) {
        const wasPlaying = running && musicOn;
        audio.src = TRACKS[next].src;
        audio.load();
        if (wasPlaying) play();
      }
      return next;
    });
  };

  const toggleTimer = () => {
    if (!running) {
      // Сначала трек, потом play(): nextTrack меняет audio.src синхронно
      // (обновление стейта откладывается, а сам вызов — нет), и запускать
      // воспроизведение нужно уже после того, как источник встал на место
      const now = today();
      if (sessionCompleted || dayStamp !== now) {
        nextTrack();
        setSessionCompleted(false);
        setDayStamp(now);
      }
      if (musicOn) play();
      if (secondsLeft === 0) setSecondsLeft(DURATION);
    } else {
      pause();
    }
    setRunning(prev => !prev);
  };

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    if (!running) return;
    if (next) play(); else pause();
  };

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <PageShell darkMode={darkMode} variant="focus">
      {/* Квадрат дыхания: по сторонам фазы со счётом, внутри таймер, лёгкие и
          кнопки. Пока таймер стоит — это плакат; пошёл таймер — дышат лёгкие и
          загорается счёт. Всё движение в CSS: секунды фаз не гоняют перерисовку */}
      <div className={`chill-square flex-col gap-3 sm:gap-6 px-4 ${darkMode ? 'is-dark' : ''} ${running ? 'is-running' : ''}`}>
        {/* Стороны квадрата — фазы дыхания со счётом на четыре. Пока таймер
            идёт, разгорается название текущей фазы, а за ним по секунде
            загораются 2, 3 и 4: отрицательная задержка сдвигает общий
            шестнадцатисекундный цикл на нужную секунду. Считает CSS —
            перерисовывать подписи каждую секунду не приходится */}
        <div className="chill-phases" aria-hidden="true">
          {PHASES.map(({ side, word, start, mirrored }) => {
            // Слово и счёт — четыре доли фазы подряд; на нижней стороне тот же
            // ряд читается справа налево, поэтому его разворачиваем целиком.
            // Задержка подсветки привязана к самой доле, а не к её месту в
            // строке, поэтому огонёк идёт по ходу круга в обе стороны
            const name = (
              <b key="word" style={{ animationDelay: `${start - CYCLE}s` }}>{word}</b>
            );
            const counts = COUNTS.map((count, index) => (
              <i key={count} style={{ animationDelay: `${start + index + 1 - CYCLE}s` }}>
                {count}
              </i>
            ));
            const parts = mirrored ? [...counts.reverse(), name] : [name, ...counts];

            return (
              <span key={side} className={`chill-phase chill-phase-${side}`}>
                {parts.map((part, index) => (
                  <React.Fragment key={part.key}>
                    {/* Многоточие тянется от счёта к счёту. Рядом со словом
                        фазы его нет — там просто пробел, с какой бы стороны
                        слово ни стояло */}
                    {index > 0 && (
                      <span className="chill-lead">
                        {part.key === 'word' || parts[index - 1].key === 'word' ? ' ' : '… '}
                      </span>
                    )}
                    {part}
                  </React.Fragment>
                ))}
              </span>
            );
          })}
        </div>
        {/* Размер цифр считается от стороны квадрата — см. .chill-time */}
        <div className={`chill-time leading-none font-mono font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {minutes}:{seconds}
        </div>

        {/* Лёгкие под цифрами — вся анимация квадрата: набирают на вдохе,
            держат, отпускают на выдохе. Пока таймер стоит, стоят и они */}
        <LungsIcon className="chill-lungs" aria-hidden="true" />

        {/* Старт крупнее и выше, музыка — второстепенное, поэтому мельче и под ним */}
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <button
            onClick={toggleTimer}
            className={`p-4 sm:p-5 bg-green-800 text-white rounded-full hover:bg-green-900 flex items-center justify-center press ${
              running ? 'animate-pulse-ring' : ''
            }`}
            aria-label={running ? 'Stop' : 'Start'}
          >
            {running ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleMusic}
              title={musicOn ? 'Turn music off' : 'Turn music on'}
              aria-label={musicOn ? 'Turn music off' : 'Turn music on'}
              className={`p-2.5 rounded-full border press ${
                darkMode
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {musicOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <button
              onClick={nextTrack}
              title="Next track"
              aria-label="Next track"
              className={`p-2.5 rounded-full border press ${
                darkMode
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <SkipForward size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Сам плеер — вне экрана целиком: звук без интерфейса, не просто без
          видео. preload="none" — файл начинает грузиться только тогда, когда
          его действительно запускают, а не при заходе на вкладку */}
      <audio ref={audioRef} src={TRACKS[trackIndex].src} loop preload="none" className="hidden" />
    </PageShell>
  );
}
