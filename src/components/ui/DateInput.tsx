'use client';

import React from 'react';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({ 
  value, 
  onChange, 
  className = "", 
  required = false
}) => {
  return (
    <input
      type="date"
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${className}`}
    />
  );
};

