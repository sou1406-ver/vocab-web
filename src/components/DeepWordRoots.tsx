"use client";

import Link from "next/link";
import { findSenseMaps, findWordRoots, rootsContent } from "../data/roots";
import { affixHref } from "../data/affixes";
import type { Word } from "../domain/types";
import { PartChips } from "./PartChips";

export default function DeepWordRoots({ word }: { word: Word }) {
  const matches = findWordRoots(word);
  const senses = findSenseMaps(word);
  if (!matches.length && !senses.length) return null;
  return (
    <section className="word-roots" aria-label="Bản chất từ">
      <h3>Bản chất từ</h3>
      {matches.map((match) => (
        <div className="word-root-match" key={`${match.root.id}:${match.word.text}`}>
          <b lang="en">{match.word.text}</b>
          <PartChips
            label={match.word.text}
            parts={match.word.parts.map((part) => ({
              ...part,
              meaning: part.role === "root" ? match.root.meaning : rootsContent.affixes[part.text],
              href: part.role === "root" ? `/roots/${match.root.id}` : affixHref(part.role, part.text),
            }))}
          />
          <p className="root-logic">{match.word.logic}</p>
          <Link className="text-link" href={`/roots/${match.root.id}`}>
            Xem gốc <span lang="en">{match.root.forms.join(" / ")}</span> →
          </Link>
        </div>
      ))}
      {senses.map(({ kind, item, href }) => (
        <div className="word-root-match word-sense-map" key={`${kind}:${item.word}`}>
          <b lang="en">{item.word}</b>
          <p>
            <span className="small-label">{kind === "core" ? "Nghĩa lõi" : "Hình ảnh của giới từ"}</span> {item.core}
          </p>
          <p className="root-logic">{item.image}</p>
          <Link className="text-link" href={href}>
            Xem {item.senses.length} cách dùng của <span lang="en">{item.word}</span> →
          </Link>
        </div>
      ))}
    </section>
  );
}
