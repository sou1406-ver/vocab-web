import Link from "next/link";
import { bookOfWord } from "../data/catalog";
import type { RootBookLink } from "../domain/roots";

export function RootBookBadge({ book }: { book?: RootBookLink }) {
  const owner = book ? bookOfWord(book.wordId) : undefined;
  const word = owner?.catalog.words.find((entry) => entry.id === book?.wordId);
  return owner && word ? (
    <Link className="root-book-badge" href={`/books/${owner.id}/lessons/${word.lesson}`} title={owner.shortTitle}>
      Trong sách · Bài {word.lesson}
    </Link>
  ) : (
    <span className="root-expansion-badge">Mở rộng</span>
  );
}
