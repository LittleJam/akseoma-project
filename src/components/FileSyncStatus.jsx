import React from 'react';
import { AlertCircle } from 'lucide-react';

// Показываем только один случай — доступ к файлу автосохранения потерян и его надо вернуть.
// Подключение и отключение файла переехали в Settings → Sync.
export default function FileSyncStatus({ darkMode, fileSupported, fileConnected, fileHandle, fileName, reconnectFile }) {
  const needsPermission = fileSupported && fileHandle && !fileConnected;
  if (!needsPermission) return null;

  return (
    <div className={`px-4 py-2.5 border-b text-xs ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <button onClick={reconnectFile} className="flex items-center gap-1.5 text-amber-500 hover:underline press">
        <AlertCircle size={13} className="flex-shrink-0" />
        <span className="truncate">Restore access to {fileName}</span>
      </button>
    </div>
  );
}
