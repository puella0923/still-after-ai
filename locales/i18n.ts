import { getLocales } from 'expo-localization';
import ko from './ko';
import en from './en';

export type Language = 'ko' | 'en';

const translations = { ko, en };

let currentLanguage: Language = 'ko';

// Auto-detect device language on first load
export function detectLanguage(): Language {
  try {
    const locales = getLocales();
    const deviceLang = locales[0]?.languageCode ?? 'ko';
    return deviceLang === 'ko' ? 'ko' : 'en';
  } catch {
    return 'ko';
  }
}

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(): typeof ko {
  return translations[currentLanguage];
}

export default { ko, en };
