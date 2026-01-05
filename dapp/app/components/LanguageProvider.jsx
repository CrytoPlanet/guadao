"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getText } from '../../lib/i18n';

const LanguageContext = createContext({
  lang: 'zh',
  setLang: () => {},
  t: (key, values) => getText('zh', key, values),
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('zh');

  useEffect(() => {
    const stored = window.localStorage.getItem('gua-lang');
    if (stored === 'en' || stored === 'zh') {
      setLang(stored);
    }
  }, []);

  const updateLang = (next) => {
    setLang(next);
    window.localStorage.setItem('gua-lang', next);
  };

  const value = useMemo(
    () => ({
      lang,
      setLang: updateLang,
      t: (key, values) => getText(lang, key, values),
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useI18n = () => useContext(LanguageContext);