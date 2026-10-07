import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import viCommon from './locales/vi/common.json';
import enCommon from './locales/en/common.json';
import viNavigation from './locales/vi/navigation.json';
import enNavigation from './locales/en/navigation.json';
import viAuth from './locales/vi/auth.json';
import enAuth from './locales/en/auth.json';

const STORAGE_KEY = 'app_language';
const SUPPORTED_LANGUAGES = ['vi', 'en'];
const storedLanguage = localStorage.getItem(STORAGE_KEY);
const initialLanguage = SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : 'vi';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: {
        common: viCommon,
        navigation: viNavigation,
        auth: viAuth,
      },
      en: {
        common: enCommon,
        navigation: enNavigation,
        auth: enAuth,
      },
    },
    lng: initialLanguage,
    fallbackLng: 'vi',
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

const syncDocumentLanguage = (language) => {
  const normalizedLanguage = String(language || 'vi').split('-')[0];
  const safeLanguage = SUPPORTED_LANGUAGES.includes(normalizedLanguage) ? normalizedLanguage : 'vi';
  localStorage.setItem(STORAGE_KEY, safeLanguage);
  document.documentElement.lang = safeLanguage;
};

syncDocumentLanguage(initialLanguage);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
