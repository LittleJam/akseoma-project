import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Раздел настроек, который сворачивается. Крупные закрыты по умолчанию: одни
// колонки проекта занимали почти экран, и до сброса данных внизу страницы
// приходилось долго листать мимо того, что открывают раз в полгода.
// Заголовок виден всегда — по нему и находят нужное.
export default function SettingsSection({ title, darkMode, borderClass, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-lg border ${borderClass}`}>
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-6 press"
      >
        <h3 className={`flex items-center gap-2 text-section uppercase text-left ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {title}
        </h3>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`}
        />
      </button>

      {open && <div className="px-4 sm:px-6 pb-4 sm:pb-6">{children}</div>}
    </div>
  );
}
