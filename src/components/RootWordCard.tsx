import { PartChips } from "./PartChips";
import { RootBookBadge } from "./RootBookBadge";
import { affixHref } from "../data/affixes";
import { rootOfPart, rootsContent } from "../data/roots";
import type { RootEntry, RootWord } from "../domain/roots";

/** One analysed word: parts, the logic that joins them, and its family. `root` is set on that root's own page. */
export function RootWordCard({ word, root }: { word: RootWord; root?: RootEntry }) {
  const parts = word.parts.map((part) => {
    if (part.role !== "root")
      return { ...part, meaning: rootsContent.affixes[part.text], href: affixHref(part.role, part.text) };
    if (root) return { ...part, meaning: root.meaning };
    const owner = rootOfPart(part.text, word.text);
    return { ...part, meaning: owner?.meaning, href: owner ? `/roots/${owner.id}` : undefined };
  });
  return (
    <article className="panel root-word">
      <div className="root-word-heading">
        <div>
          <h2 lang="en">{word.text}</h2>
          <span className="pos" data-pos={word.pos}>
            {word.pos}
          </span>
        </div>
        <RootBookBadge book={word.book} />
      </div>
      <p className="root-word-meaning">{word.meaning}</p>
      <PartChips label={word.text} parts={parts} />
      <p className="root-logic">{word.logic}</p>
      {word.family.length > 0 && (
        <section className="root-word-family" aria-label={`Họ từ của ${word.text}`}>
          <h3>Họ từ</h3>
          <ul>
            {word.family.map((form, familyIndex) => (
              <li key={`${form.text}:${familyIndex}`}>
                <b lang="en">{form.text}</b>
                <span className="pos" data-pos={form.pos}>
                  {form.pos}
                </span>
                <span>{form.meaning}</span>
                <RootBookBadge book={form.book} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
