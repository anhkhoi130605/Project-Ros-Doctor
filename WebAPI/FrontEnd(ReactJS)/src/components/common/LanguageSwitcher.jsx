import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LANGUAGES = [
  { code: 'vi', shortLabel: 'VI' },
  { code: 'en', shortLabel: 'EN' },
];

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const currentLanguage = String(i18n.resolvedLanguage || i18n.language || 'vi').split('-')[0];

  const changeLanguage = (language) => {
    if (language !== currentLanguage) {
      i18n.changeLanguage(language);
    }
  };

  return (
    <div className="language-switcher" role="group" aria-label={t('language')}>
      {LANGUAGES.map(({ code, shortLabel }) => (
        <button
          key={code}
          type="button"
          className={`language-switcher__button ${currentLanguage === code ? 'is-active' : ''}`}
          aria-pressed={currentLanguage === code}
          title={t(`languages.${code}`)}
          onClick={() => changeLanguage(code)}
        >
          {shortLabel}
        </button>
      ))}
    </div>
  );
}
