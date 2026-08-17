'use client';

import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * A standardized Date Input component that enforces dd-mm-yyyy visual formatting
 * while maintaining native browser date-picker functionality.
 */
export const DateInput: React.FC<DateInputProps> = ({ 
  value, 
  onChange, 
  className = "", 
  placeholder = "dd-mm-yyyy",
  required = false
}) => {
  
  // Format the display date, handling potential invalid dates
  const getDisplayDate = () => {
    if (!value) return placeholder;
    try {
      const dateObj = new Date(value);
      if (isNaN(dateObj.getTime())) return placeholder;
      return format(dateObj, 'dd-MM-yyyy');
    } catch (e) {
      return placeholder;
    }
  };

  return (
    <div className={`relative flex items-center group ${className}`}>
      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
      
      {/* Visual Overlay: Forced dd-mm-yyyy format */}
      <span className="absolute left-10 text-sm text-zinc-900 dark:text-zinc-200 pointer-events-none z-10 bg-white dark:bg-zinc-950 pr-2 font-medium">
        {getDisplayDate()}
      </span>

      {/* Hidden Native Input: Provides the date picker */}
      <input
        type="date"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-transparent outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer relative z-0 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:hidden"
      />
    </div>
  );
};
