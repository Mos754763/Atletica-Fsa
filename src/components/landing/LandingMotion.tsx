"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { CARD_HOVER, CARD_TAP, HIGHLIGHT_PARTICLE_COUNT, MAGNETIC_SPRING, MOTION_SPRING, REVEAL_VARIANTS } from "@/lib/motion-config";

type MotionChildrenProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  eager?: boolean;
};

const particlePositions = [
  { left: "5%", top: "23%", size: 7, drift: 11, duration: 7.2, delay: 0.1 },
  { left: "13%", top: "71%", size: 5, drift: -9, duration: 8.1, delay: 0.8 },
  { left: "24%", top: "13%", size: 9, drift: 14, duration: 7.8, delay: 0.3 },
  { left: "34%", top: "82%", size: 5, drift: -12, duration: 8.8, delay: 1.4 },
  { left: "44%", top: "27%", size: 6, drift: 8, duration: 7.4, delay: 0.6 },
  { left: "56%", top: "70%", size: 8, drift: -10, duration: 9.1, delay: 1.1 },
  { left: "63%", top: "16%", size: 5, drift: 12, duration: 7.6, delay: 0.2 },
  { left: "72%", top: "48%", size: 9, drift: -11, duration: 8.3, delay: 1.6 },
  { left: "81%", top: "20%", size: 6, drift: 10, duration: 7.7, delay: 0.5 },
  { left: "88%", top: "75%", size: 7, drift: -8, duration: 8.6, delay: 1.2 },
  { left: "93%", top: "36%", size: 5, drift: 9, duration: 7.1, delay: 0.9 },
  { left: "48%", top: "49%", size: 4, drift: -7, duration: 8.4, delay: 1.8 },
] as const;

export function PointerAura() {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(-380);
  const y = useMotionValue(-380);
  const smoothX = useSpring(x, MAGNETIC_SPRING);
  const smoothY = useSpring(y, MAGNETIC_SPRING);

  useEffect(() => {
    if (reducedMotion) return;
    const updatePointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x.set(event.clientX - 170);
      y.set(event.clientY - 170);
    };
    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => window.removeEventListener("pointermove", updatePointer);
  }, [reducedMotion, x, y]);

  if (reducedMotion) return null;
  return <motion.div aria-hidden="true" className="motion-pointer-aura" style={{ x: smoothX, y: smoothY }} />;
}

export function MotionReveal({ children, className, delay = 0, eager = false }: MotionChildrenProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div className={className} custom={delay} initial={reducedMotion || eager ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.18 }} variants={REVEAL_VARIANTS}>
      {children}
    </motion.div>
  );
}

export function MotionCard({ children, className, delay = 0 }: MotionChildrenProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.article className={className} custom={delay} initial={reducedMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, amount: 0.16 }} variants={REVEAL_VARIANTS} whileHover={reducedMotion ? undefined : CARD_HOVER} whileTap={reducedMotion ? undefined : CARD_TAP} transition={MOTION_SPRING}>
      {children}
    </motion.article>
  );
}

type MagneticLinkProps = MotionChildrenProps & { href: string };

export function MagneticLink({ children, className, href }: MagneticLinkProps) {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, MAGNETIC_SPRING);
  const smoothY = useSpring(y, MAGNETIC_SPRING);

  return (
    <motion.div className="motion-magnetic" style={reducedMotion ? undefined : { x: smoothX, y: smoothY }} onPointerMove={(event) => { if (reducedMotion || event.pointerType !== "mouse") return; const bounds = event.currentTarget.getBoundingClientRect(); x.set((event.clientX - (bounds.left + bounds.width / 2)) * 0.15); y.set((event.clientY - (bounds.top + bounds.height / 2)) * 0.15); }} onPointerLeave={() => { x.set(0); y.set(0); }} whileTap={reducedMotion ? undefined : CARD_TAP}>
      <Link href={href} className={className}>{children}</Link>
    </motion.div>
  );
}

export function MotionButton({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  const reducedMotion = useReducedMotion();
  return <motion.button type="button" className={className} aria-label={label} whileHover={reducedMotion ? undefined : { scale: 1.08, rotate: -4 }} whileTap={reducedMotion ? undefined : CARD_TAP} transition={MOTION_SPRING}>{children}</motion.button>;
}

export function HeroMotion({ artwork, fallbackArtwork }: { artwork: string; fallbackArtwork?: string }) {
  const reducedMotion = useReducedMotion();
  const [artworkSource, setArtworkSource] = useState(artwork);
  const { scrollY } = useScroll();
  const artworkY = useTransform(scrollY, [0, 780], [0, -48]);
  const badgeY = useTransform(scrollY, [0, 780], [0, 34]);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const smoothTiltX = useSpring(tiltX, { stiffness: 135, damping: 20, mass: 0.5 });
  const smoothTiltY = useSpring(tiltY, { stiffness: 135, damping: 20, mass: 0.5 });
  useEffect(() => setArtworkSource(artwork), [artwork]);
  return (
    <div className="hero__mascot-wrap motion-hero-art" onPointerMove={(event) => { if (reducedMotion || event.pointerType !== "mouse") return; const bounds = event.currentTarget.getBoundingClientRect(); tiltX.set(((event.clientY - (bounds.top + bounds.height / 2)) / bounds.height) * -8); tiltY.set(((event.clientX - (bounds.left + bounds.width / 2)) / bounds.width) * 10); }} onPointerLeave={() => { tiltX.set(0); tiltY.set(0); }}>
      <span className="hero__yellow-orb" />
      <span className="hero__orbit hero__orbit--one" />
      <span className="hero__orbit hero__orbit--two" />
      <span className="hero__outline hero__outline--one">FSA</span>
      <span className="hero__outline hero__outline--two">FSA</span>
      <motion.div className="hero__mascot-viewport" style={reducedMotion ? undefined : { y: artworkY, rotateX: smoothTiltX, rotateY: smoothTiltY, transformPerspective: 1100 }} initial={false} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ ...MOTION_SPRING, delay: 0.18 }}>
        <img className="hero__official-art" src={artworkSource} alt="Mascote institucional da ATLETICA FSA para a gestão 2026" fetchPriority="high" decoding="async" onError={() => { if (fallbackArtwork && artworkSource !== fallbackArtwork) setArtworkSource(fallbackArtwork); }} />
      </motion.div>
      <motion.div className="hero__badge" style={reducedMotion ? undefined : { y: badgeY }} initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...MOTION_SPRING, delay: 0.34 }}><strong>2026</strong><span>GESTÃO<br />FSA</span></motion.div>
    </div>
  );
}

export function ParallaxArtwork({ src, className }: { src: string; className: string }) {
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [260, 1700], [0, -48]);
  return <motion.img className={className} src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" style={reducedMotion ? undefined : { y }} />;
}

export function HighlightParallax({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [120, 980], [0, -20]);
  return <motion.div className="motion-highlight-content" style={reducedMotion ? undefined : { y }}>{children}</motion.div>;
}

export function FloatingParticles() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;
  return (
    <div className="motion-highlight-particles" aria-hidden="true">
      {particlePositions.slice(0, HIGHLIGHT_PARTICLE_COUNT).map((particle, index) => (
        <motion.span
          className="motion-particle"
          key={index}
          style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size }}
          animate={{ x: [0, particle.drift, 0], y: [0, -14, 0], opacity: [0.22, 0.75, 0.22], scale: [0.86, 1.12, 0.86] }}
          transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
