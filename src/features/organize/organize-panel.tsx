"use client";

import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Toggle } from "@/components/ui/toggle";
import { PlanPreview } from "@/features/organize/plan-preview";
import { type StreamState, useOrganizeStream } from "@/features/organize/use-organize-stream";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
} from "@/features/onboarding/preferences";
import type { Preferences } from "@/features/onboarding/preferences";
import { POP_TRANSITION, SECTION_TRANSITION } from "@/lib/motion";
import { cn } from "@/lib/cn";

export interface ModelChoice {
  id: string;
  name: string;
  promptPerMillion: number | undefined;
}

interface OrganizePanelProps {
  models: ModelChoice[];
  likedCount: number;
  /* The model saved on the session, so the choice survives a reload. */
  selectedModel: string;
  /* Prefilled brief when arriving from a quick action on the library page. */
  presetPrompt?: string;
}

/*
 * Hoisted so Framer Motion is not handed a fresh object every render, and so
 * every section enters and leaves on the same curve. Conditional rendering
 * without an exit animation is what made this feel like a light switch.
 */
const SECTION = {
  initial: { opacity: 0, y: 12, height: 0 },
  animate: { opacity: 1, y: 0, height: "auto" },
  exit: { opacity: 0, y: -8, height: 0 },
};

const POP = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.94 },
};

export function OrganizePanel({
  models,
  likedCount,
  selectedModel,
  presetPrompt,
}: OrganizePanelProps) {
  const { state, start, cancel } = useOrganizeStream();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [prompt, setPrompt] = useState(presetPrompt ?? "");
  const [model, setModel] = useState(selectedModel || (models[0]?.id ?? ""));

  /*
   * localStorage is genuinely an external system and is unavailable during
   * SSR, so preferences can only be read after mount. Seeding state directly
   * would desynchronise the server and client renders.
   */
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setPreferences(loadPreferences());
  }, []);

  const updatePreferences = useCallback((next: Preferences) => {
    setPreferences(next);
    savePreferences(next);
  }, []);

  const setDeep = useCallback(
    (value: boolean) => updatePreferences({ ...preferences, deepAnalysis: value }),
    [preferences, updatePreferences],
  );
  const setScoring = useCallback(
    (value: boolean) => updatePreferences({ ...preferences, playlistScoring: value }),
    [preferences, updatePreferences],
  );
  const setRealtime = useCallback(
    (value: boolean) => updatePreferences({ ...preferences, realtimeSuggestions: value }),
    [preferences, updatePreferences],
  );

  const handlePrompt = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  }, []);

  const handleModel = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setModel(event.target.value);
  }, []);

  const handleStart = useCallback(() => {
    void start({
      taxonomyModel: model,
      classifyModel: model,
      userPrompt: prompt.trim() === "" ? undefined : prompt.trim(),
      deepAnalysis: preferences.deepAnalysis,
      playlistScoring: preferences.playlistScoring,
      maxTracks: Math.min(likedCount, 1500),
    });
  }, [model, prompt, preferences, likedCount, start]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-muted">
            Czego potrzebujesz? (opcjonalnie)
          </span>
          <textarea
            value={prompt}
            onChange={handlePrompt}
            rows={3}
            disabled={state.running}
            placeholder="np. playlista na trening siłowy 60–90 minut, bez ballad"
            className={cn(
              "w-full resize-none rounded-sm bg-background px-4 py-3 text-sm",
              "border border-border-strong placeholder:text-disabled",
              "transition-colors duration-150 focus:border-accent focus:outline-none",
            )}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-muted">Model</span>
          <select
            value={model}
            onChange={handleModel}
            disabled={state.running}
            className={cn(
              "h-11 w-full rounded-sm bg-background px-3 text-sm",
              "border border-border-strong focus:border-accent focus:outline-none",
            )}
          >
            {models.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.promptPerMillion === undefined
                  ? ""
                  : ` — $${option.promptPerMillion.toFixed(2)}/1M`}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <div className="flex flex-col gap-3">
        <Toggle
          checked={preferences.deepAnalysis}
          onChange={setDeep}
          disabled={state.running}
          label="Głęboka analiza utworów"
          description="BPM, energia i nastrój z ReccoBeats oraz teksty. Dokładniej, ale wolniej."
        />
        <Toggle
          checked={preferences.playlistScoring}
          onChange={setScoring}
          disabled={state.running}
          label="Ocena dopasowania playlist"
          description="Każda playlista dostaje wynik zgodności z Twoim gustem i uzasadnienie."
        />
        <Toggle
          checked={preferences.realtimeSuggestions}
          onChange={setRealtime}
          disabled={state.running}
          label="Sugestie na żywo"
          description="Pokazuj podpowiedzi w trakcie analizy, nie dopiero na końcu."
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={handleStart} disabled={state.running || model === ""}>
          {state.running ? "Analizuję..." : "Uruchom analizę"}
        </Button>
        <AnimatePresence initial={false}>
          {state.running && (
            <motion.div
              key="cancel"
              initial={POP.initial}
              animate={POP.animate}
              exit={POP.exit}
              transition={POP_TRANSITION}
            >
              <Button variant="secondary" size="lg" onClick={cancel}>
                Przerwij
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {(state.running || state.plan !== undefined) && (
          <motion.div
            key="progress"
            initial={SECTION.initial}
            animate={SECTION.animate}
            exit={SECTION.exit}
            transition={SECTION_TRANSITION}
            className="overflow-hidden"
          >
            <Card className="flex flex-col gap-4">
              <Progress value={state.progress} label={state.label || "Pracuję..."} />
              <LiveNotesSection show={preferences.realtimeSuggestions} library={state.library} />
            </Card>
          </motion.div>
        )}

        {state.error !== undefined && (
          <motion.div
            key="error"
            initial={SECTION.initial}
            animate={SECTION.animate}
            exit={SECTION.exit}
            transition={SECTION_TRANSITION}
            className="overflow-hidden"
          >
            <Card className="border border-danger/40">
              <p className="text-sm text-danger">{state.error}</p>
            </Card>
          </motion.div>
        )}

        {state.plan !== undefined && (
          <motion.div
            key="plan"
            initial={SECTION.initial}
            animate={SECTION.animate}
            exit={SECTION.exit}
            transition={SECTION_TRANSITION}
          >
            <PlanPreview plan={state.plan} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LiveNotesSectionProps {
  show: boolean;
  library: StreamState["library"];
}

function LiveNotesSection({ show, library }: LiveNotesSectionProps) {
  return (
    <AnimatePresence initial={false}>
      {show && library !== undefined && (
        <motion.div
          initial={SECTION.initial}
          animate={SECTION.animate}
          exit={SECTION.exit}
          transition={SECTION_TRANSITION}
          className="overflow-hidden"
        >
          <LiveNotes
            tracks={library.tracks}
            duplicates={library.duplicatesRemoved}
            genreCoverage={library.genreCoverage}
            featureCoverage={library.featureCoverage}
            nameOnly={library.nameOnlyMode}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface LiveNotesProps {
  tracks: number;
  duplicates: number;
  genreCoverage: number;
  featureCoverage: number;
  nameOnly: boolean;
}

/* The "live suggestions" toggle in practice: what we learned, as we learn it. */
function LiveNotes({
  tracks,
  duplicates,
  genreCoverage,
  featureCoverage,
  nameOnly,
}: LiveNotesProps) {
  const notes: string[] = [`Analizuję ${tracks} unikalnych utworów.`];

  if (duplicates > 0) {
    notes.push(`Pominąłem ${duplicates} duplikatów (remastery, wersje radiowe).`);
  }
  if (nameOnly) {
    notes.push("Spotify nie podaje gatunków dla tej biblioteki — opieram się na wiedzy modelu.");
  } else if (genreCoverage > 0) {
    notes.push(`Gatunki znam dla ${Math.round(genreCoverage * 100)}% utworów.`);
  }
  if (featureCoverage > 0) {
    notes.push(`BPM i nastrój mam dla ${Math.round(featureCoverage * 100)}% utworów.`);
  }

  return (
    <ul className="flex flex-col gap-1 border-t border-border pt-4">
      {notes.map((note) => (
        <li key={note} className="text-xs text-muted">
          {note}
        </li>
      ))}
    </ul>
  );
}
