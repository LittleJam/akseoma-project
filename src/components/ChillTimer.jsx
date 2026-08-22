import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const DURATION = 15 * 60;
// Фоновый лоу-фай трек для чилла (YouTube IFrame API — реальный play/pause, а не перемонтирование iframe)
const MUSIC_VIDEO_ID = '9kzE8isXlQY';

export default function ChillTimer({ darkMode }) {
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [musicReady, setMusicReady] = useState(false);
  const intervalRef = useRef(null);
  const playerRef = useRef(null);
  const playerMountRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setRunning(false);
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
      playerRef.current = new window.YT.Player(playerMountRef.current, {
        videoId: MUSIC_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          loop: 1,
          playlist: MUSIC_VIDEO_ID
        },
        events: {
          onReady: () => {
            if (!cancelled) setMusicReady(true);
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

  const toggleTimer = () => {
    if (secondsLeft === 0) setSecondsLeft(DURATION);
    setRunning(prev => !prev);
  };

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className={`flex-1 flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-col items-center gap-6 sm:gap-8 px-4">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>🌿 Chill</h2>
        <div className={`text-5xl sm:text-7xl md:text-[9rem] leading-none font-mono font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
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
        </div>

        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {musicOn ? (running ? 'Lo-fi playing' : 'Lo-fi starts with the timer') : 'Music off'}
        </p>
      </div>

      {/* Скрытый YouTube-плеер: звук без видео */}
      <div className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none -z-10" aria-hidden="true">
        <div ref={playerMountRef} />
      </div>
    </div>
  );
}
