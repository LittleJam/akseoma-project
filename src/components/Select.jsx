import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

// Свой выпадающий список вместо системного: и поле, и раскрытый список рисуем сами,
// поэтому они выглядят одинаково во всех темах. Родного <select> здесь нет совсем
export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  darkMode = false,
  className = '',
  wrapperClassName = '',
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  ariaLabel
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const selected = options.find(option => option.value === value);
  // Длинные списки (например, родительская задача) ищем по подстроке
  const visibleOptions = searchable && query.trim()
    ? options.filter(option => String(option.label).toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const pick = (option) => {
    setOpen(false);
    setQuery('');
    // Отдаём событие в форме, привычной для onChange у select
    onChange?.({ target: { value: option.value } });
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }

    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(Math.max(0, options.findIndex(o => o.value === value)));
      return;
    }

    if (!open) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex(prev => {
        const next = prev + step;
        if (next < 0) return visibleOptions.length - 1;
        if (next >= visibleOptions.length) return 0;
        return next;
      });
      return;
    }

    if (e.key === 'Enter' && visibleOptions[activeIndex]) {
      e.preventDefault();
      pick(visibleOptions[activeIndex]);
    }
  };

  const surface = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const hoverRow = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const activeRow = darkMode ? 'bg-gray-700' : 'bg-gray-100';

  return (
    <div ref={rootRef} className={`relative ${wrapperClassName}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center gap-2 text-left disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      >
        <span className={`flex-1 min-w-0 truncate ${selected ? '' : 'opacity-60'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          aria-hidden
          className={`flex-shrink-0 opacity-55 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-30 top-full left-0 right-0 mt-1 rounded-lg border shadow-lg origin-top animate-pop-in ${surface}`}
        >
          {searchable && (
            <div className={`flex items-center gap-2 px-2.5 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Search size={13} className="flex-shrink-0 opacity-50" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="flex-1 min-w-0 text-sm bg-transparent focus:outline-none"
              />
            </div>
          )}

          <ul role="listbox" className="py-1 max-h-64 overflow-y-auto">
          {visibleOptions.length === 0 && (
            <li className="px-3 py-2 text-sm opacity-60">Nothing found</li>
          )}
          {visibleOptions.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value ?? `option-${index}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(option)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition ${hoverRow} ${
                    index === activeIndex ? activeRow : ''
                  }`}
                >
                  <span className="flex-1 min-w-0 truncate">{option.label}</span>
                  {isSelected && <Check size={13} className="flex-shrink-0 opacity-70" />}
                </button>
              </li>
            );
          })}
          </ul>
        </div>
      )}
    </div>
  );
}
