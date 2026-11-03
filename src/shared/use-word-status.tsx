"use client";

import { useMemo } from "react";
import { useApp } from "../state/provider";
import { statusOf } from "../domain/learning";
import { isStable, replaySkills } from "../domain/skills";
import { statusTone } from "./ui";

/** Status label and tone for word lists, using the two-skill rule for "Nhớ ổn định" (same as the Progress page). */
export function useWordStatus() {
  const { data } = useApp();
  const replayed = useMemo(
    () => replaySkills(data.events, data.settings.timezone),
    [data.events, data.settings.timezone],
  );
  return (wordId: string) => {
    const progress = data.progress[wordId];
    const stable = progress?.tested ? isStable(replayed[wordId], progress.box) : undefined;
    return { label: statusOf(progress, stable), tone: statusTone(progress, stable) };
  };
}
