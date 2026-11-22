"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Droplet, Leaf, Plus, X } from "lucide-react";
import { CultivationAvatar } from "../../components/CultivationAvatar";
import { bookById } from "../../data/catalog";
import { cultivationOf, cultivationRealms } from "../../domain/cultivation";
import { dayKey, emptySnapshot, INTERVALS, nextDue } from "../../domain/learning";
import { learningItems, mergeReviewGroups, studyWords } from "../../domain/lexicon";
import { simulateSnapshot } from "../../domain/simulate";
import { planReviews, replaySkills, type ReviewItem } from "../../domain/skills";
import { schedulesAnswer } from "../../domain/sense-check";
import { SandboxProvider, useApp } from "../../state/provider";
import type { AnswerEvent, Snapshot, Topic, Word } from "../../domain/types";
import { JourneyRound } from "./JourneyRound";
import { healthLabels, plantHealth, plantStage, stageLabels, type PlantHealth, type PlantStage } from "./garden-state";
import { plantSprite } from "./art/plant-sprites";
import firstRegionMap from "./art/web/map-kinh-doanh.webp";

const journeyPath = "/prototype/hanh-trinh";
const catalog = bookById("toeic-600")!.catalog;
const contracts = catalog.words.filter((word) => word.lesson === 1);
const firstRegion = catalog.topics[0];
const firstRegionLessons = catalog.lessons.filter((lesson) => lesson.topicId === firstRegion.id);
// Plot centers on the map, from the lowest clearing to the highest.
const paintedStops = [
  { left: "29%", top: "72.5%" },
  { left: "72%", top: "59.5%" },
  { left: "26%", top: "48%" },
  { left: "72%", top: "34.3%" },
  { left: "26%", top: "25.7%" },
];
const firstTrial = cultivationRealms[1];
const sharedWatering = "Bình tưới chung";

function seedMaturePlants(snapshot: Snapshot, items: readonly Word[], at: number) {
  const { timezone } = snapshot.settings;
  const learnAt = at - 6 * 86_400_000;
  const firstReview = nextDue(learnAt, INTERVALS[0], timezone);
  const nextReview = nextDue(firstReview, INTERVALS[1], timezone);
  const days = [learnAt, firstReview, nextReview].map((time) => ({ at: time, day: dayKey(time, timezone) }));
  for (const { id: wordId } of items) {
    for (const questionKind of ["meaning", "recall"] as const) {
      days.forEach((date, index) => {
        const sessionId = `demo-growth-${snapshot.events.length}`;
        snapshot.events.push({
          id: `${sessionId}:0`,
          sessionId,
          wordId,
          ...date,
          questionKind,
          mode: index === 0 ? "learn" : "review",
          correct: true,
          assisted: false,
        });
      });
    }
  }
}

function demoPreset(settings: Snapshot["settings"], words: Word[], due: number, mature = false) {
  const at = Date.now();
  const items = studyWords(words);
  const snapshot = simulateSnapshot(
    settings,
    { ...catalog, words: items },
    {
      learned: items.length,
      due,
      introducedToday: 0,
      streak: 0,
    },
    at,
  );
  for (const item of items) {
    if (item.groupWordId && item.groupWordId !== item.id) snapshot.progress[item.id].groupWordId = item.groupWordId;
  }
  if (mature) seedMaturePlants(snapshot, items.slice(due), at);
  return snapshot;
}

function plantedPreset(settings: Snapshot["settings"]) {
  const snapshot = demoPreset(settings, contracts.slice(0, 4), 2, true);
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
  const waterShared = () => water([...due.slice(0, 20), ...extra.slice(0, 3)], sharedWatering);
  const session = app.data.session;
  const completedWatering = session?.phase === "complete" && session.title === sharedWatering ? session.id : undefined;
  const recovered = (id: string) =>
    Boolean(completedWatering && lastCare.get(id)?.sessionId === completedWatering && wateredToday(id));
  return {
    ...app,
    all,
    skills,
    due,
    byPlant,
    healthOf,
    wateredToday,
    stageOf,
    water,
    waterShared,
    recovered,
    completedWatering,
  };
}

function Plant({
  index,
  health,
  stage,
  watered,
  sprouting,
  recovered,
}: {
  index: number;
  health: PlantHealth;
  stage?: PlantStage;
  watered?: boolean;
  sprouting?: boolean;
  recovered?: boolean;
}) {
  return (
    <span
      className="journey-plant"
      data-health={health}
      data-stage={stage}
      data-watered={watered || undefined}
      data-sprouting={sprouting || undefined}
      data-recovered={recovered || undefined}
      aria-hidden="true"
      style={plantSprite(index, stage)}
    />
  );
}

export function JourneyMap() {
  const journey = useJourney();
  const { data, ready, busy, change, dismissBreakthrough, all, due, waterShared } = journey;
  const [region, setRegion] = useState<string | null>(null);
  const [trial, setTrial] = useState(false);
  const tools = useRef<HTMLDetailsElement>(null);
  const active = Boolean(data.session && data.session.phase !== "complete");
  const count = catalog.words.filter((word) => planted(word, data.progress)).length;
  const healthy = catalog.words.filter(
    (word) => planted(word, data.progress) && journey.healthOf(word.id) === "healthy",
  ).length;
  const currentGarden = catalog.lessons.find((lesson) =>
    catalog.words.some((word) => word.lesson === lesson.id && !planted(word, data.progress)),
  );
  const openRegion = region ?? currentGarden?.topicId ?? firstRegion.id;
  const scrollTarget = useRef<string | null>(null);
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ready) return;
    const target = region ? `region-${openRegion}` : currentGarden ? `garden-${currentGarden.id}` : "journey-furnace";
    if (scrollTarget.current === target) return;
    scrollTarget.current = target;
    scene.current?.querySelector(`#${CSS.escape(target)}`)?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [ready, region, openRegion, currentGarden]);

  const scenario = (preset: "empty" | "thirsty" | "complete" | "trial") => {
    dismissBreakthrough();
    if (tools.current) {
      tools.current.open = false;
      tools.current.querySelector("summary")?.focus({ preventScroll: true });
    }
    setRegion(null);
    scrollTarget.current = null;
    void change((snapshot) => {
      const { settings } = snapshot;
      if (preset === "empty") return { ...emptySnapshot(), settings };
      if (preset === "thirsty") return plantedPreset(settings);
      if (preset === "trial") return demoPreset(settings, contracts.slice(0, firstTrial.words), 3);
      const lessons = new Set(firstRegionLessons.map(({ id }) => id));
      return demoPreset(
        settings,
        catalog.words.filter((word) => lessons.has(word.lesson)),
        18,
        true,
      );
    });
  };
  const beginWatering = () => {
    setTrial(false);
    void waterShared();
  };

  return (
    <div className="page journey-v2 journey-map" ref={scene} data-app-ready={ready}>
      <header className="journey-heading">
        <h1 tabIndex={-1}>Hành trình Luyện đan sư</h1>
        <p>
          {cultivationOf(count).name} · {healthy} cây khỏe
        </p>
      </header>
      <div className="journey-map-scene">
        <section className="journey-expeditions" aria-label="Vùng đất">
          {catalog.topics
            .slice(1)
            .reverse()
            .map((topic) => {
              const open = openRegion === topic.id;
              return (
                <section key={topic.id} className="journey-expedition">
                  <button
                    type="button"
                    id={`region-${topic.id}`}
                    className="journey-region"
                    aria-expanded={open}
                    disabled={!ready}
                    onClick={() => setRegion(open && region === topic.id ? firstRegion.id : topic.id)}
                  >
                    <span>{topic.title}</span>
                    <small>{open ? "Đang khám phá" : "Chưa khám phá"}</small>
                    <ArrowUpRight size={19} aria-hidden="true" />
                  </button>
                  {open && <JourneyTrail topic={topic} journey={journey} currentId={currentGarden?.id} count={count} />}
                </section>
              );
            })}
        </section>
        <JourneyTrail
          topic={firstRegion}
          journey={journey}
          currentId={currentGarden?.id}
          count={count}
          onFurnace={() => setTrial(true)}
        />
      </div>
      <div className="journey-map-controls">
        <details className="journey-tools" ref={tools}>
          <summary>Dữ liệu thử</summary>
          <div>
            <p className="muted">Demo đặt lại khi tải trang.</p>
            <button className="button secondary" disabled={!ready || busy || active} onClick={() => scenario("empty")}>
              Vườn trống
            </button>
            <button
              className="button secondary"
              disabled={!ready || busy || active}
              onClick={() => scenario("thirsty")}
            >
              Vườn có cây khát
            </button>
            <button
              className="button secondary"
              disabled={!ready || busy || active}
              onClick={() => scenario("complete")}
            >
              Xong vùng 1 · nhiều cây khát
            </button>
            <button className="button secondary" disabled={!ready || busy || active} onClick={() => scenario("trial")}>
              Đủ ngưỡng Kiếp nạn
            </button>
          </div>
        </details>
        <button
          className="button primary journey-canteen"
          disabled={!ready || busy || active || !due.length}
          onClick={beginWatering}
        >
          <Droplet size={17} aria-hidden="true" /> Bình tưới chung ({due.length})
        </button>
      </div>
      {trial && <TrialDialog count={count} due={due.length} onWater={beginWatering} onClose={() => setTrial(false)} />}
      <JourneyRound words={all} backLabel="Về bản đồ" />
    </div>
  );
}

function JourneyTrail({
  topic,
  journey,
  currentId,
  count,
  onFurnace,
}: {
  topic: Topic;
  journey: ReturnType<typeof useJourney>;
  currentId?: number;
  count: number;
  onFurnace?: () => void;
}) {
  const { data, healthOf, recovered, completedWatering, stageOf, ready } = journey;
  const gardens = catalog.lessons
    .filter(({ topicId }) => topicId === topic.id)
    .map((lesson) => ({
      lesson,
      words: catalog.words.filter((word) => word.lesson === lesson.id),
    }));
  const complete = gardens.filter(({ words }) => words.every((word) => planted(word, data.progress))).length;
  const hasFurnace = Boolean(onFurnace);
  const scene = topic.id === firstRegion.id ? firstRegionMap : undefined;
  const trailName = `Đường qua vùng ${topic.title}`;
  return (
    <section
      className="journey-trail"
      aria-label={trailName}
      id={hasFurnace ? `region-${topic.id}` : undefined}
      data-painted={scene ? true : undefined}
      style={scene && { backgroundImage: `url(${scene.src})`, aspectRatio: `${scene.width} / ${scene.height}` }}
    >
      {onFurnace && (
        <button
          type="button"
          className="journey-furnace"
          id="journey-furnace"
          data-complete={complete === gardens.length}
          disabled={!ready}
          onClick={onFurnace}
        >
          <strong>Lò đan</strong>
          <span>
            {complete}/{gardens.length} vườn hoàn thành
          </span>
          {count >= firstTrial.words && <small>Kiếp nạn sẵn sàng</small>}
        </button>
      )}
      {gardens
        .slice()
        .reverse()
        .map(({ lesson, words }, index) => {
          const grown = words.filter((word) => planted(word, data.progress));
          const recovering = grown.filter((word) => recovered(word.id));
          const preview = [
            ...recovering,
            ...grown.filter((word) => !recovered(word.id)),
            ...(scene ? [] : words.filter((word) => !planted(word, data.progress))),
          ].slice(0, 4);
          const current = currentId === lesson.id && ready;
          return (
            <div
              className="journey-stop"
              key={lesson.id}
              id={`garden-${lesson.id}`}
              data-current={current || undefined}
              style={scene && paintedStops[gardens.length - 1 - index]}
            >
              <Link
                className="journey-garden-stop"
                href={`${journeyPath}/vuon/${lesson.id}`}
                data-complete={grown.length === words.length}
                data-recovered={recovering.length > 0 || undefined}
                aria-current={current ? "step" : undefined}
              >
                <div className="journey-garden-preview" aria-hidden="true" hidden={Boolean(scene && !grown.length)}>
                  {preview.map((word) => {
                    const revived = recovered(word.id);
                    const health = healthOf(word.id);
                    return (
                      <span className="journey-preview-spot" key={word.id}>
                        {planted(word, data.progress) ? (
                          <>
                            <Plant
                              key={revived ? completedWatering : "rest"}
                              index={(lesson.id - 1) * 12 + words.indexOf(word)}
                              health={health}
                              stage={stageOf(word)}
                              recovered={revived}
                            />
                            {health !== "healthy" && <Droplet className="journey-preview-drop" />}
                          </>
                        ) : (
                          <span className="journey-soil" />
                        )}
                      </span>
                    );
                  })}
                </div>
                <span className="journey-stop-caption">
                  <strong>{lesson.title}</strong>
                  <small>
                    {grown.length}/{words.length}
                    {grown.length === words.length && " · Hoàn thành"}
                  </small>
                </span>
              </Link>
              {current && (
                <span className="journey-map-avatar">
                  <CultivationAvatar words={count} />
                </span>
              )}
            </div>
          );
        })}
      {hasFurnace && <p className="journey-trail-start">{topic.title}</p>}
    </section>
  );
}

function TrialDialog({
  count,
  due,
  onWater,
  onClose,
}: {
  count: number;
  due: number;
  onWater: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const ready = count >= firstTrial.words;
  return (
    <dialog
      ref={ref}
      className="journey-dialog"
      aria-labelledby="journey-trial-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id="journey-trial-title">Kiếp nạn</h2>
        <button type="button" className="text-link" onClick={onClose}>
          Đóng
        </button>
      </header>
      <div className="journey-question">
        {!ready ? (
          <p>
            Đã trồng {count}/{firstTrial.words} từ để mở thử thách {firstTrial.name}.
          </p>
        ) : !enter && due > 0 ? (
          <>
            <p>{due} cây đang khát. Tưới trước để ổn định linh lực?</p>
            <button className="button primary" onClick={onWater}>
              Tưới trước
            </button>
            <button className="button secondary" onClick={() => setEnter(true)}>
              Vào Kiếp nạn luôn
            </button>
          </>
        ) : (
          <p>Sẽ dựng ở đợt sau</p>
        )}
      </div>
    </dialog>
  );
}

export function JourneyGarden({ lessonId }: { lessonId: number }) {
  const { data, ready, busy, all, skills, start, byPlant, healthOf, stageOf, wateredToday, water, waterShared } =
    useJourney();
  const router = useRouter();
  const lesson = catalog.lessons.find(({ id }) => id === lessonId)!;
  const words = catalog.words.filter((word) => word.lesson === lessonId);
  const active = Boolean(data.session && data.session.phase !== "complete");
  const [selected, setSelected] = useState<Word | null>(null);
  const [reminderClosed, setReminderClosed] = useState(false);
  const [sowing, setSowing] = useState<{ bed: number; words: Word[] } | null>(null);
  const bedRefs = useRef<Array<HTMLElement | null>>([]);
  const plantedWords = words.filter((word) => planted(word, data.progress));
  const plantedCount = plantedWords.length;
  const dueHere = plantedWords.flatMap(({ id }) => byPlant.get(id) ?? []).sort((a, b) => a.dueAt - b.dueAt);
  const otherPlants = catalog.words.filter(
    (word) => word.lesson !== lessonId && byPlant.has(word.id) && planted(word, data.progress),
  );
  const otherGarden = catalog.lessons.find(({ id }) => id === otherPlants[0]?.lesson);
  const otherDue = otherPlants.filter((word) => word.lesson === otherGarden?.id).length;
  const shared = data.session?.title === sharedWatering;
  const newlyGrown =
    sowing && data.session?.mode === "learn" && data.session.phase === "complete"
      ? sowing.words.filter((word) => planted(word, data.progress))
      : [];
  const grownBed = newlyGrown.length ? sowing?.bed : undefined;
  useEffect(() => {
    if (grownBed === undefined) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bedRefs.current[grownBed]?.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
  }, [grownBed, data.session?.id]);
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
      {ready && !reminderClosed && otherGarden && (
        <aside className="journey-reminder" aria-label="Nhắc tưới vườn khác">
          <Droplet size={18} aria-hidden="true" />
          <p>
            {otherDue} cây ở vườn {otherGarden.title} đang khát — tưới trước?
          </p>
          <button
            type="button"
            className="text-link"
            disabled={busy || active}
            onClick={() => {
              setSelected(null);
              void waterShared();
            }}
          >
            Tưới trước
          </button>
          <button
            type="button"
            className="journey-dismiss"
            aria-label="Đóng nhắc tưới"
            onClick={() => setReminderClosed(true)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </aside>
      )}
      {ready && plantedCount > 0 && (
        <div className="journey-care">
          <p role="status">
            <Droplet size={17} aria-hidden="true" />
            {dueHere.length ? `${dueHere.length} cây cần tưới` : "Hôm nay không còn cây cần tưới"}
          </p>
          <button
            className="button primary"
            disabled={busy || active || !dueHere.length}
            onClick={() => {
              setSelected(null);
              void water(dueHere, "Tưới cả vườn");
            }}
          >
            Tưới cả vườn
          </button>
        </div>
      )}
      <div className="journey-field">
        {Array.from({ length: Math.ceil(words.length / 4) }, (_, bed) => {
          const row = words.slice(bed * 4, bed * 4 + 4);
          const unplanted = row.filter((word) => !planted(word, data.progress));
          const sow = () => {
            setSelected(null);
            void start(unplanted, "learn", `Gieo luống ${bed + 1}`).then((started) => {
              if (started) setSowing({ bed, words: unplanted });
            });
          };
          return (
            <section
              className="journey-bed-row"
              key={bed}
              aria-label={`Luống ${bed + 1}`}
              ref={(node) => {
                bedRefs.current[bed] = node;
              }}
            >
              <ol className="journey-bed">
                {row.map((word, position) => {
                  const grown = planted(word, data.progress);
                  const thirsty = grown ? byPlant.get(word.id) : undefined;
                  const health = grown ? healthOf(word.id) : undefined;
                  const watered = grown && wateredToday(word.id);
                  const slot = bed * 4 + position + 1;
                  const waterTitle = `Tưới cây ở ô ${slot}`;
                  return (
                    <li key={word.id}>
                      <button
                        className="journey-plot"
                        data-state={thirsty ? "thirsty" : grown ? "planted" : "empty"}
                        data-health={health}
                        aria-label={thirsty ? waterTitle : grown ? `Xem ${word.text}` : `Gieo ô ${slot}`}
                        disabled={!ready || busy || active}
                        onClick={() => {
                          if (thirsty) {
                            setSelected(null);
                            void water([thirsty], waterTitle);
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
                              sprouting={newlyGrown.includes(word)}
                            />
                          ) : (
                            <span className="journey-soil">
                              <Plus size={16} strokeWidth={1.8} />
                            </span>
                          )}
                        </span>
                        <span className="journey-word" lang={grown && !thirsty ? "en" : undefined}>
                          {grown && !thirsty ? word.text : `Ô ${slot}`}
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
      {selected && !byPlant.has(selected.id) && (
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
      <JourneyRound
        words={all}
        backLabel={shared ? "Về bản đồ" : "Về vườn"}
        onCompleted={shared ? () => router.push(journeyPath) : undefined}
      />
    </div>
  );
}
