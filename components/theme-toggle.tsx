'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isLight ? (
          <Sun size={16} className="text-amber-500" />
        ) : (
          <Moon size={16} className="text-blue-400" />
        )}
        <span className="text-sm font-medium">
          {isLight ? 'Tema Claro' : 'Tema Escuro'}
        </span>
      </div>
      <button
        onClick={toggle}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
          isLight ? 'bg-amber-400' : 'bg-primary'
        }`}
        aria-label="Alternar tema"
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
            isLight ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
