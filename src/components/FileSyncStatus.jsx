import React from 'react';

export default function FileSyncStatus({
  darkMode,
  fileSupported,
  fileConnected,
  fileHandle,
  fileName,
  connectFile,
  reconnectFile,
  disconnectFile
}) {
  return (
    <div className={`p-4 border-b text-xs ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {!fileSupported ? (
        <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          File autosave is not supported in this browser (Chrome/Edge required)
        </p>
      ) : fileConnected ? (
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} title={fileName}>
            📄 {fileName}
          </span>
          <button
            onClick={disconnectFile}
            className={darkMode ? 'text-red-400 hover:underline flex-shrink-0' : 'text-red-600 hover:underline flex-shrink-0'}
          >
            Disconnect
          </button>
        </div>
      ) : fileHandle ? (
        <button onClick={reconnectFile} className="text-green-500 hover:underline">
          Allow access to {fileName}
        </button>
      ) : (
        <button onClick={connectFile} className="text-green-500 hover:underline">
          📁 Connect a file for autosave
        </button>
      )}
    </div>
  );
}
