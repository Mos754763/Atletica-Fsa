import type { Transition, Variants } from "framer-motion";

export const MOTION_SPRING: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 22,
  mass: 0.7,
};

export const MAGNETIC_SPRING: Transition = {
  type: "spring",
  stiffness: 190,
  damping: 17,
  mass: 0.45,
};

export const REVEAL_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(12px)" },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.62, delay, ease: [0.23, 1, 0.32, 1] },
  }),
};

export const CARD_HOVER = { y: -5, scale: 1.01 };
export const CARD_TAP = { scale: 0.985 };
