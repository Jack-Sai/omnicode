import { createContext, useContext, type ReactNode } from 'react';
import { zh } from './zh';
import { en } from './en';

export type Locale = 'zh' | 'en';

const locales: Record<Locale, Record<string, string>> = { zh, en };

interface I18nContextValue {
  locale: Locale;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'zh',
  t: (key) => key,
});

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const dict = locales[locale] || locales.zh;
  const t = (key: string): string => dict[key] ?? key;
  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
