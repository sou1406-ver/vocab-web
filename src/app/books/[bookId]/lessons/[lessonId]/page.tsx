import { notFound } from "next/navigation";
import Lessons from "../../../../../features/Lessons";
import { bookById, books } from "../../../../../data/catalog";
import { LocalReady } from "../../../../LocalReady";
export const metadata = { title: "Bài học", robots: { index: false, follow: false } };
export const dynamicParams = false;
export function generateStaticParams() {
  return books.flatMap((book) =>
    book.catalog.lessons.map((lesson) => ({ bookId: book.id, lessonId: String(lesson.id) })),
  );
}
export default async function Page({ params }: { params: Promise<{ bookId: string; lessonId: string }> }) {
  const { bookId, lessonId } = await params;
  const book = bookById(bookId);
  if (!book?.catalog.lessons.some((l) => String(l.id) === lessonId)) notFound();
  return (
    <LocalReady>
      <Lessons bookId={book.id} lessonId={lessonId} />
    </LocalReady>
  );
}
