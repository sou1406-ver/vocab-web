"use client";

import Link from "next/link";
import { useApp } from "../state/provider";
import { activeBook, bookOfWord } from "../data/catalog";
import { cultivationOf, countLearnedWords } from "../domain/cultivation";
import { CultivationAvatar } from "./CultivationAvatar";
import { ProgressBar } from "../shared/ui";

export function CultivationCard({
  action = { href: "/leaderboard", label: "Bảng tu luyện" },
}: {
  action?: { href: string; label: string };
}) {
  const { data } = useApp();
  const count = countLearnedWords(data.progress, (id) => Boolean(bookOfWord(id)));
  const realm = cultivationOf(count);
  const total = activeBook(data.settings).catalog.words.length;
  return (
    <section className="panel cultivation-card" aria-labelledby="cultivation-title">
      <CultivationAvatar
        words={count}
        seed={data.settings.avatarSeed ?? (data.settings.name.trim() || "Vocab guest")}
        decorative
      />
      <div className="cultivation-card-copy">
        <p className="eyebrow">HÀNH TRÌNH TU LUYỆN</p>
        <h2 id="cultivation-title">{realm.name}</h2>
        <p>
          <strong>
            {count}/{total}
          </strong>{" "}
          đã ghi nhớ
        </p>
        <div className="cultivation-meter">
          <ProgressBar value={realm.progress} label={`Tiến tới cảnh giới tiếp theo: ${Math.round(realm.progress)}%`} />
        </div>
        <p className="muted">
          {realm.next === null
            ? "Đã đạt cảnh giới cao nhất. Tiếp tục ôn để nhớ vững hơn."
            : `Còn ${realm.next - count} từ để tới ${cultivationOf(realm.next).name}.`}
        </p>
      </div>
      <Link href={action.href} className="button primary">
        {action.label}
      </Link>
    </section>
  );
}
