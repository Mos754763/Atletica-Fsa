export const THEME_TOGGLE_POSITION_STORAGE_KEY = "atletica-theme-toggle-position-v1";

export type ThemeTogglePosition = { x: number; y: number };
type Viewport = { width: number; height: number };
type ElementSize = { width: number; height: number };

export function parseThemeTogglePosition(value: string | null): ThemeTogglePosition | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object"
      && parsed !== null
      && "x" in parsed
      && "y" in parsed
      && typeof parsed.x === "number"
      && typeof parsed.y === "number"
      && Number.isFinite(parsed.x)
      && Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // A preferência é opcional: um valor corrompido apenas restaura a posição padrão.
  }

  return null;
}

export function clampThemeTogglePosition(
  position: ThemeTogglePosition,
  viewport: Viewport,
  size: ElementSize,
  margin = 16,
): ThemeTogglePosition {
  const minimum = Math.max(0, margin);
  const maximumX = Math.max(minimum, viewport.width - size.width - minimum);
  const maximumY = Math.max(minimum, viewport.height - size.height - minimum);

  return {
    x: Math.min(maximumX, Math.max(minimum, position.x)),
    y: Math.min(maximumY, Math.max(minimum, position.y)),
  };
}
