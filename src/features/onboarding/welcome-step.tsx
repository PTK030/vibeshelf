"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

/* Animation props are hoisted so they are not reallocated on every render. */
const HIDDEN = { opacity: 0, y: 12 };
const SHOWN = { opacity: 1, y: 0 };

const ITEMS = [
  {
    title: "Czyta Twoje polubione",
    body: "Pobieramy bibliotekę i gatunki artystów prosto ze Spotify.",
    transition: { delay: 0.1, duration: 0.3 },
  },
  {
    title: "Wzbogaca o dane z sieci",
    body: "BPM, energia i nastrój z ReccoBeats, teksty z lyrics.ovh — wszystko za darmo.",
    transition: { delay: 0.18, duration: 0.3 },
  },
  {
    title: "Proponuje plan",
    body: "Playlisty tematyczne zobaczysz i poprawisz, zanim cokolwiek trafi na konto.",
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
      <h1 className="text-xl font-black">Cześć, {displayName}</h1>
      <p className="mt-3 text-sm text-muted">Trzy kroki i zaczynamy. Zajmie to mniej niż minutę.</p>

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
          Zaczynamy
        </Button>
      </div>
    </div>
  );
}
