"use client";

import { useEffect, useRef } from "react";

type ThemeName = "light" | "dark";
type Particle = { x: number; y: number; depth: number; drift: number; phase: number };

const AURORA_FPS = 24;
const PARTICLE_FPS = 30;
const MAX_DPR = 1.25;
const PARTICLE_COUNT = 26;

function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    x: (index * 37 % 100) / 100,
    y: (index * 61 % 100) / 100,
    depth: 0.35 + (index * 17 % 55) / 100,
    drift: 7 + (index * 11 % 17),
    phase: index * 0.73,
  }));
}

function createSprite(color: string) {
  const sprite = document.createElement("canvas");
  sprite.width = 36;
  sprite.height = 36;
  const context = sprite.getContext("2d");
  if (!context) return sprite;
  const gradient = context.createRadialGradient(18, 18, 0, 18, 18, 18);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.28, color);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 36, 36);
  return sprite;
}

export function FrontendFx() {
  const hostRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const aurora = auroraRef.current;
    const particles = particlesRef.current;
    if (!host || !aurora || !particles) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    let reduced = reducedQuery.matches;
    let isFinePointer = finePointerQuery.matches;
    let active = !document.hidden && !reduced;
    let frame = 0;
    let lastAurora = 0;
    let lastParticles = 0;
    let width = 1;
    let height = 1;
    let theme = currentTheme();
    const particleSet = createParticles();
    let brightSprite = createSprite("rgba(255,210,63,.78)");
    let mutedSprite = createSprite("rgba(75,138,240,.48)");
    let spotlightFrame = 0;
    let spotlightTarget: HTMLElement | null = null;
    let spotlightX = 50;
    let spotlightY = 50;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = Math.max(1, Math.round(window.innerWidth * 0.45));
      height = Math.max(1, Math.round(window.innerHeight * 0.45));
      for (const canvas of [aurora, particles]) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const paintAurora = (now: number) => {
      if (now - lastAurora < 1000 / AURORA_FPS) return;
      lastAurora = now;
      const context = aurora.getContext("2d");
      if (!context) return;
      const t = now / 1000;
      context.clearRect(0, 0, width, height);
      const palette = theme === "dark"
        ? ["rgba(11,61,145,.33)", "rgba(255,210,63,.17)", "rgba(83,139,244,.13)"]
        : ["rgba(11,61,145,.13)", "rgba(255,210,63,.19)", "rgba(83,139,244,.09)"];
      palette.forEach((color, index) => {
        const x = width * (0.24 + index * 0.29 + Math.sin(t * (0.19 + index * 0.04) + index) * 0.11);
        const y = height * (0.28 + (index % 2) * 0.36 + Math.cos(t * (0.17 + index * 0.05) + index) * 0.12);
        const radius = Math.max(width, height) * (0.38 + index * 0.06);
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      });
    };

    const paintParticles = (now: number) => {
      if (now - lastParticles < 1000 / PARTICLE_FPS) return;
      lastParticles = now;
      const context = particles.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const t = now / 1000;
      particleSet.forEach((particle, index) => {
        const x = (particle.x * width + Math.sin(t / particle.drift + particle.phase) * 18 * particle.depth + width) % width;
        const y = (particle.y * height - t * particle.depth * 2.5 + height) % height;
        const size = 7 + particle.depth * 9;
        const sprite = index % 3 === 0 ? brightSprite : mutedSprite;
        context.globalAlpha = theme === "dark" ? 0.5 + particle.depth * 0.22 : 0.28 + particle.depth * 0.17;
        context.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      });
      context.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (active) {
        paintAurora(now);
        paintParticles(now);
      }
      frame = window.requestAnimationFrame(loop);
    };

    const refreshTheme = () => {
      theme = currentTheme();
      brightSprite = createSprite(theme === "dark" ? "rgba(255,210,63,.78)" : "rgba(11,61,145,.62)");
      mutedSprite = createSprite(theme === "dark" ? "rgba(75,138,240,.48)" : "rgba(255,210,63,.53)");
      paintAurora(performance.now());
      paintParticles(performance.now());
    };
    const updateActivity = () => { active = !document.hidden && !reduced; };
    const updateReduced = () => { reduced = reducedQuery.matches; updateActivity(); host.dataset.reducedMotion = String(reduced); };
    const updatePointer = () => { isFinePointer = finePointerQuery.matches; host.dataset.finePointer = String(isFinePointer); };
    const paintSpotlight = () => {
      spotlightFrame = 0;
      if (!spotlightTarget) return;
      spotlightTarget.style.setProperty("--fx-spot-x", `${spotlightX}%`);
      spotlightTarget.style.setProperty("--fx-spot-y", `${spotlightY}%`);
    };
    const updateSpotlight = (event: PointerEvent) => {
      if (!isFinePointer || reduced || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>(".fx-spotlight, .fx-depth-surface");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      spotlightTarget = target;
      spotlightX = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
      spotlightY = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
      if (!spotlightFrame) spotlightFrame = window.requestAnimationFrame(paintSpotlight);
    };

    resize();
    updateReduced();
    updatePointer();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("themechange", refreshTheme);
    document.addEventListener("pointermove", updateSpotlight, { passive: true });
    document.addEventListener("visibilitychange", updateActivity);
    reducedQuery.addEventListener("change", updateReduced);
    finePointerQuery.addEventListener("change", updatePointer);
    frame = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frame);
      if (spotlightFrame) window.cancelAnimationFrame(spotlightFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("themechange", refreshTheme);
      document.removeEventListener("pointermove", updateSpotlight);
      document.removeEventListener("visibilitychange", updateActivity);
      reducedQuery.removeEventListener("change", updateReduced);
      finePointerQuery.removeEventListener("change", updatePointer);
    };
  }, []);

  return <div ref={hostRef} className="frontend-fx" aria-hidden="true"><canvas ref={auroraRef} className="frontend-fx__aurora" /><canvas ref={particlesRef} className="frontend-fx__particles" /></div>;
}
