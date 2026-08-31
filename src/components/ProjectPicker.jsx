import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';

// Выбор проекта для телефона. На десктопе эту работу делает список в сайдбаре,
// но там его нет, и без переключателя борд оказался бы заперт в одном проекте.
//
// Кнопкой служит сам заголовок страницы: отдельной строки под переключатель на
// телефоне не найти, а название проекта в шапке и так уже стоит.
export default function ProjectPicker({ darkMode, projects, currentProject, onSelect, onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const rootRef = useRef(null);

  // Закрытие по касанию мимо списка. pointerdown, а не click: по клику список
  // успевал бы закрыться раньше, чем сработает выбор внутри него
  useEffect(() => {
    if (!open) return;
    const closeOnOutside = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  const current = projects.find(p => p.id === currentProject);

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name);
    setName('');
    setOpen(false);
  };

  const panelBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const rowText = darkMode ? 'text-gray-200' : 'text-gray-700';
  const inputBg = darkMode
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 placeholder-gray-400';

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 min-w-0 max-w-full press"
      >
        <span className="truncate">{current?.name || 'Projects'}</span>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-30 top-full mt-2 left-0 w-64 max-w-[80vw] p-2 rounded-lg border shadow-lg origin-top-left animate-pop-in ${panelBg}`}
        >
          <div className="max-h-64 overflow-y-auto" role="listbox">
            {projects.map(project => {
              const active = project.id === currentProject;
              return (
                <button
                  key={project.id}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelect(project.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded text-sm text-left press ${
                    active
                      ? darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
                      : rowText
                  }`}
                >
                  <span className="flex-1 min-w-0 truncate">{project.name}</span>
                  {active && <Check size={14} className="flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Новый проект здесь же: иначе завести его с телефона было бы негде */}
          <div className={`flex gap-2 mt-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submit();
                if (e.key === 'Escape') { setName(''); setOpen(false); }
              }}
              placeholder="New project..."
              aria-label="New project name"
              className={`flex-1 min-w-0 px-2 py-2 text-sm border rounded focus:outline-none focus:border-green-500 ${inputBg}`}
            />
            <button
              onClick={submit}
              aria-label="Create project"
              className="px-3 bg-green-800 text-white rounded hover:bg-green-900 press"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
