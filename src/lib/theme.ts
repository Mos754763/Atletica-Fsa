export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "fsa-theme";

export function resolveThemePreference(storedTheme: string | null | undefined, systemPrefersDark: boolean): ThemeMode {
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  // O modo claro é a base de contraste institucional; o modo escuro continua
  // disponível e toda escolha explícita do usuário permanece prioritária.
  void systemPrefersDark;
  return "light";
}
