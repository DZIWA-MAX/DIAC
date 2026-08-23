"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, getDictionary, type Locale } from "./dictionaries";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof getDictionary>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "nuvemx-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "pt" || stored === "en") {
      setLocaleState(stored);
      return;
    }
    const browserLang = window.navigator.language?.toLowerCase() ?? "";
    if (browserLang.startsWith("en")) setLocaleState("en");
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  };

  const value = useMemo(
    () => ({ locale, setLocale, t: getDictionary(locale) }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
