import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/** Pastel theme state: saved choice (localStorage `pf-theme`) wins, default dark. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('pf-theme') === 'light' ? 'light' : 'dark'));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('pf-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggleTheme };
}
