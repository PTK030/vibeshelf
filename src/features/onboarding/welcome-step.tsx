"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

/* Animation props are hoisted so they are not reallocated on every render. */
const HIDDEN = { opacity: 0, y: 12 };
const SHOWN = { opacity: 1, y: 0 };

const ITEMS = [
  {
    title: "Reads your liked songs",
    body: "We pull your library and artist genres straight from Spotify.",
    transition: { delay: 0.1, duration: 0.3 },
  },
  {
    title: "Enriches from the web",
    body: "BPM, energy and mood from ReccoBeats, lyrics from lyrics.ovh — all free.",
    transition: { delay: 0.18, duration: 0.3 },
  },
  {
    title: "Proposes a plan",
    body: "Playlists tematyczne zobaczysz i poprawisz, zanim cokolwiek trafi na konto.",
    transition: { delay: 0.26, duration: 0.3 },
  },
];

interface WelcomeStepProps {
  displayName: string;
  onNext: () => void;
}

export function WelcomeStep({ displayName, onNext }: WelcomeStepProps) {
  return (
    <div>
      <h1 className="text-xl font-bold">Hi, {displayName}</h1>
      <p className="mt-3 text-sm text-muted">Three steps and we are off. Under a minute.</p>

      <ul className="mt-8 flex flex-col gap-3">
        {ITEMS.map((item) => (
          <motion.li
            key={item.title}
            className="rounded-md bg-surface p-4"
            initial={HIDDEN}
            animate={SHOWN}
            transition={item.transition}
          >
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-xs text-muted">{item.body}</p>
          </motion.li>
        ))}
      </ul>

      <div className="mt-8">
        <Button size="lg" onClick={onNext}>
          Get started
        </Button>
      </div>
    </div>
  );
}
