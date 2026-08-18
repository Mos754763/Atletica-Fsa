"use client";

import { useEffect, useRef } from "react";

export function ExperienceChrome() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const cursor = cursorRef.current;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    let frame = 0;
    let nextX = -120;
    let nextY = -120;

    const syncMode = () => {
      root.dataset.fsaMotion = reducedQuery.matches ? "reduced" : finePointerQuery.matches ? "enhanced" : "standard";
    };

    const paintPointer = () => {
      frame = 0;
      root.style.setProperty("--fsa-pointer-x", `${nextX}px`);
      root.style.setProperty("--fsa-pointer-y", `${nextY}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reducedQuery.matches || event.pointerType !== "mouse") return;
      nextX = event.clientX;
      nextY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paintPointer);
    };

    const onScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty("--fsa-scroll-progress", String(Math.min(1, Math.max(0, window.scrollY / maxScroll))));
    };

    syncMode();
    onScroll();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    reducedQuery.addEventListener("change", syncMode);
    finePointerQuery.addEventListener("change", syncMode);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reducedQuery.removeEventListener("change", syncMode);
      finePointerQuery.removeEventListener("change", syncMode);
    };
  }, []);

  return <div ref={cursorRef} aria-hidden="true" className="experience-chrome"><span className="experience-chrome__progress" /><span className="experience-chrome__cursor" /><span className="experience-chrome__cursor-core" /></div>;
}
