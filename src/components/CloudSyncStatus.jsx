import React from 'react';

export default function CloudSyncStatus({ darkMode, configured, status, error }) {
  return (
    <div className={`p-4 border-b text-xs ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {!configured ? (
        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          ☁️ Supabase not configured (see .env.example)
        </p>
      ) : status === 'error' ? (
        <p className="text-red-500" title={error || ''}>
          ☁️ Supabase sync error
        </p>
      ) : status === 'loading' ? (
        <p className={`flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          ☁️ Syncing...
        </p>
      ) : (
        <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
          ☁️ Supabase connected
        </p>
      )}
    </div>
  );
}
