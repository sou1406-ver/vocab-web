"use client";

import { useMemo } from "react";
import { useApp } from "../state/provider";
import { statusOf } from "../domain/learning";
import { isStable, isWordStable, replaySkills } from "../domain/skills";
import { statusTone } from "./ui";
import { latestSenseOutcome } from "../domain/sense-check";
import { bookOfWord } from "../data/catalog";

/** Status badge for word lists, using the two-skill rule for "Nhớ ổn định" (same as the Progress page). */
export function useStatusBadge() {
  const { data } = useApp();
  const replayed = useMemo(
    () => replaySkills(data.events, data.settings.timezone),
    [data.events, data.settings.timezone],
  );
  return (wordId: string) => {
    const progress = data.progress[wordId];
    const word = bookOfWord(wordId)?.catalog.words.find((item) => item.id === (progress?.groupWordId ?? wordId));
    const outcome = latestSenseOutcome(data.events, progress?.groupWordId ?? wordId);
    if (outcome && outcome !== "passed")
      return (
        <span className="status-badge started">
          {outcome === "unlearned"
            ? "Chưa thuộc"
            : outcome === "unintroduced"
              ? "Còn nghĩa chưa học"
              : "Đang kiểm tra nghĩa"}
        </span>
      );
    if (progress?.tested && word?.learningItems?.some((item) => !data.progress[item.id]?.tested))
      return <span className="status-badge started">Còn nghĩa chưa học</span>;
    const stable = progress?.tested
      ? word
        ? isWordStable(word, data.progress, replayed)
        : isStable(replayed[wordId], progress.box)
      : undefined;
    return <span className={statusTone(progress, stable)}>{statusOf(progress, stable)}</span>;
  };
}
