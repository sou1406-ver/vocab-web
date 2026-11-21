"use client";

import Link from "next/link";
import { bookById } from "../../data/catalog";
import { useApp } from "../../state/provider";
import type { Snapshot, Word } from "../../domain/types";

const journeyPath = "/prototype/hanh-trinh";
const catalog = bookById("toeic-600")!.catalog;

function planted(word: Word, progress: Snapshot["progress"]) {
  return word.learningItems?.length
    ? word.learningItems.every(({ id }) => progress[id]?.tested)
    : Boolean(progress[word.id]?.tested);
}

export function JourneyMap() {
  const { data } = useApp();
  return (
    <div className="page journey-v2">
      <h1>Hành trình Luyện đan sư</h1>
      <p className="page-subtitle">Bản thử · Bản đồ vườn linh thảo</p>
      <ol className="journey-regions" aria-label="Vùng đất">
        {catalog.topics.map((topic, index) => (
          <li key={topic.id}>
            <details open={index === 0}>
              <summary>{topic.title}</summary>
              <ol className="journey-gardens">
                {catalog.lessons
                  .filter(({ topicId }) => topicId === topic.id)
                  .map((lesson) => {
                    const words = catalog.words.filter((word) => word.lesson === lesson.id);
                    return (
                      <li key={lesson.id}>
                        <Link href={`${journeyPath}/vuon/${lesson.id}`}>
                          <span>{lesson.title}</span>
                          <small>
                            {words.filter((word) => planted(word, data.progress)).length}/{words.length} đã trồng
                          </small>
                        </Link>
                      </li>
                    );
                  })}
              </ol>
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function JourneyGarden({ lessonId }: { lessonId: number }) {
  const { data } = useApp();
  const lesson = catalog.lessons.find(({ id }) => id === lessonId)!;
  const words = catalog.words.filter((word) => word.lesson === lessonId);
  return (
    <div className="page journey-v2">
      <Link className="journey-back" href={journeyPath}>
        ← Bản đồ hành trình
      </Link>
      <h1>Vườn {lesson.title}</h1>
      <p className="page-subtitle">
        {words.filter((word) => planted(word, data.progress)).length}/{words.length} đã trồng
      </p>
      <div className="journey-field">
        {Array.from({ length: Math.ceil(words.length / 4) }, (_, bed) => (
          <ol aria-label={`Luống ${bed + 1}`} className="journey-bed" key={bed}>
            {words.slice(bed * 4, bed * 4 + 4).map((word) => (
              <li key={word.id}>
                <span className="journey-soil" aria-hidden="true" />
                <span lang="en">{word.text}</span>
              </li>
            ))}
          </ol>
        ))}
      </div>
    </div>
  );
}
