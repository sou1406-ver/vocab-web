import { notFound } from "next/navigation";
import { bookById } from "../../../../../data/catalog";
import { JourneyGarden } from "../../../../../features/hanh-trinh/Journey";

export function generateStaticParams() {
  return (bookById("toeic-600")?.catalog.lessons ?? []).map(({ id }) => ({ lessonId: String(id) }));
}

export default async function GardenPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const id = Number(lessonId);
  if (String(id) !== lessonId || !bookById("toeic-600")?.catalog.lessons.some((lesson) => lesson.id === id)) notFound();
  return <JourneyGarden lessonId={id} />;
}
