import React from 'react';
import { AlertCircle } from 'lucide-react';

// В сайдбаре живёт только то, что требует внимания. Рабочее состояние молчит,
// полная картина синхронизации — в Settings → Sync.
export default function CloudSyncStatus({ darkMode, configured, status, error }) {
  if (!configured || status !== 'error') return null;

  return (
    <div className={`px-4 py-2.5 border-b text-xs ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <p className="flex items-center gap-1.5 text-red-500" title={error || ''}>
        <AlertCircle size={13} className="flex-shrink-0" />
        Cloud sync failed
      </p>
    </div>
  );
}
