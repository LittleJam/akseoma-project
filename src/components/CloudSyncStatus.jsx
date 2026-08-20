import React from 'react';

export default function CloudSyncStatus({ darkMode, configured, status, error }) {
  return (
    <div className={`p-4 border-b text-xs ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {!configured ? (
        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          ☁️ Supabase не настроен (см. .env.example)
        </p>
      ) : status === 'error' ? (
        <p className="text-red-500" title={error || ''}>
          ☁️ Ошибка синхронизации с Supabase
        </p>
      ) : status === 'loading' ? (
        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          ☁️ Синхронизация...
        </p>
      ) : (
        <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
          ☁️ Supabase подключён
        </p>
      )}
    </div>
  );
}
