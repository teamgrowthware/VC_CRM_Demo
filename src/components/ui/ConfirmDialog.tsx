import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in duration-200"
        onClick={!isLoading ? onCancel : undefined}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-[#0a0a0b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-[110] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          </div>
          <button 
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-b-xl border-t border-zinc-100 dark:border-zinc-800/50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  );
};
