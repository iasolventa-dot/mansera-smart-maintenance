/** Tokens de movimiento (docs/07). Solo se anima transform/opacity. */
export const spring = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 } as const;
export const springSoft = { type: "spring", stiffness: 220, damping: 26 } as const;
export const ease = [0.22, 1, 0.36, 1] as const;
export const duration = { fast: 0.15, base: 0.28, slow: 0.5 } as const;

export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
} as const;

export const riseIn = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease } },
} as const;
