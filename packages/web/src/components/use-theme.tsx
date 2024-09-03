import { useState } from 'react';
import { srcbookLight, srcbookDark } from '@/lib/code-theme';

export type ThemeType = 'light' | 'dark';
export type CodeThemeType = typeof srcbookLight  ;

export function getTheme(): ThemeType {
  const theme = localStorage.getItem('sb:theme');

  if (theme === 'light' || theme === 'dark') {
    return theme;
  }

  return 'dark';
}

function persistTheme(theme: ThemeType) {
  localStorage.setItem('sb:theme', theme);
}

function updateClass(theme: ThemeType) {
  const html = document.querySelector('html')!;

  if (theme === 'light') {
    html.classList.remove('dark');
  } else {
    html.classList.add('dark');
  }
}

export default function useTheme() {
  const [theme, _setTheme] = useState<ThemeType>(getTheme());

  function setTheme(theme: ThemeType) {
    updateClass(theme);
    persistTheme(theme);
    _setTheme(theme);
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return {
    theme,
    codeTheme: getTheme() === 'dark' ? srcbookDark : srcbookLight,
    toggleTheme,
    setTheme,
  };
}
