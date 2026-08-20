import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

const DURATION = 15 * 60;

export default function ChillTimer({ darkMode }) {
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

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

  const toggleTimer = () => {
    if (secondsLeft === 0) setSecondsLeft(DURATION);
    setRunning(prev => !prev);
  };

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className={`flex-1 flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex flex-col items-center gap-8">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>🌿 Chill</h2>
        <div className={`text-[9rem] leading-none font-mono font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {minutes}:{seconds}
        </div>
        <button
          onClick={toggleTimer}
          className="p-5 bg-green-800 text-white rounded-full hover:bg-green-900 flex items-center justify-center"
          aria-label={running ? 'Стоп' : 'Старт'}
        >
          {running ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>
    </div>
  );
}
