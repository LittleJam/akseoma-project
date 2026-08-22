import React from 'react';

export default function ConfirmDialog({ darkMode, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className={`rounded-lg p-8 max-w-md animate-dialog-in ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Save changes?
        </h3>
        <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          You have unsaved changes in this task. Do you want to save them?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(true)}
            className="flex-1 px-4 py-2 bg-green-800 text-white rounded hover:bg-green-900 font-medium press"
          >
            Save
          </button>
          <button
            onClick={() => onConfirm(false)}
            className={`flex-1 px-4 py-2 border rounded font-medium press ${
              darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Don't save
          </button>
        </div>
      </div>
    </div>
  );
}
