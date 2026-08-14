"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { PointerAura } from "@/components/landing/LandingMotion";
import { MOTION_SPRING } from "@/lib/motion-config";

export function ErpMotionWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <>
      <PointerAura />
      <motion.div
        className="erp-workspace erp-motion-workspace"
        key={pathname}
        initial={false}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={reducedMotion ? { duration: 0 } : { ...MOTION_SPRING, duration: 0.42 }}
      >
        {children}
      </motion.div>
    </>
  );
}
