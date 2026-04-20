import React, { createContext, useContext, useState, useEffect } from 'react';
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

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ko');

  useEffect(() => {
    // Load saved language preference, fallback to device language
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'ko' || saved === 'en') {
        setLanguageState(saved);
        setLanguage(saved);
      } else {
        const detected = detectLanguage();
        setLanguageState(detected);
        setLanguage(detected);
      }
    });
  }, []);

  const setLang = (lang: Language) => {
    setLanguageState(lang);
    setLanguage(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang);
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
