"use client";

import { GripVertical, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { resolveThemePreference, THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";
import {
  clampThemeTogglePosition,
  parseThemeTogglePosition,
  THEME_TOGGLE_POSITION_STORAGE_KEY,
  type ThemeTogglePosition,
} from "./theme-toggle-position";

const TOGGLE_MARGIN = 16;
const DRAG_THRESHOLD = 4;

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: ThemeTogglePosition;
};

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
  const [position, setPosition] = useState<ThemeTogglePosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const positionRef = useRef<ThemeTogglePosition | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);

  function getSafePosition(candidate: ThemeTogglePosition) {
    const bounds = buttonRef.current?.getBoundingClientRect();
    return clampThemeTogglePosition(
      candidate,
      { width: window.innerWidth, height: window.innerHeight },
      { width: Math.max(bounds?.width ?? 104, 44), height: Math.max(bounds?.height ?? 42, 42) },
      TOGGLE_MARGIN,
    );
  }

  function setSafePosition(candidate: ThemeTogglePosition, persist = false) {
    const nextPosition = getSafePosition(candidate);
    positionRef.current = nextPosition;
    setPosition(nextPosition);
    if (persist) {
      window.localStorage.setItem(THEME_TOGGLE_POSITION_STORAGE_KEY, JSON.stringify(nextPosition));
    }
  }

  useEffect(() => {
    const resolvedTheme = readTheme();
    applyTheme(resolvedTheme);
    setTheme(resolvedTheme);

    const bounds = buttonRef.current?.getBoundingClientRect();
    const storedPosition = parseThemeTogglePosition(window.localStorage.getItem(THEME_TOGGLE_POSITION_STORAGE_KEY));
    setSafePosition(storedPosition ?? {
      x: window.innerWidth - Math.max(bounds?.width ?? 104, 44) - TOGGLE_MARGIN,
      y: window.innerHeight - Math.max(bounds?.height ?? 42, 42) - TOGGLE_MARGIN,
    });

    function keepToggleVisible() {
      if (positionRef.current) {
        setSafePosition(positionRef.current, true);
      }
    }

    window.addEventListener("resize", keepToggleVisible);
    return () => window.removeEventListener("resize", keepToggleVisible);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const bounds = buttonRef.current?.getBoundingClientRect();
    if (!bounds) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: bounds.left, y: bounds.top },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragSession = dragRef.current;
    if (!dragSession || dragSession.pointerId !== event.pointerId) return;

    const distance = Math.max(Math.abs(event.clientX - dragSession.startX), Math.abs(event.clientY - dragSession.startY));
    if (distance < DRAG_THRESHOLD) return;

    suppressClickRef.current = true;
    setSafePosition({
      x: dragSession.origin.x + event.clientX - dragSession.startX,
      y: dragSession.origin.y + event.clientY - dragSession.startY,
    });
  }

  function finishDragging(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragSession = dragRef.current;
    if (!dragSession || dragSession.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);

    if (suppressClickRef.current && positionRef.current) {
      window.localStorage.setItem(THEME_TOGGLE_POSITION_STORAGE_KEY, JSON.stringify(positionRef.current));
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
  }

  function handleClick() {
    if (!suppressClickRef.current) {
      toggleTheme();
    }
  }

  const isDark = theme === "dark";
  return (
    <button
      ref={buttonRef}
      className="theme-toggle"
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDragging}
      onPointerCancel={finishDragging}
      style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
      data-positioned={position ? "true" : undefined}
      data-dragging={isDragging ? "true" : undefined}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-pressed={isDark}
      title={`${isDark ? "Ativar modo claro" : "Ativar modo escuro"}. Arraste para reposicionar.`}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span className="theme-toggle__label">{isDark ? "Claro" : "Escuro"}</span>
      <GripVertical className="theme-toggle__grip" size={15} aria-hidden="true" />
    </button>
  );
}
