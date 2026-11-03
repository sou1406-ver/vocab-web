"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { bookOfWord } from "../data/catalog";
import { useApp } from "../state/provider";
import type { Word } from "../domain/types";

/**
 * Starts a normal session with the book words a root page links to: new words are learned (and scheduled as usual),
 * and once all are learned the button offers a practice round, which never changes the review schedule.
 */
export function RootStudyButton({ wordIds, label }: { wordIds: string[]; label: string }) {
  const { data, start, busy } = useApp();
  const router = useRouter();
  const words: Word[] = wordIds.flatMap((id) => bookOfWord(id)?.catalog.words.find((word) => word.id === id) ?? []);
  if (!words.length) return null;
  const untested = words.filter((word) => !data.progress[word.id]?.tested);
  const active = data.session && data.session.phase !== "complete";
  const go = async () => {
    if (active) return router.push("/study");
    if (await start(untested.length ? untested : words, untested.length ? "learn" : "practice", label))
      router.push("/study");
  };
  return (
    <div className="root-study">
      <Button className="min-h-11" disabled={busy} onClick={() => void go()}>
        {active
          ? "Tiếp tục lượt đang học"
          : untested.length
            ? `Học ${untested.length} từ trong sách thuộc gốc này`
            : `Luyện lại ${words.length} từ trong sách thuộc gốc này`}
      </Button>
      <span className="muted">
        {untested.length ? "Học như một lượt bình thường, có lịch ôn." : "Đã học hết. Luyện thêm không đổi lịch ôn."}
      </span>
    </div>
  );
}
