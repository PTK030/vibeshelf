"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { EASE_SMOOTH } from "@/lib/motion";

/*
 * Sections appear one after another instead of the whole page fading in as a
 * slab. Animating the route wrapper moved the header and footer too and gave
 * the eye nothing to follow; staggering the content builds the page in reading
 * order, which is what makes it feel deliberate rather than loaded.
 *
 * Variants live on the parent, so children need no per-item delay prop and no
 * fresh objects in JSX.
 */
const CONTAINER = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

const ITEM = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_SMOOTH },
  },
};

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

export function Stagger({ children, className }: StaggerProps) {
  return (
    <motion.div variants={CONTAINER} initial="hidden" animate="visible" className={className}>
      {children}
    </motion.div>
  );
}

/* One step in the sequence. Must be a descendant of Stagger. */
export function StaggerItem({ children, className }: StaggerProps) {
  return (
    <motion.div variants={ITEM} className={className}>
      {children}
    </motion.div>
  );
}
