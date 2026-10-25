"use client";
import type { ReactNode } from "react";
import { useWord } from "../../app/context";
import type { Word } from "../../domain/types";

export function VocabularyTerm({ word, label, children }: { word: Word; label: string; children: ReactNode }) {
  const inspect = useWord();
  return (
    <button
      type="button"
      className="vocabulary-term"
      lang="en"
      aria-label={`Tra ${label}`}
      onClick={() => inspect(word)}
    >
      {children}
    </button>
  );
}
