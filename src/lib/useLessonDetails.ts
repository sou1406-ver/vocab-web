import { useEffect, useMemo, useState } from "react";
import { buildCatalog, LESSONS, loadLessonDetails } from "@/lib/data";
import { useProfile } from "@/state/profile";

/** Loads the requested book lessons and refreshes catalog indexes afterward. */
export function useLessonDetails(lessons: readonly number[] | null = null): boolean {
  const [readyKey, setReadyKey] = useState("");
  const key = useMemo(
    () => (lessons === null ? "all" : [...new Set(lessons)].sort((a, b) => a - b).join(",")),
    [lessons],
  );

  useEffect(() => {
    let active = true;
    const requested = key === "all" ? LESSONS.map((lesson) => lesson.n) : key ? key.split(",").map(Number) : [];
    void Promise.all(requested.map(loadLessonDetails))
      .then(() => {
        if (!active) return;
        const profile = useProfile.getState();
        useProfile.setState({ catalog: buildCatalog(profile.custom) });
        setReadyKey(key);
      })
      .catch((error: unknown) => {
        console.error("Không tải được dữ liệu chi tiết từ vựng", error);
        if (active) setReadyKey(key);
      });
    return () => {
      active = false;
    };
  }, [key]);

  return readyKey === key;
}
