"use client";

import { lazy, Suspense } from "react";
import { useApp } from "../state/provider";
import { analyseWordParts } from "../data/word-parts";
import { affixSlug, isAffixRole } from "../data/affix-slug";
import { bookOfWord } from "../data/catalog";
import type { Word } from "../domain/types";
import { PartChips } from "./PartChips";

const DeepWordRoots = lazy(() => import("./DeepWordRoots"));
export function WordAnalysis({ word }: { word: Word }) {
  const { data } = useApp();
  const forms = analyseWordParts(word);
  const inBook = Boolean(bookOfWord(word.id));
  return (
    <>
      {forms.length > 0 && (
        <section className="word-analysis" aria-label="Phân tích từ">
          <h3>Phân tích từ</h3>
          {forms.map((form, index) => (
            <div className="word-part-form" key={`${form.text}:${index}`}>
              <b lang="en">{form.text}</b>
              <PartChips
                label={form.text}
                parts={form.parts.map((part) => ({
                  ...part,
                  // Book words built every affix page, so their chips always have a page to open.
                  href: inBook && isAffixRole(part.role) ? `/affixes/${affixSlug(part.role, part.text)}` : undefined,
                }))}
              />
            </div>
          ))}
        </section>
      )}
      {data.settings.deepRoots === true && (
        <Suspense fallback={null}>
          <DeepWordRoots word={word} />
        </Suspense>
      )}
    </>
  );
}
