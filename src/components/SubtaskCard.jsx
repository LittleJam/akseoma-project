import React from 'react';
import { ArrowUpFromLine } from 'lucide-react';

export default function SubtaskCard({ subtask, index, parentDisplayId, onToggle, onPromote, darkMode }) {
  return (
    <div
      className={`ml-3 sm:ml-4 min-w-0 flex items-start gap-1.5 sm:gap-2 p-2 rounded-lg border group transition duration-150 ${
        darkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-gray-200'
      }`}
    >
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={onToggle}
        className={`w-4 h-4 sm:w-3.5 sm:h-3.5 mt-0.5 cursor-pointer flex-shrink-0 accent-green-700 transition active:scale-90 ${
          subtask.completed ? 'animate-check-pop' : ''
        }`}
      />

      <span className={`text-xs flex-1 min-w-0 break-words transition-colors duration-200 ${
        subtask.completed
          ? darkMode ? 'line-through text-gray-500' : 'line-through text-gray-400'
          : darkMode ? 'text-gray-300' : 'text-gray-600'
      }`}>
        {/* Номер идёт в одной строке с текстом — так подзадача не рвётся в узкой колонке */}
        <span className={`text-[10px] font-mono mr-1.5 whitespace-nowrap ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {parentDisplayId}.{index + 1}
        </span>
        {subtask.title}
      </span>

      {/* Поднять подзадачу до самостоятельной задачи в этой же колонке */}
      {onPromote && (
        <button
          onClick={onPromote}
          title="Make it a task"
          aria-label="Make it a task"
          className={`p-1.5 sm:p-0.5 rounded opacity-0 group-hover:opacity-100 press-icon flex-shrink-0 ${
            darkMode ? 'text-gray-500 hover:text-green-400' : 'text-gray-400 hover:text-green-700'
          }`}
        >
          <ArrowUpFromLine size={13} />
        </button>
      )}
    </div>
  );
}
