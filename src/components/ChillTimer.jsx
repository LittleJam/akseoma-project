import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward } from 'lucide-react';
import PageShell from './PageShell';
import LungsIcon from './LungsIcon';

const DURATION = 15 * 60;

// Плейлист чилла. Один сеанс — один трек; следующий сеанс звучит уже по-другому,
// чтобы 15 минут подряд не превращались в один и тот же день сурка
const TRACKS = [
  { id: '9kzE8isXlQY', label: 'Lo-fi 1' },
  { id: 'JdqL89ZZwFw', label: 'Lo-fi 2' },
  { id: 'HRCfnvxpYP8', label: 'Lo-fi 3' }
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

export default function ChillTimer({ darkMode, theme }) {
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [musicReady, setMusicReady] = useState(false);

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
  const playerRef = useRef(null);
  const playerMountRef = useRef(null);
  // Первый трек плеер получает при создании — повторно грузить его не нужно
  const loadedTrackRef = useRef(trackIndex);

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

  // Плеер создаётся заранее и стоит на паузе, чтобы playVideo() успевал попасть в жест пользователя
  useEffect(() => {
    let cancelled = false;

    const createPlayer = () => {
      if (cancelled || playerRef.current || !playerMountRef.current) return;
      const startId = TRACKS[loadedTrackRef.current].id;
      playerRef.current = new window.YT.Player(playerMountRef.current, {
        videoId: startId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          loop: 1,
          playlist: startId
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setMusicReady(true);
          },
          // Ролики в плейлисте разной длины, поэтому зацикливаем вручную:
          // штатный loop работает только для одного и того же видео
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState?.ENDED) {
              try {
                playerRef.current?.seekTo(0);
                playerRef.current?.playVideo();
              } catch (error) {
                console.error('YouTube loop error:', error);
              }
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      // Не перетираем чужой колбэк, а дописываемся к нему
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousCallback === 'function') previousCallback();
        createPlayer();
      };

      if (!document.getElementById('youtube-iframe-api')) {
        const script = document.createElement('script');
        script.id = 'youtube-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch (error) {
        console.error('YouTube player destroy error:', error);
      }
      playerRef.current = null;
    };
  }, []);

  // Смена трека: на ходу подменяем видео, на паузе — только заряжаем его в плеер
  useEffect(() => {
    if (!musicReady || !playerRef.current || loadedTrackRef.current === trackIndex) return;
    loadedTrackRef.current = trackIndex;
    try {
      if (running && musicOn) {
        playerRef.current.loadVideoById(TRACKS[trackIndex].id);
      } else {
        playerRef.current.cueVideoById(TRACKS[trackIndex].id);
      }
    } catch (error) {
      console.error('YouTube track change error:', error);
    }
  }, [trackIndex, musicReady, running, musicOn]);

  // Музыка идёт только пока идёт таймер и музыка не выключена
  useEffect(() => {
    if (!musicReady || !playerRef.current) return;
    try {
      if (running && musicOn) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error('YouTube playback error:', error);
    }
  }, [running, musicOn, musicReady]);

  const nextTrack = () => setTrackIndex(prev => (prev + 1) % TRACKS.length);

  const toggleTimer = () => {
    if (!running) {
      // Новый сеанс после дослушанного или в новый день начинается с новой мелодии
      const now = today();
      if (sessionCompleted || dayStamp !== now) {
        nextTrack();
        setSessionCompleted(false);
        setDayStamp(now);
      }
      if (secondsLeft === 0) setSecondsLeft(DURATION);
    }
    setRunning(prev => !prev);
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
                        {part.key === 'word' || parts[index - 1].key === 'word' ? '\u00a0' : '…\u00a0'}
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
              onClick={() => setMusicOn(prev => !prev)}
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

      {/* Скрытый YouTube-плеер: звук без видео */}
      <div className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none -z-10" aria-hidden="true">
        <div ref={playerMountRef} />
      </div>
    </PageShell>
  );
}
