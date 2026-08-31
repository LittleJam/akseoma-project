import React from 'react';
import Modal from './Modal';

// Спрашивается при закрытии редактора задачи с несохранёнными правками.
// Раньше это окно не закрывалось по Escape и имело своё затемнение — теперь
// и то и другое приходит из общего Modal.
export default function ConfirmDialog({ darkMode, onConfirm }) {
  return (
    <Modal
      size="sm"
      onClose={() => onConfirm(false)}
      panelClassName={`rounded-lg p-8 shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
    >
      <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        Save changes?
      </h3>
      <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        You have unsaved changes in this task. Do you want to save them?
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => onConfirm(true)}
          className="flex-1 h-control px-4 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium press"
        >
          Save
        </button>
        <button
          onClick={() => onConfirm(false)}
          className={`flex-1 h-control px-4 border rounded-lg font-medium press ${
            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Don't save
        </button>
      </div>
    </Modal>
  );
}
