"use client";

import { motion } from "motion/react";
import { SECTION_TRANSITION } from "@/lib/motion";

const ENTER = { opacity: 0, y: 10 };
const SETTLED = { opacity: 1, y: 0 };

/*
 * template.tsx, not layout.tsx: Next remounts a template on every navigation,
 * which is exactly what gives each route a fresh enter animation. A layout
 * persists and would animate once, on first load only.
 *
 * Enter-only. A real exit animation needs the outgoing route to stay mounted,
 * which the App Router does not do, and faking it delays every navigation.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={ENTER}
      animate={SETTLED}
      transition={SECTION_TRANSITION}
      className="flex min-h-full flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
