import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function StorageErrorBanner() {
  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 max-w-md">
      <AlertCircle size={20} />
      <span className="text-sm">Failed to save: not enough storage space. Try deleting old images.</span>
    </div>
  );
}
