"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Droplet, Leaf, Plus } from "lucide-react";
import { bookById } from "../../data/catalog";
import { cultivationOf } from "../../domain/cultivation";
import { dayKey, emptySnapshot } from "../../domain/learning";
import { learningItems, mergeReviewGroups, studyWords } from "../../domain/lexicon";
import { simulateSnapshot } from "../../domain/simulate";
import { planReviews, replaySkills, type ReviewItem } from "../../domain/skills";
import { schedulesAnswer } from "../../domain/sense-check";
import { SandboxProvider, useApp } from "../../state/provider";
import type { AnswerEvent, Snapshot, Word } from "../../domain/types";
import { JourneyRound } from "./JourneyRound";
import { healthLabels, plantHealth, plantStage, stageLabels, type PlantHealth, type PlantStage } from "./garden-state";
import sheet10 from "./art/source/10.png";
import sheet20 from "./art/source/20.png";
import sheet30 from "./art/source/30.png";
import sheet35 from "./art/source/35.png";

const journeyPath = "/prototype/hanh-trinh";
const catalog = bookById("toeic-600")!.catalog;
const contracts = catalog.words.filter((word) => word.lesson === 1);

function plantedPreset(settings: Snapshot["settings"]) {
  const snapshot = simulateSnapshot(settings, catalog, { learned: 4, due: 2, introducedToday: 0, streak: 0 });
  const first = snapshot.progress[contracts[0].id];
  first.dueAt -= 3 * 86_400_000;
  return snapshot;
}

export function JourneySandbox({ children }: { children: ReactNode }) {
  const [initial] = useState(() => plantedPreset(emptySnapshot().settings));
  return <SandboxProvider initial={initial}>{children}</SandboxProvider>;
}

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
  const lastCare = new Map<string, AnswerEvent>();
  for (const event of app.data.events) {
    if (event.mode !== "review" || !schedulesAnswer(event)) continue;
    const id = byId.get(event.wordId)?.groupWordId ?? event.wordId;
    if (event.at >= (lastCare.get(id)?.at ?? 0)) lastCare.set(id, event);
  }
  const healthOf = (id: string) =>
    plantHealth(byPlant.get(id)?.dueAt, lastCare.get(id), app.clock, app.data.settings.timezone);
  const wateredToday = (id: string) => {
    const latest = lastCare.get(id);
    return Boolean(
      latest?.correct &&
        healthOf(id) === "healthy" &&
        dayKey(latest.at, app.data.settings.timezone) === dayKey(app.clock, app.data.settings.timezone),
    );
  };
  const stageOf = (word: Word) =>
    plantStage(
      learningItems(word).map(({ id }) => ({
        recognition: skills[id]?.recognition?.box ?? 0,
        recall: skills[id]?.recall?.box ?? 0,
      })),
    );
  const water = (items: ReviewItem[], title: string) =>
    app.startReview(
      items.flatMap(({ wordId, skill }) => {
        const word = byId.get(wordId);
        return word ? [{ word, skill }] : [];
      }),
      title,
    );
  return { ...app, all, skills, due, extra, byPlant, healthOf, wateredToday, stageOf, water };
}

const sheets = [sheet10, sheet20, sheet30, sheet35];

function Plant({
  index,
  health,
  stage,
  watered,
}: {
  index: number;
  health: PlantHealth;
  stage?: PlantStage;
  watered?: boolean;
}) {
  const position = index % 35;
  const sheet = Math.floor(position / 10);
  const row = position % 10 >= 5;
  return (
    <span
      className="journey-plant"
      data-health={health}
      data-stage={stage}
      data-watered={watered || undefined}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${sheets[sheet].src})`,
        aspectRatio: sheet === 3 ? "3 / 5" : "4 / 5",
        backgroundSize: `500% ${sheet === 3 ? "100%" : "200%"}`,
        backgroundPosition: `${(position % 5) * 25}% ${row ? 100 : 0}%`,
      }}
    />
  );
}

export function JourneyMap() {
  const { data, ready, busy, change, dismissBreakthrough, all, due, extra, healthOf, wateredToday, water } =
    useJourney();
  const active = Boolean(data.session && data.session.phase !== "complete");
  const count = catalog.words.filter((word) => planted(word, data.progress)).length;
  const healthy = catalog.words.filter(
    (word) => planted(word, data.progress) && healthOf(word.id) === "healthy",
  ).length;
  const plantedContracts = contracts.filter((word) => planted(word, data.progress));
  const preview = [...plantedContracts, ...contracts.filter((word) => !planted(word, data.progress))].slice(0, 4);
  const complete = plantedContracts.length === contracts.length;
  const scenario = (withThirstyPlants: boolean) => {
    dismissBreakthrough();
    void change((snapshot) => (withThirstyPlants ? plantedPreset(snapshot.settings) : emptySnapshot()));
  };
  return (
    <div className="page journey-v2">
      <header className="journey-heading">
        <h1 tabIndex={-1}>Hành trình Luyện đan sư</h1>
        <p>
          {cultivationOf(count).name} · {healthy} cây khỏe
        </p>
      </header>
      <Link className="journey-featured" data-complete={complete} href={`${journeyPath}/vuon/1`}>
        <div className="journey-featured-art" aria-hidden="true">
          {preview.map((word) => (
            <span className="journey-featured-slot" key={word.id}>
              {planted(word, data.progress) ? (
                <>
                  <Plant index={contracts.indexOf(word)} health={healthOf(word.id)} watered={wateredToday(word.id)} />
                  {healthOf(word.id) !== "healthy" && <Droplet className="journey-preview-drop" />}
                </>
              ) : (
                <span className="journey-soil" />
              )}
            </span>
          ))}
        </div>
        <div className="journey-featured-caption">
          <div>
            <h2>Vườn Contracts</h2>
            <p>
              {plantedContracts.length}/{contracts.length} đã trồng{complete && " · Vườn hoàn thành"}
            </p>
          </div>
          <span className="journey-enter">
            Vào vườn <ArrowRight size={19} aria-hidden="true" />
          </span>
        </div>
      </Link>
      <section className="journey-tools" aria-label="Dữ liệu thử">
        <p className="muted">Vườn thử sẽ trở về trạng thái ban đầu khi tải lại.</p>
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
                  .filter(({ id, topicId }) => id !== 1 && topicId === topic.id)
                  .map((lesson) => {
                    const words = catalog.words.filter((word) => word.lesson === lesson.id);
                    const plantedCount = words.filter((word) => planted(word, data.progress)).length;
                    return (
                      <li key={lesson.id}>
                        <Link href={`${journeyPath}/vuon/${lesson.id}`}>
                          <span>{lesson.title}</span>
                          <small>
                            {plantedCount}/{words.length} đã trồng{plantedCount === words.length && " · Hoàn thành"}
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
  const { data, ready, busy, all, skills, start, byPlant, healthOf, stageOf, wateredToday, water } = useJourney();
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
        {plantedCount}/{words.length} đã trồng{plantedCount === words.length && " · Vườn hoàn thành"}
      </p>
      <div className="journey-planting-progress" aria-hidden="true">
        {words.map((word) => (
          <span key={word.id} data-planted={planted(word, data.progress)} />
        ))}
      </div>
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
                  const health = grown ? healthOf(word.id) : undefined;
                  const watered = grown && wateredToday(word.id);
                  return (
                    <li key={word.id}>
                      <button
                        className="journey-plot"
                        data-state={thirsty ? "thirsty" : grown ? "planted" : "empty"}
                        data-health={health}
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
                        <span className="journey-plot-art" aria-hidden="true">
                          {grown ? (
                            <Plant
                              index={(lessonId - 1) * 12 + bed * 4 + position}
                              health={health!}
                              stage={stageOf(word)}
                              watered={watered}
                            />
                          ) : (
                            <span className="journey-soil">
                              <Plus size={16} strokeWidth={1.8} />
                            </span>
                          )}
                        </span>
                        <span className="journey-word" lang="en">
                          {word.text}
                        </span>
                        <small className="journey-plot-action">
                          {thirsty ? (
                            <>
                              <Droplet size={13} aria-hidden="true" /> Tưới
                            </>
                          ) : grown ? (
                            "Xem cây"
                          ) : (
                            "Gieo"
                          )}
                        </small>
                        {grown && (
                          <small className="journey-plot-health">
                            {watered ? "Đã tưới hôm nay" : healthLabels[health!]}
                          </small>
                        )}
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
            {stageLabels[stageOf(selected)]} · {healthLabels[healthOf(selected.id)]}
          </p>
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
