// Enhanced theme manager with system preference sync and smooth transitions

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'prakash_theme';
const TRANSITION_DURATION = 300;

// Get current theme preference
export const getTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(THEME_KEY) as Theme;
  return saved || 'system';
};

// Set theme preference
export const setTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
};

// Apply theme with smooth transition
export const applyTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Add transition class for smooth change
  root.style.transition = `background-color ${TRANSITION_DURATION}ms ease, color ${TRANSITION_DURATION}ms ease`;
  
  // Apply theme
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Remove transition after animation
  setTimeout(() => {
    root.style.transition = '';
  }, TRANSITION_DURATION);
};

// Initialize theme on app load
export const initTheme = (): void => {
  if (typeof window === 'undefined') return;
  
  const theme = getTheme();
  applyTheme(theme);
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = (_e: MediaQueryListEvent) => {
    if (getTheme() === 'system') {
      applyTheme('system');
    }
  };
  
  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleSystemThemeChange);
  }
};

// Get effective theme (resolved system preference)
export const getEffectiveTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  
  const theme = getTheme();
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

// React hook for theme management
import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(getEffectiveTheme());
  
  useEffect(() => {
    initTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setEffectiveTheme(getEffectiveTheme());
      }
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);
  
  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setThemeState(newTheme);
    setEffectiveTheme(getEffectiveTheme());
  };
  
  return {
    theme,
    effectiveTheme,
    setTheme: updateTheme,
    toggleTheme: () => {
      const current = getEffectiveTheme();
      updateTheme(current === 'dark' ? 'light' : 'dark');
    }
  };
};

