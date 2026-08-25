import React from 'react';

export default function SubtaskCard({ subtask, index, parentDisplayId, onToggle, darkMode }) {
  return (
    <div
      className={`ml-4 flex items-center gap-2 p-2 rounded-lg border transition duration-150 ${
        darkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-gray-200'
      }`}
    >
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={onToggle}
        className={`w-4 h-4 sm:w-3.5 sm:h-3.5 cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
          subtask.completed ? 'animate-check-pop' : ''
        }`}
      />
      <span className={`text-[10px] font-mono flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {parentDisplayId}.{index + 1}
      </span>
      <span className={`text-xs flex-1 break-words transition-colors duration-200 ${
        subtask.completed
          ? darkMode ? 'line-through text-gray-500' : 'line-through text-gray-400'
          : darkMode ? 'text-gray-300' : 'text-gray-600'
      }`}>
        {subtask.title}
      </span>
    </div>
  );
}
