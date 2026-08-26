export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "fsa-theme";
export const DEFAULT_THEME: ThemeMode = "light";

export function resolveThemePreference(storedTheme: string | null | undefined, systemPrefersDark: boolean): ThemeMode {
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  // Uma escolha explícita sempre prevalece; sem escolha, respeitamos a
  // preferência do sistema para que o primeiro acesso não seja intrusivo.
  return systemPrefersDark ? "dark" : DEFAULT_THEME;
}
