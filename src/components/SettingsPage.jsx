import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, LogOut, ShieldCheck, Heart } from 'lucide-react';
import { COLUMN_COLORS } from '../constants';
import { THEME_OPTIONS } from '../themes';
import { FEATURES, DEFAULT_FLAGS } from '../auth';
import Select from './Select';
import SettingsSection from './SettingsSection';
import { ZODIAC, getSign, DEFAULT_SIGN, guessUtcOffset } from '../horoscope';
import PageShell from './PageShell';

export default function SettingsPage({
  darkMode,
  theme,
  setTheme,
  user,
  allowed = () => true,
  featureFlags = DEFAULT_FLAGS,
  setFeatureFlags,
  projectLikes = {},
  setProjectLikes,
  zodiac = { sign: DEFAULT_SIGN, birthDate: '' },
  setZodiac,
  zodiacSign,
  risingSign,
  moonSign,
  onSignOut,
  projects,
  currentProject,
  getProjectColumns,
  updateProjectColumns,
  resetAllData,
  supabaseConfigured,
  supabaseStatus,
  supabaseError,
  fileSupported,
  fileConnected,
  fileHandle,
  fileName,
  connectFile,
  reconnectFile,
  disconnectFile
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(currentProject);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (currentProject) setSelectedProjectId(currentProject);
  }, [currentProject]);

  const textClass = darkMode ? 'text-gray-100' : 'text-gray-800';
  const labelClass = darkMode ? 'text-gray-300' : 'text-gray-700';
  const borderClass = darkMode ? 'border-gray-800' : 'border-gray-200';
  const cardBorderClass = darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white';
  const inputBgClass = darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900';

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const columns = selectedProjectId ? getProjectColumns(selectedProjectId) : [];

  const persistColumns = (newColumns) => {
    updateProjectColumns(selectedProjectId, newColumns);
  };

  const addColumn = () => {
    if (!newColumnTitle.trim()) return;
    const newColumn = {
      id: `col-${Date.now()}`,
      title: newColumnTitle.trim(),
      color: 'gray'
    };
    persistColumns([...columns, newColumn]);
    setNewColumnTitle('');
  };

  const removeColumn = (columnId) => {
    if (columns.length <= 1) return;
    if (!confirm('Delete this column? Move its tasks out first, or they will become hidden.')) return;
    persistColumns(columns.filter(c => c.id !== columnId));
  };

  const renameColumn = (columnId, title) => {
    persistColumns(columns.map(c => (c.id === columnId ? { ...c, title } : c)));
  };

  const recolorColumn = (columnId, color) => {
    persistColumns(columns.map(c => (c.id === columnId ? { ...c, color } : c)));
  };

  // Сброс всего сайта — двухшаговый, чтобы нельзя было стереть данные одним случайным кликом
  const handleReset = () => {
    resetAllData();
    setConfirmingReset(false);
    setSelectedProjectId('default');
    setNewColumnTitle('');
  };

  const moveColumn = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const newColumns = [...columns];
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    persistColumns(newColumns);
  };

  return (
    <PageShell darkMode={darkMode} title="Settings" width="prose">
      <div className="space-y-6">

        {/* Кто вошёл */}
        <div className={`rounded-lg border p-4 sm:p-6 ${cardBorderClass}`}>
          <h3 className={`text-section uppercase mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Account
          </h3>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className={`text-sm font-medium ${labelClass}`}>{user?.name}</div>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {user?.username} · {user?.role === 'admin' ? 'administrator' : 'user'}
              </p>
            </div>
            <button
              onClick={onSignOut}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border press ${
                darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        {/* Доступы: видит и меняет только админ */}
        {user?.role === 'admin' && setFeatureFlags && (
        <SettingsSection title={<><ShieldCheck size={14} /> Features for users</>} darkMode={darkMode} borderClass={cardBorderClass}>
                        <p className={`text-xs mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Applies to everyone except administrators — they always see everything.
            </p>

            {/* В несколько колонок: список короткий, но занимал всю ширину */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {FEATURES.map(feature => {
                const enabled = { ...DEFAULT_FLAGS, ...featureFlags }[feature.key] !== false;
                return (
                  <label
                    key={feature.key}
                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => setFeatureFlags({ ...DEFAULT_FLAGS, ...featureFlags, [feature.key]: !enabled })}
                      className="w-5 h-5 sm:w-4 sm:h-4 mt-0.5 cursor-pointer flex-shrink-0 accent-green-700"
                    />
                    <span className="min-w-0">
                      <span className={`block text-sm font-medium ${labelClass}`}>{feature.label}</span>
                      <span className={`block text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{feature.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
        </SettingsSection>
        )}

        {/* Theme */}
        {allowed('themes') && (
        <div className={`rounded-lg border p-4 sm:p-6 ${cardBorderClass}`}>
          <h3 className={`text-section uppercase mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Theme
          </h3>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map(({ key, label, Icon, hint }) => {
              const active = theme === key;
              return (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  title={hint}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border press ${
                    active
                      ? 'border-green-600 text-green-600'
                      : darkMode
                        ? 'border-gray-700 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              );
            })}
          </div>
          <p className={`text-xs mt-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {theme === 'wizard'
              ? 'Wizard: the Prisoner of Azkaban night — misty blues, candlelight and the house colours.'
              : theme === 'surf'
                ? 'Surf: an Indian ocean swell behind frosted panels.'
                : theme === 'millenial'
                  ? 'Millenial: Windows XP, 2001 — Luna blue, Tahoma and beveled buttons.'
                  : theme === 'handwriting'
                    ? 'Handwriting: a paper notebook — ruled sheet, ink and hand-drawn frames.'
                    : 'Wizard is Hogwarts at night, Surf is the ocean, Millenial is Windows XP, Handwriting is a notebook.'}
          </p>
        </div>
        )}

        {/* Sync — полная картина здесь; в сайдбаре остаются только проблемы */}
        {allowed('sync') && (
        <SettingsSection title={<>Sync</>} darkMode={darkMode} borderClass={cardBorderClass}>
          
          <div className="space-y-4">
            <div>
              <div className={`text-sm font-medium ${labelClass}`}>Cloud (Supabase)</div>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {!supabaseConfigured
                  ? 'Not configured — see .env.example'
                  : supabaseStatus === 'error'
                    ? supabaseError || 'Sync failed'
                    : supabaseStatus === 'loading'
                      ? 'Syncing…'
                      : 'Connected — changes save automatically'}
              </p>
            </div>

            <div className={`pt-4 border-t ${borderClass}`}>
              <div className={`text-sm font-medium ${labelClass}`}>File autosave</div>
              {!fileSupported ? (
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Not supported in this browser (needs Chrome or Edge)
                </p>
              ) : fileConnected ? (
                <div className="flex items-center justify-between gap-3 mt-1 flex-wrap">
                  <p className={`text-xs truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} title={fileName}>
                    Writing to {fileName}
                  </p>
                  <button
                    onClick={disconnectFile}
                    className={`text-xs px-3 py-1.5 rounded-lg border press ${
                      darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <p className={`text-xs mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Keep a JSON copy on disk, updated on every change
                  </p>
                  <button
                    onClick={fileHandle ? reconnectFile : connectFile}
                    className={`text-xs px-3 py-1.5 rounded-lg border press ${
                      darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {fileHandle ? `Restore access to ${fileName}` : 'Connect a file'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </SettingsSection>
        )}

        {/* Лайки: общий доступ даёт фича-тогл выше, а здесь выбирают,
            в каких именно проектах сердечки появятся на карточках */}
        {allowed('kanban') && allowed('likes') && setProjectLikes && (
        <SettingsSection title={<><Heart size={14} /> Likes on tasks</>} darkMode={darkMode} borderClass={cardBorderClass}>
                    <p className={`text-xs mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Switch on per project — a heart appears on the board cards of that project.
          </p>

          {projects.length === 0 ? (
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No projects yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {projects.map(project => {
                const enabled = !!projectLikes[project.id];
                return (
                  <label
                    key={project.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => setProjectLikes({ ...projectLikes, [project.id]: !enabled })}
                      className="w-5 h-5 sm:w-4 sm:h-4 cursor-pointer flex-shrink-0 accent-green-700"
                    />
                    <span className={`min-w-0 truncate text-sm font-medium ${labelClass}`}>{project.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </SettingsSection>
        )}

        {/* Гороскоп: чем задан знак — выбором или датой рождения */}
        <SettingsSection title={<>Horoscope</>} darkMode={darkMode} borderClass={cardBorderClass}>
                    <p className={`text-xs mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Shown as the eighth card in Schedule.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Sign</label>
              <Select
                value={zodiacSign || DEFAULT_SIGN}
                onChange={e => setZodiac({ ...zodiac, sign: e.target.value })}
                options={ZODIAC.map(sign => ({ value: sign.key, label: `${sign.symbol} ${sign.label}` }))}
                darkMode={darkMode}
                ariaLabel="Zodiac sign"
                disabled={!!zodiac.birthDate}
                className={`w-full px-4 py-2 border ${borderClass} rounded-lg ${inputBgClass} ${zodiac.birthDate ? 'opacity-50' : ''}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelClass} mb-2`}>Birth date</label>
              <input
                type="date"
                value={zodiac.birthDate || ''}
                onChange={e => setZodiac({ ...zodiac, birthDate: e.target.value })}
                aria-label="Birth date"
                className={`w-full px-4 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
              />
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {zodiac.birthDate
                  ? `Sign is taken from the date: ${getSign(zodiacSign).symbol} ${getSign(zodiacSign).label}. Clear the date to choose by hand.`
                  : 'Fill it in and the sign is worked out from it instead of the list.'}
              </p>
            </div>
          </div>

          {/* Натальная часть. Асцендент меняется примерно раз в два часа и
              зависит от широты, поэтому без времени и координат он не определён */}
          <div className={`mt-6 pt-6 border-t ${borderClass}`}>
            <h4 className={`text-sm font-medium ${labelClass}`}>Birth chart</h4>
            <p className={`text-xs mt-1 mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Time and place give the rising sign. Positions of the Moon and planets need
              ephemeris tables, which this app does not carry — they are not calculated.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${labelClass} mb-2`}>Birth time</label>
                <input
                  type="time"
                  value={zodiac.birthTime || ''}
                  onChange={e => setZodiac({ ...zodiac, birthTime: e.target.value })}
                  aria-label="Birth time"
                  className={`w-full px-4 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${labelClass} mb-2`}>Birth place</label>
                <input
                  type="text"
                  value={zodiac.place || ''}
                  onChange={e => setZodiac({ ...zodiac, place: e.target.value })}
                  placeholder="Minsk"
                  aria-label="Birth place"
                  className={`w-full px-4 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${labelClass} mb-2`}>Latitude</label>
                <input
                  type="number"
                  step="0.01"
                  value={zodiac.latitude ?? ''}
                  onChange={e => setZodiac({ ...zodiac, latitude: e.target.value })}
                  placeholder="53.90"
                  aria-label="Latitude"
                  className={`w-full px-4 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${labelClass} mb-2`}>Longitude</label>
                <input
                  type="number"
                  step="0.01"
                  value={zodiac.longitude ?? ''}
                  onChange={e => setZodiac({
                    ...zodiac,
                    longitude: e.target.value,
                    // Пояс подставляем по долготе, пока его не трогали руками:
                    // чаще всего он и так угадывается
                    utcOffset: zodiac.utcOffset === undefined || zodiac.utcOffset === ''
                      ? guessUtcOffset(e.target.value)
                      : zodiac.utcOffset
                  })}
                  placeholder="27.56"
                  aria-label="Longitude"
                  className={`w-full px-4 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${labelClass} mb-2`}>UTC offset at birth</label>
                <input
                  type="number"
                  step="0.5"
                  value={zodiac.utcOffset ?? ''}
                  onChange={e => setZodiac({ ...zodiac, utcOffset: e.target.value })}
                  placeholder="3"
                  aria-label="UTC offset at birth"
                  className={`w-full px-4 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
                />
                <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Suggested from longitude. Daylight saving and country borders are not
                  taken into account — check it against the birth year.
                </p>
              </div>

              <div className="flex items-end">
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {`Sun ${getSign(zodiacSign).symbol} ${getSign(zodiacSign).label}`}
                  {moonSign ? ` · Moon ${getSign(moonSign).symbol} ${getSign(moonSign).label}` : ''}
                  {risingSign
                    ? ` · Rising ${getSign(risingSign).symbol} ${getSign(risingSign).label}`
                    : ' · rising sign needs birth time, latitude and longitude'}
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Project columns */}
        {allowed('kanban') && (
        <SettingsSection title={<>Project columns</>} darkMode={darkMode} borderClass={cardBorderClass}>
          
          <div className="mb-4">
            <label className={`block text-sm font-medium ${labelClass} mb-2`}>Project</label>
            <Select
              value={selectedProjectId || ''}
              onChange={e => setSelectedProjectId(e.target.value)}
              options={projects.map(project => ({ value: project.id, label: project.name }))}
              darkMode={darkMode}
              ariaLabel="Project"
              className={`px-4 py-2 border ${borderClass} rounded-lg ${inputBgClass}`}
            />
          </div>

          {selectedProject && (
            <div className="space-y-3">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  className={`flex items-center gap-2 sm:gap-3 p-3 rounded-lg border flex-wrap ${borderClass}`}
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveColumn(index, -1)}
                      disabled={index === 0}
                      className={`p-2 sm:p-1 rounded disabled:opacity-30 press-icon ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <ArrowUp size={14} className={labelClass} />
                    </button>
                    <button
                      onClick={() => moveColumn(index, 1)}
                      disabled={index === columns.length - 1}
                      className={`p-2 sm:p-1 rounded disabled:opacity-30 press-icon ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <ArrowDown size={14} className={labelClass} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={column.title}
                    onChange={e => renameColumn(column.id, e.target.value)}
                    className={`flex-1 min-w-[80px] px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                  />

                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    {Object.entries(COLUMN_COLORS).map(([key, value]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => recolorColumn(column.id, key)}
                        title={value.label}
                        className={`w-7 h-7 sm:w-5 sm:h-5 rounded-full flex-shrink-0 transition duration-150 hover:scale-110 active:scale-90 ${value.dot} ${
                          column.color === key
                            ? `ring-2 ring-offset-2 ${darkMode ? 'ring-gray-300 ring-offset-gray-800' : 'ring-gray-500 ring-offset-white'}`
                            : 'opacity-40 hover:opacity-80'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => removeColumn(column.id)}
                    disabled={columns.length <= 1}
                    className={`p-2 rounded-lg disabled:opacity-30 press-icon ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-red-50'}`}
                    title="Delete column"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={e => setNewColumnTitle(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addColumn()}
                  placeholder="New column..."
                  className={`flex-1 min-w-0 px-3 py-2 border ${borderClass} rounded-lg focus:outline-none focus:border-green-500 ${inputBgClass}`}
                />
                <button
                  onClick={addColumn}
                  className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 flex items-center gap-2 press"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          )}
        </SettingsSection>
        )}

        {/* Reset */}
        {allowed('reset') && (
        <SettingsSection title={<>Reset</>} darkMode={darkMode} borderClass={cardBorderClass}>
          
          {confirmingReset ? (
            <div className="space-y-3 animate-pop-in">
              <p className={`text-sm ${labelClass}`}>
                This erases everything across the site — projects, tasks, columns, weekly plan
                and notes — and restores the default settings. It cannot be undone.
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 press"
                >
                  Yes, reset everything
                </button>
                <button
                  onClick={() => setConfirmingReset(false)}
                  className={`px-4 py-2 rounded-lg font-medium border press ${
                    darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmingReset(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border text-red-500 press ${
                  darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-red-50'
                }`}
              >
                <RotateCcw size={18} />
                Reset to defaults
              </button>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Clears all site data and restores the default settings.
              </p>
            </>
          )}
        </SettingsSection>
        )}
      </div>
    </PageShell>
  );
}
