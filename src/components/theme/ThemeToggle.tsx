"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveThemePreference, THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

function readTheme(): ThemeMode {
  return resolveThemePreference(
    window.localStorage.getItem(THEME_STORAGE_KEY),
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

function applyTheme(nextTheme: ThemeMode) {
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: nextTheme } }));
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const resolvedTheme = readTheme();
    applyTheme(resolvedTheme);
    setTheme(resolvedTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  const isDark = theme === "dark";
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-pressed={isDark}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span className="theme-toggle__label">{isDark ? "Claro" : "Escuro"}</span>
    </button>
  );
}
