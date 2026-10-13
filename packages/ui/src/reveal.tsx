"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { riseIn, staggerParent } from "./motion";

/** Entrada con desplazamiento suave de un bloque. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={riseIn}>
      {children}
    </motion.div>
  );
}

/** Contenedor que escalona la entrada de sus hijos con `variants={riseIn}`. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={staggerParent}>
      {children}
    </motion.div>
  );
}

export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={riseIn}>
      {children}
    </motion.div>
  );
}
