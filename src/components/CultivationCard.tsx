"use client";

import Link from "next/link";
import { useApp } from "../state/provider";
import { bookOfWord } from "../data/catalog";
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
          <strong>{count}</strong> từ đã học và kiểm tra · tất cả giáo trình
        </p>
        <ProgressBar value={realm.progress} label={`Tiến tới cảnh giới tiếp theo: ${Math.round(realm.progress)}%`} />
        <p className="muted">
          {realm.next === null
            ? "Đã đạt cảnh giới cao nhất. Tiếp tục ôn để nhớ vững hơn."
            : `Còn ${realm.next - count} từ để tới ${cultivationOf(realm.next).name}.`}
        </p>
      </div>
      <Link href={action.href} className="button secondary">
        {action.label}
      </Link>
    </section>
  );
}
