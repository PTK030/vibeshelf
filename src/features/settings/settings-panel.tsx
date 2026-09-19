"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Toggle } from "@/components/ui/toggle";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  type Preferences,
  savePreferences,
} from "@/features/onboarding/preferences";
import { ProviderSection } from "@/features/settings/provider-section";
import type { ProviderId } from "@/lib/ai/providers";
import { SECTION_TRANSITION } from "@/lib/motion";

interface SettingsPanelProps {
  connected: ProviderId | undefined;
  model: string | undefined;
}

const HIDDEN = { opacity: 0, y: 10 };
const SHOWN = { opacity: 1, y: 0 };

export function SettingsPanel({ connected, model }: SettingsPanelProps) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    /* localStorage is unavailable during SSR, so this can only run after mount. */
    // eslint-disable-next-line react/set-state-in-effect
    setPreferences(loadPreferences());
  }, []);

  const update = useCallback((next: Preferences) => {
    setPreferences(next);
    savePreferences(next);
  }, []);

  const setDeep = useCallback(
    (value: boolean) => update({ ...preferences, deepAnalysis: value }),
    [preferences, update],
  );
  const setScoring = useCallback(
    (value: boolean) => update({ ...preferences, playlistScoring: value }),
    [preferences, update],
  );
  const setRealtime = useCallback(
    (value: boolean) => update({ ...preferences, realtimeSuggestions: value }),
    [preferences, update],
  );

  return (
    <motion.div
      initial={HIDDEN}
      animate={SHOWN}
      transition={SECTION_TRANSITION}
      className="flex flex-col gap-10"
    >
      <ProviderSection connected={connected} model={model} />

      <section>
        <h2 className="mb-1 text-sm font-semibold">How the AI works</h2>
        <p className="mb-4 text-xs text-muted">Changes save immediately.</p>

        <div className="flex flex-col gap-3">
          <Toggle
            checked={preferences.deepAnalysis}
            onChange={setDeep}
            label="Deep track analysis"
            description="BPM, energy and mood from ReccoBeats, plus lyrics from lyrics.ovh. More accurate, but the run takes longer."
          />
          <Toggle
            checked={preferences.playlistScoring}
            onChange={setScoring}
            label="Playlist fit scoring"
            description="Each playlist gets a score against your taste and a short reason."
          />
          <Toggle
            checked={preferences.realtimeSuggestions}
            onChange={setRealtime}
            label="Live suggestions"
            description="Show what the AI learns as it goes, instead of waiting for the end."
          />
        </div>
      </section>
    </motion.div>
  );
}
