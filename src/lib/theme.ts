export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "fsa-theme";

export function resolveThemePreference(storedTheme: string | null | undefined, systemPrefersDark: boolean): ThemeMode {
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  if (systemPrefersDark) return "dark";
  return "dark";
}
