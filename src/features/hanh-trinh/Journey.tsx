"use client";

import Link from "next/link";
import { useState } from "react";
import { Leaf } from "lucide-react";
import { bookById } from "../../data/catalog";
import { cultivationOf } from "../../domain/cultivation";
import { emptySnapshot } from "../../domain/learning";
import { learningItems, mergeReviewGroups, studyWords } from "../../domain/lexicon";
import { simulateSnapshot } from "../../domain/simulate";
import { planReviews, replaySkills, type ReviewItem } from "../../domain/skills";
import { useApp } from "../../state/provider";
import type { Snapshot, Word } from "../../domain/types";
import { JourneyRound } from "./JourneyRound";
import sheet10 from "./art/source/10.png";
import sheet20 from "./art/source/20.png";
import sheet30 from "./art/source/30.png";
import sheet35 from "./art/source/35.png";

const journeyPath = "/prototype/hanh-trinh";
const catalog = bookById("toeic-600")!.catalog;

function planted(word: Word, progress: Snapshot["progress"]) {
  return learningItems(word).every(({ id }) => progress[id]?.tested);
}

function useJourney() {
  const app = useApp();
  const all = studyWords(catalog.words);
  const byId = new Map(all.map((word) => [word.id, word]));
  const skills = replaySkills(app.data.events, app.data.settings.timezone);
  const plan = planReviews(app.data.progress, skills, byId.keys(), app.clock, app.data.settings.timezone);
  const { due, extra } = mergeReviewGroups(plan.due, plan.extra, all);
  const byPlant = new Map(due.map((item) => [byId.get(item.wordId)?.groupWordId ?? item.wordId, item]));
  const water = (items: ReviewItem[], title: string) =>
    app.startReview(
      items.flatMap(({ wordId, skill }) => {
        const word = byId.get(wordId);
        return word ? [{ word, skill }] : [];
      }),
      title,
    );
  return { ...app, all, skills, due, extra, byPlant, water };
}

const sheets = [sheet10, sheet20, sheet30, sheet35];

function Plant({ index, thirsty }: { index: number; thirsty: boolean }) {
  const position = index % 35;
  const sheet = Math.floor(position / 10);
  const row = position % 10 >= 5;
  return (
    <span
      className={`journey-plant${thirsty ? " is-thirsty" : ""}`}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${sheets[sheet].src})`,
        backgroundSize: `500% ${sheet === 3 ? "100%" : "200%"}`,
        backgroundPosition: `${(position % 5) * 25}% ${row ? 100 : 0}%`,
      }}
    />
  );
}

export function JourneyMap() {
  const { data, ready, busy, change, dismissBreakthrough, all, due, extra, byPlant, water } = useJourney();
  const active = Boolean(data.session && data.session.phase !== "complete");
  const count = catalog.words.filter((word) => planted(word, data.progress)).length;
  const healthy = catalog.words.filter((word) => planted(word, data.progress) && !byPlant.has(word.id)).length;
  const scenario = (withThirstyPlants: boolean) => {
    dismissBreakthrough();
    void change((snapshot) =>
      withThirstyPlants
        ? simulateSnapshot(snapshot.settings, catalog, { learned: 4, due: 2, introducedToday: 0, streak: 0 })
        : emptySnapshot(),
    );
  };
  return (
    <div className="page journey-v2">
      <header className="journey-heading">
        <h1 tabIndex={-1}>Hành trình Luyện đan sư</h1>
        <p>
          {cultivationOf(count).name} · {healthy} cây khỏe
        </p>
      </header>
      <section className="journey-tools" aria-label="Dữ liệu thử">
        <p className="muted">Dữ liệu thử sẽ đặt lại khi tải lại trang.</p>
        <button className="button secondary" disabled={!ready || busy || active} onClick={() => scenario(false)}>
          Vườn trống
        </button>
        <button className="button secondary" disabled={!ready || busy || active} onClick={() => scenario(true)}>
          Vườn có cây khát
        </button>
        <button
          className="button primary"
          disabled={!ready || busy || active || !due.length}
          onClick={() => void water([...due.slice(0, 20), ...extra.slice(0, 3)], "Bình tưới chung")}
        >
          Bình tưới chung ({due.length})
        </button>
      </section>
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
      <JourneyRound words={all} backLabel="Về bản đồ" />
    </div>
  );
}

export function JourneyGarden({ lessonId }: { lessonId: number }) {
  const { data, ready, busy, all, skills, start, byPlant, water } = useJourney();
  const lesson = catalog.lessons.find(({ id }) => id === lessonId)!;
  const words = catalog.words.filter((word) => word.lesson === lessonId);
  const active = Boolean(data.session && data.session.phase !== "complete");
  const [selected, setSelected] = useState<Word | null>(null);
  const plantedCount = words.filter((word) => planted(word, data.progress)).length;
  return (
    <div className="page journey-v2">
      <Link className="journey-back" href={journeyPath}>
        ← Bản đồ hành trình
      </Link>
      <h1 tabIndex={-1}>Vườn {lesson.title}</h1>
      <p className="page-subtitle">
        {plantedCount}/{words.length} đã trồng
      </p>
      <div className="journey-field">
        {Array.from({ length: Math.ceil(words.length / 4) }, (_, bed) => {
          const row = words.slice(bed * 4, bed * 4 + 4);
          const unplanted = row.filter((word) => !planted(word, data.progress));
          const sow = () => {
            setSelected(null);
            void start(unplanted, "learn", `Gieo luống ${bed + 1}`);
          };
          return (
            <section className="journey-bed-row" key={bed} aria-label={`Luống ${bed + 1}`}>
              <ol className="journey-bed">
                {row.map((word, position) => {
                  const grown = planted(word, data.progress);
                  const thirsty = grown ? byPlant.get(word.id) : undefined;
                  return (
                    <li key={word.id}>
                      <button
                        aria-label={`${thirsty ? "Tưới" : grown ? "Xem" : "Gieo"} ${word.text}`}
                        disabled={!ready || busy || active}
                        onClick={() => {
                          if (thirsty) {
                            setSelected(null);
                            void water([thirsty], `Tưới ${word.text}`);
                          } else if (grown) setSelected(word);
                          else sow();
                        }}
                      >
                        {grown ? (
                          <Plant index={(lessonId - 1) * 12 + bed * 4 + position} thirsty={Boolean(thirsty)} />
                        ) : (
                          <span className="journey-soil" aria-hidden="true" />
                        )}
                        <span lang="en">{word.text}</span>
                        {thirsty && <small>Đang khát</small>}
                      </button>
                    </li>
                  );
                })}
              </ol>
              {unplanted.length > 0 ? (
                <button className="text-link journey-sow" disabled={!ready || busy || active} onClick={sow}>
                  Gieo luống {bed + 1}
                </button>
              ) : (
                <p className="journey-bed-done">
                  <Leaf size={16} aria-hidden="true" /> Luống đã trồng đủ
                </p>
              )}
            </section>
          );
        })}
      </div>
      {selected && (
        <section className="panel journey-details" aria-label="Chi tiết cây">
          <h2 lang="en">{selected.text}</h2>
          <p>
            {selected.meaning} <span lang="en">{selected.ipa}</span>
          </p>
          {learningItems(selected).map((item) => (
            <p key={item.id}>
              {item.meaning} · Nhận biết {skills[item.id]?.recognition?.box ?? "—"} · Tự nhớ{" "}
              {skills[item.id]?.recall?.box ?? "—"}
            </p>
          ))}
          <button className="text-link" onClick={() => setSelected(null)}>
            Đóng
          </button>
        </section>
      )}
      <JourneyRound words={all} backLabel="Về vườn" />
    </div>
  );
}
