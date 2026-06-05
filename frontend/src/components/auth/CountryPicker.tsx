"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { useTranslation } from "@/hooks/useTranslation";
import {
  WORLD_COUNTRIES,
  countryFlag,
  countryName,
  type WorldCountry,
} from "@/lib/worldCountries";

interface CountryPickerProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function CountryPicker({ value, onChange, className }: CountryPickerProps) {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = WORLD_COUNTRIES.find((c) => c.code === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = WORLD_COUNTRIES.filter((c) => {
      if (!q) return true;
      const name = countryName(c, locale).toLowerCase();
      return name.includes(q) || c.code.toLowerCase().includes(q);
    });
    const african = list.filter((c) => c.isAfrican);
    const other = list.filter((c) => !c.isAfrican);
    return { african, other };
  }, [query, locale]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (c: WorldCountry) => {
    onChange(c.code);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <label className="block text-sm font-medium mb-1.5">{t("auth.register.country")}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 rounded-lg border bg-transparent flex items-center gap-3 text-left hover:border-africhess-gold/50 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-2xl leading-none shrink-0">
          {countryFlag(value)}
        </span>
        <span className="flex-1 truncate">
          {selected ? countryName(selected, locale) : t("auth.register.countryPlaceholder")}
        </span>
        <span className="text-xs opacity-40 shrink-0">{value}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full glass-card border border-white/15 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("auth.register.countrySearch")}
              className="w-full px-3 py-2 rounded-lg border bg-transparent text-sm"
              autoFocus
            />
          </div>
          <ul
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.african.length > 0 && (
              <>
                <li className="px-3 py-1.5 text-[10px] uppercase tracking-wide opacity-50 sticky top-0 bg-[var(--card)]">
                  {t("auth.register.countryAfrica")}
                </li>
                {filtered.african.map((c) => (
                  <CountryRow
                    key={c.code}
                    country={c}
                    locale={locale}
                    selected={c.code === value}
                    onPick={() => pick(c)}
                  />
                ))}
              </>
            )}
            {filtered.other.length > 0 && (
              <>
                <li className="px-3 py-1.5 text-[10px] uppercase tracking-wide opacity-50 sticky top-0 bg-[var(--card)] mt-1">
                  {t("auth.register.countryWorld")}
                </li>
                {filtered.other.map((c) => (
                  <CountryRow
                    key={c.code}
                    country={c}
                    locale={locale}
                    selected={c.code === value}
                    onPick={() => pick(c)}
                  />
                ))}
              </>
            )}
            {filtered.african.length === 0 && filtered.other.length === 0 && (
              <li className="px-4 py-6 text-sm opacity-50 text-center">
                {t("auth.register.countryEmpty")}
              </li>
            )}
          </ul>
        </div>
      )}
      <p className="text-[10px] opacity-45 mt-1.5">{t("auth.register.countryHint")}</p>
    </div>
  );
}

function CountryRow({
  country,
  locale,
  selected,
  onPick,
}: {
  country: WorldCountry;
  locale: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onPick}
        className={clsx(
          "w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-white/5",
          selected && "bg-africhess-gold/15 text-africhess-gold"
        )}
      >
        <span className="text-xl leading-none">{countryFlag(country.code)}</span>
        <span className="flex-1 truncate">{countryName(country, locale)}</span>
        <span className="text-[10px] opacity-40 font-mono">{country.code}</span>
      </button>
    </li>
  );
}
