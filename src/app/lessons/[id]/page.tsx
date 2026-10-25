import { notFound } from "next/navigation";
import Lessons from "../../../features/Lessons";
import { catalog } from "../../../data/catalog";
import { LocalReady } from "../../LocalReady";
export const metadata = { title: "Bài học", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!catalog.lessons.some((l) => String(l.id) === id)) notFound();
  return (
    <LocalReady>
      <Lessons lessonId={id} />
    </LocalReady>
  );
}
