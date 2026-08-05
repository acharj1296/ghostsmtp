// ─── Framer Motion shared variants ───────────────────────────────────────────
// Centralized animation tokens so every dashboard section feels like one system.

import type { Variants } from 'framer-motion';

/** Smooth, professional easing curve used across the dashboard. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Fade + rise reveal for section blocks. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
};

/** Container that staggers its children on reveal. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

/** Individual item inside a staggered container. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE },
  },
};

/** Subtle scale/lift used on interactive cards. */
export const hoverLift = {
  rest: { y: 0 },
  hover: { y: -4, transition: { duration: 0.25, ease: EASE } },
};

/** Shared viewport config so reveals only fire once, slightly before fully in view. */
export const revealViewport = { once: true, amount: 0.2, margin: '0px 0px -60px 0px' } as const;
