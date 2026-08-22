import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function TaskAddedNotification() {
  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-40 animate-toast-in">
      <CheckCircle size={20} />
      <span>Task added!</span>
    </div>
  );
}
