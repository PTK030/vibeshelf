"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { KeyStep } from "@/features/onboarding/key-step";
import { PreferencesStep } from "@/features/onboarding/preferences-step";
import { WelcomeStep } from "@/features/onboarding/welcome-step";
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  savePreferences,
} from "@/features/onboarding/preferences";
import { SECTION_TRANSITION } from "@/lib/motion";
import { cn } from "@/lib/cn";

const STEPS = ["welcome", "key", "preferences"] as const;
type Step = (typeof STEPS)[number];

/* Slide in from the direction of travel, so the flow feels like one line. */
const VARIANTS = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -32 : 32 }),
};

const TRANSITION = SECTION_TRANSITION;

interface OnboardingFlowProps {
  displayName: string;
  hasKey: boolean;
}

export function OnboardingFlow({ displayName, hasKey }: OnboardingFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  const goNext = useCallback(() => {
    setDirection(1);
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const handlePreferencesChange = useCallback((next: Preferences) => {
    setPreferences(next);
    savePreferences(next);
  }, []);

  const step: Step = STEPS[stepIndex] ?? "welcome";

  return (
    <div className="w-full max-w-xl">
      <StepDots total={STEPS.length} activeIndex={stepIndex} />

      <div className="relative mt-8">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={TRANSITION}
          >
            <StepBody
              step={step}
              displayName={displayName}
              hasKey={hasKey}
              preferences={preferences}
              onPreferencesChange={handlePreferencesChange}
              onNext={goNext}
              onBack={goBack}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

interface StepBodyProps {
  step: Step;
  displayName: string;
  hasKey: boolean;
  preferences: Preferences;
  onPreferencesChange: (next: Preferences) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepBody({
  step,
  displayName,
  hasKey,
  preferences,
  onPreferencesChange,
  onNext,
  onBack,
}: StepBodyProps) {
  if (step === "welcome") return <WelcomeStep displayName={displayName} onNext={onNext} />;
  if (step === "key") return <KeyStep hasKey={hasKey} onNext={onNext} onBack={onBack} />;

  return (
    <PreferencesStep preferences={preferences} onChange={onPreferencesChange} onBack={onBack} />
  );
}

interface StepDotsProps {
  total: number;
  activeIndex: number;
}

function StepDots({ total, activeIndex }: StepDotsProps) {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => index).map((index) => (
        /* Plain CSS: width is the only thing moving, and motion would mean a
           new object prop on every render. */
        <span
          key={index}
          className={cn(
            "h-1 rounded-pill transition-[width,background-color] duration-420 ease-smooth",
            index <= activeIndex ? "bg-accent" : "bg-border-strong",
            index === activeIndex ? "w-8" : "w-3",
          )}
        />
      ))}
    </div>
  );
}
