"use client";

import { useEffect, useRef } from "react";

const PARTICLES = Array.from({ length: 10 }, (_, index) => index);

export function BackofficeParticles() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const updateMotionPreference = () => { layer.dataset.reducedMotion = String(reducedMotion.matches); };
    const updatePointerPreference = () => { layer.dataset.finePointer = String(finePointer.matches); };
    const updatePosition = (event: PointerEvent) => {
      if (reducedMotion.matches || !finePointer.matches || !(event.target instanceof Element) || !event.target.closest(".erp-workspace")) return;
      const bounds = layer.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
      const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
      layer.style.setProperty("--backoffice-pointer-x", x.toFixed(3));
      layer.style.setProperty("--backoffice-pointer-y", y.toFixed(3));
    };

    updateMotionPreference();
    updatePointerPreference();
    document.addEventListener("pointermove", updatePosition, { passive: true });
    reducedMotion.addEventListener("change", updateMotionPreference);
    finePointer.addEventListener("change", updatePointerPreference);
    return () => {
      document.removeEventListener("pointermove", updatePosition);
      reducedMotion.removeEventListener("change", updateMotionPreference);
      finePointer.removeEventListener("change", updatePointerPreference);
    };
  }, []);

  return <div ref={layerRef} className="backoffice-particles" aria-hidden="true">{PARTICLES.map((particle) => <span key={particle} />)}</div>;
}
