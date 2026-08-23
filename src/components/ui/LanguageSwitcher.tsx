"use client";

import { Globe } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const LABELS: Record<string, string> = { pt: "PT", en: "EN" };

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm shadow-soft">
      <Globe className="ml-1.5 h-4 w-4 text-slate-400" aria-hidden />
      {(["pt", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
            locale === code
              ? "bg-brand-600 text-white"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
