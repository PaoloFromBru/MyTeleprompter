import type { UILang, UIStrings } from './i18n/types';
import en from './i18n/en';
import fr from './i18n/fr';
import nl from './i18n/nl';
import it from './i18n/it';

export type { UILang, UIStrings };

export function normalizeUILang(lang: string | undefined | null): UILang {
  const l = (lang || '').toLowerCase();
  if (l.startsWith('it')) return 'it';
  if (l.startsWith('fr')) return 'fr';
  if (l.startsWith('nl')) return 'nl';
  return 'en';
}

export const messages: Record<UILang, UIStrings> = {
  en,
  fr,
  nl,
  it,
};

