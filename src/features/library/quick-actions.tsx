"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { SECTION_TRANSITION } from "@/lib/motion";

/*
 * Presets that land on /organizuj with the prompt already filled in. Most
 * people do not want to compose a brief — they want the obvious thing, now.
 */
const ACTIONS = [
  {
    slug: "all",
    title: "Uporządkuj wszystko",
    body: "Przejrzyj całą bibliotekę i zaproponuj komplet playlist.",
    prompt: undefined,
    accent: true,
  },
  {
    slug: "run",
    title: "Na trening",
    body: "Wysokie tempo, mocny puls, bez wolnych kawałków.",
    prompt: "Playlista na trening: wysokie BPM, energiczne, bez ballad i długich intr.",
    accent: false,
  },
  {
    slug: "focus",
    title: "Do skupienia",
    body: "Instrumentalne i nierozpraszające, na długą pracę.",
    prompt: "Playlista do pracy i nauki: instrumentalne lub minimalny wokal, stały rytm.",
    accent: false,
  },
  {
    slug: "evening",
    title: "Na wieczór",
    body: "Wolniej, cieplej, na koniec dnia.",
    prompt: "Playlista na spokojny wieczór: wolne tempo, ciepłe brzmienie, refleksyjne.",
    accent: false,
  },
] as const;

const TILE = {
  hidden: { opacity: 0, y: 14 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05, ...SECTION_TRANSITION },
  }),
};

export function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ACTIONS.map((action, index) => (
        <motion.div
          key={action.slug}
          custom={index}
          variants={TILE}
          initial="hidden"
          animate="visible"
        >
          <Link
            href={
              action.prompt === undefined
                ? "/organizuj"
                : `/organizuj?prompt=${encodeURIComponent(action.prompt)}`
            }
            className={cn(
              "flex h-full flex-col rounded-md border p-5",
              "transition-colors duration-350 ease-smooth",
              action.accent
                ? "border-accent/40 bg-accent/10 hover:bg-accent/15"
                : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover",
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold",
                action.accent ? "text-accent" : "text-foreground",
              )}
            >
              {action.title}
            </span>
            <span className="mt-1 text-xs text-muted">{action.body}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
