"use client";

import Link from "next/link";
import { findWordRoots, rootsContent } from "../data/roots";
import type { Word } from "../domain/types";
import { PartChips } from "./PartChips";

export default function DeepWordRoots({ word }: { word: Word }) {
  const matches = findWordRoots(word);
  if (!matches.length) return null;
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
            }))}
          />
          <p className="root-logic">{match.word.logic}</p>
          <Link className="text-link" href={`/roots/${match.root.id}`}>
            Xem gốc <span lang="en">{match.root.forms.join(" / ")}</span> →
          </Link>
        </div>
      ))}
    </section>
  );
}
