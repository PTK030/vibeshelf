"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { finishOnboarding } from "@/features/onboarding/actions";
import type { Preferences } from "@/features/onboarding/preferences";

interface PreferencesStepProps {
  preferences: Preferences;
  onChange: (next: Preferences) => void;
  onBack: () => void;
}

export function PreferencesStep({ preferences, onChange, onBack }: PreferencesStepProps) {
  const setRealtime = useCallback(
    (value: boolean) => onChange({ ...preferences, realtimeSuggestions: value }),
    [preferences, onChange],
  );
  const setDeep = useCallback(
    (value: boolean) => onChange({ ...preferences, deepAnalysis: value }),
    [preferences, onChange],
  );
  const setScoring = useCallback(
    (value: boolean) => onChange({ ...preferences, playlistScoring: value }),
    [preferences, onChange],
  );

  return (
    <div>
      <h1 className="text-xl font-bold">How should the AI work?</h1>
      <p className="mt-3 text-sm text-muted">You can change any of these later.</p>

      <div className="mt-8 flex flex-col gap-3">
        <Toggle
          checked={preferences.realtimeSuggestions}
          onChange={setRealtime}
          label="Live suggestions"
          description="Hints appear as you go while browsing your library."
        />
        <Toggle
          checked={preferences.deepAnalysis}
          onChange={setDeep}
          label="Deep track analysis"
          description="Pulls BPM, energy, mood and lyrics. More accurate sorting, but a longer run."
        />
        <Toggle
          checked={preferences.playlistScoring}
          onChange={setScoring}
          label="Playlist fit scoring"
          description="Each playlist gets a score against your taste, with a reason."
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <form action={finishOnboarding}>
          <Button type="submit" size="lg">
            Go to the library
          </Button>
        </form>
        <Button variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
