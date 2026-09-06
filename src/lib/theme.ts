import { useEffect } from 'react';

export type ThemeSetting = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(theme: ThemeSetting): ResolvedTheme {
  return theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
}

export function applyTheme(theme: ThemeSetting) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolveTheme(theme) === 'dark');
  root.style.colorScheme = resolveTheme(theme);
}

/** 把 store 中的 theme 设置同步到 <html> 上；选择「跟随系统」时监听系统变化 */
export function useThemeEffect(theme: ThemeSetting) {
  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;

    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
}
