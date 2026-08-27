import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipForward } from 'lucide-react';
import { CHILL_BADGE } from '../themes';

const DURATION = 15 * 60;

// Плейлист чилла. Один сеанс — один трек; следующий сеанс звучит уже по-другому,
// чтобы 15 минут подряд не превращались в один и тот же день сурка
const TRACKS = [
  { id: '9kzE8isXlQY', label: 'Lo-fi 1' },
  { id: 'JdqL89ZZwFw', label: 'Lo-fi 2' },
  { id: 'K0Vo1mkllMI', label: 'Lo-fi 3' },
  { id: 'HRCfnvxpYP8', label: 'Lo-fi 4' }
];

const MUSIC_KEY = 'jira-chill-music';
const today = () => new Date().toDateString();

export default function ChillTimer({ darkMode, theme }) {
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [musicReady, setMusicReady] = useState(false);
  const [trackTitle, setTrackTitle] = useState('');

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

    const readTitle = () => {
      try {
        const title = playerRef.current?.getVideoData?.().title;
        if (title && !cancelled) setTrackTitle(title);
      } catch (error) {
        console.error('YouTube title error:', error);
      }
    };

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
            readTitle();
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
            readTitle();
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
    setTrackTitle('');
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
  const trackName = trackTitle || TRACKS[trackIndex].label;

  return (
    <div className={`flex-1 flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-col items-center gap-6 sm:gap-8 px-4">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{CHILL_BADGE[theme] || CHILL_BADGE.light} Chill</h2>
        {/* Размер цифр тянется за шириной экрана, поэтому таймер не вылезает ни на одном */}
        <div className={`text-[clamp(2.75rem,13vw,9rem)] leading-none font-mono font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {minutes}:{seconds}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTimer}
            className={`p-5 bg-green-800 text-white rounded-full hover:bg-green-900 flex items-center justify-center press ${
              running ? 'animate-pulse-ring' : ''
            }`}
            aria-label={running ? 'Stop' : 'Start'}
          >
            {running ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            onClick={() => setMusicOn(prev => !prev)}
            title={musicOn ? 'Turn music off' : 'Turn music on'}
            aria-label={musicOn ? 'Turn music off' : 'Turn music on'}
            className={`p-3 rounded-full border press ${
              darkMode
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {musicOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            onClick={nextTrack}
            title="Next track"
            aria-label="Next track"
            className={`p-3 rounded-full border press ${
              darkMode
                ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {musicOn ? (running ? 'Lo-fi playing' : 'Lo-fi starts with the timer') : 'Music off'}
          </p>
          <p
            className={`text-xs max-w-[260px] sm:max-w-sm truncate ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}
            title={trackName}
          >
            {trackIndex + 1}/{TRACKS.length} · {trackName}
          </p>
        </div>
      </div>

      {/* Скрытый YouTube-плеер: звук без видео */}
      <div className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none -z-10" aria-hidden="true">
        <div ref={playerMountRef} />
      </div>
    </div>
  );
}
