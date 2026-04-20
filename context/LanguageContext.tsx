import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, detectLanguage, setLanguage } from '../locales/i18n';
import ko from '../locales/ko';
import en from '../locales/en';

const STORAGE_KEY = '@still_after_language';

interface LanguageContextType {
  language: Language;
  t: typeof ko;
  toggleLanguage: () => void;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ko',
  t: ko,
  toggleLanguage: () => {},
  setLang: () => {},
});

/** Extract /ko or /en prefix from the current URL path (web only) */
function getLangFromURL(): Language | null {
  if (Platform.OS !== 'web') return null;
  try {
    const path = window.location.pathname;
    if (path.startsWith('/en')) return 'en';
    if (path.startsWith('/ko')) return 'ko';
  } catch { /* SSR / non-browser */ }
  return null;
}

/** Swap the language prefix in the current URL path (web only) */
function updateURLLang(lang: Language) {
  if (Platform.OS !== 'web') return;
  try {
    const current = window.location.pathname;
    // Strip existing /ko or /en prefix
    const withoutLang = current.replace(/^\/(ko|en)(\/|$)/, '/');
    // Prepend the new prefix — avoid double slash
    const newPath = `/${lang}${withoutLang === '/' ? '' : withoutLang}`;
    window.history.replaceState(
      null,
      '',
      newPath + window.location.search + window.location.hash,
    );
  } catch { /* no-op */ }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ko');

  useEffect(() => {
    const init = async () => {
      // 1. Check URL prefix first (web only) — takes highest priority
      const urlLang = getLangFromURL();
      if (urlLang) {
        setLanguageState(urlLang);
        setLanguage(urlLang);
        await AsyncStorage.setItem(STORAGE_KEY, urlLang);
        return;
      }

      // 2. Fallback to saved preference
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'ko' || saved === 'en') {
        setLanguageState(saved);
        setLanguage(saved);
        // Reflect saved preference in the URL
        updateURLLang(saved);
        return;
      }

      // 3. Auto-detect from device locale
      const detected = detectLanguage();
      setLanguageState(detected);
      setLanguage(detected);
      updateURLLang(detected);
    };
    init();
  }, []);

  const setLang = (lang: Language) => {
    setLanguageState(lang);
    setLanguage(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang);
    updateURLLang(lang);
  };

  const toggleLanguage = () => {
    setLang(language === 'ko' ? 'en' : 'ko');
  };

  const t = language === 'ko' ? ko : en;

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
