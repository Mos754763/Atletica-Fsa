"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { CARD_HOVER, CARD_TAP, MAGNETIC_SPRING, MOTION_SPRING, REVEAL_VARIANTS } from "@/lib/motion-config";

type MotionChildrenProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

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

export function MotionReveal({ children, className, delay = 0 }: MotionChildrenProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      custom={delay}
      initial={reducedMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      variants={REVEAL_VARIANTS}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({ children, className, delay = 0 }: MotionChildrenProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.article
      className={className}
      custom={delay}
      initial={reducedMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.16 }}
      variants={REVEAL_VARIANTS}
      whileHover={reducedMotion ? undefined : CARD_HOVER}
      whileTap={reducedMotion ? undefined : CARD_TAP}
      transition={MOTION_SPRING}
    >
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
    <motion.div
      className="motion-magnetic"
      style={reducedMotion ? undefined : { x: smoothX, y: smoothY }}
      onPointerMove={(event) => {
        if (reducedMotion || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - (bounds.left + bounds.width / 2)) * 0.15);
        y.set((event.clientY - (bounds.top + bounds.height / 2)) * 0.15);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={reducedMotion ? undefined : CARD_TAP}
    >
      <Link href={href} className={className}>{children}</Link>
    </motion.div>
  );
}

export function MotionButton({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  const reducedMotion = useReducedMotion();
  return <motion.button type="button" className={className} aria-label={label} whileHover={reducedMotion ? undefined : { scale: 1.08, rotate: -4 }} whileTap={reducedMotion ? undefined : CARD_TAP} transition={MOTION_SPRING}>{children}</motion.button>;
}

export function HeroMotion({ artwork }: { artwork: string }) {
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const artworkY = useTransform(scrollY, [0, 780], [0, -48]);
  const badgeY = useTransform(scrollY, [0, 780], [0, 34]);
  return (
    <div className="hero__mascot-wrap motion-hero-art">
      <span className="hero__yellow-orb" />
      <span className="hero__outline hero__outline--one">FSA</span>
      <span className="hero__outline hero__outline--two">FSA</span>
      <motion.img className="hero__official-art" style={reducedMotion ? undefined : { y: artworkY }} initial={reducedMotion ? false : { opacity: 0, scale: 0.96, filter: "blur(12px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ ...MOTION_SPRING, delay: 0.18 }} src={artwork} alt="Mascote institucional da ATLETICA FSA para a gestão 2026" />
      <motion.div className="hero__badge" style={reducedMotion ? undefined : { y: badgeY }} initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...MOTION_SPRING, delay: 0.34 }}><strong>2026</strong><span>GESTÃO<br />FSA</span></motion.div>
    </div>
  );
}

export function ParallaxArtwork({ src, className }: { src: string; className: string }) {
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [260, 1700], [0, -48]);
  return <motion.img className={className} src={src} alt="" aria-hidden="true" style={reducedMotion ? undefined : { y }} />;
}
