"use client";

import { useCallback } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
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
      <h1 className="text-xl font-black">Jak ma pracować AI?</h1>
      <p className="mt-3 text-sm text-muted">Każde z tych ustawień zmienisz później.</p>

      <div className="mt-8 flex flex-col gap-3">
        <Toggle
          checked={preferences.realtimeSuggestions}
          onChange={setRealtime}
          label="Sugestie na żywo"
          description="Podpowiedzi pojawiają się na bieżąco, gdy przeglądasz bibliotekę."
        />
        <Toggle
          checked={preferences.deepAnalysis}
          onChange={setDeep}
          label="Głęboka analiza utworów"
          description="Dociąga BPM, energię i nastrój oraz teksty. Dokładniejsze sortowanie, ale przebieg trwa dłużej."
        />
        <Toggle
          checked={preferences.playlistScoring}
          onChange={setScoring}
          label="Ocena dopasowania playlist"
          description="Każda playlista dostaje wynik zgodności z Twoim gustem wraz z uzasadnieniem."
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/biblioteka" size="lg">
          Przejdź do biblioteki
        </ButtonLink>
        <Button variant="ghost" size="lg" onClick={onBack}>
          Wstecz
        </Button>
      </div>
    </div>
  );
}
