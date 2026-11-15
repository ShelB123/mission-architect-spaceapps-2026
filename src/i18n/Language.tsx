import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translateText } from "./translate";

export type Language = "es" | "en";
export const LANGUAGE_KEY = "mission-architect-language";

export function preferredLanguage(saved: string | null, languages: readonly string[]): Language {
  if (saved === "es" || saved === "en") return saved;
  for (const locale of languages) {
    const base = locale.toLowerCase().split(/[-_]/)[0];
    if (base === "es" || base === "en") return base;
  }
  return "es";
}

function initialLanguage(): Language {
  let saved: string | null = null;
  try { saved = localStorage.getItem(LANGUAGE_KEY); } catch { /* Storage may be disabled. */ }
  return preferredLanguage(saved, typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]);
}

const LanguageContext = createContext({ language: "en" as Language, setLanguage: (_language: Language) => {}, t: (text: string) => text });

/** Presentation state only: switching language never remounts or changes the mission. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "es" ? "Mission Architect | Diseña tu misión" : "Mission Architect | Design your mission";
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Keep the in-memory preference. */ }
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (text: string) => translateText(text, language) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  return <label className="language-select"><span className="sr-only">Idioma / Language</span>
    <select value={language} onChange={event => setLanguage(event.target.value as Language)}>
      <option value="es" lang="es">Español</option><option value="en" lang="en">English</option>
    </select>
  </label>;
}
