'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useSyncExternalStore } from 'react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <button className={`p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${className}`} disabled>
        <Monitor className="w-4 h-4 text-zinc-400" />
      </button>
    );
  }

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={cycle}
      className={`p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300 ${className}`}
      title={`Theme: ${theme} (click to cycle)`}
    >
      {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
      {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-400" />}
      {theme === 'system' && <Monitor className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />}
    </button>
  );
}
