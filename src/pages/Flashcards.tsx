import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Empty, Ipa, PosTag } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { FreqMeter } from "@/components/FreqMeter";
import { LessonNav, ScopeSelects } from "@/components/LessonNav";
import { familyOf, lessonLabel, POS_COLS, STATUS_INFO, termInfo, TOPIC_BY_ID, unitOf } from "@/lib/data";
import { displayedStatus, scheduleFor } from "@/lib/srs";
import { speak } from "@/lib/speech";
import type { Status } from "@/lib/types";
import { cx, same } from "@/lib/util";
import { buildDeck, useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";
import { toast, useUI } from "@/state/ui";

const STATUS_FILTER: [string, string][] = [
  ["all", "Tất cả"],
  ["unmastered", "Chưa thuộc"],
  ["new", "Chưa học"],
  ["learning", "Đang học"],
  ["confirming", "Đang xác nhận"],
  ["mastered", "Đã thuộc"],
];

export function FlashcardsPage() {
  const act = useActions();
  const fc = useUI((s) => s.fc);
  const setFc = useUI((s) => s.setFc);
  const { catalog, setStatus, markRemembered, logActivity, recordAnswer, srs } = useProfile();
  const statusMap = useProfile((s) => s.status);

  useEffect(() => {
    if (fc.stale) buildDeck();
  }, [fc.stale]);

  const w = catalog.byId[fc.deck[fc.i]];

  const move = (d: number) => {
    const { fc: f } = useUI.getState();
    if (!f.deck.length) return;
    setFc({ i: (f.i + d + f.deck.length) % f.deck.length, flipped: false });
  };
  const flip = () => setFc({ flipped: !useUI.getState().fc.flipped });
  const rate = (s: Status) => {
    const { fc: f } = useUI.getState();
    const id = f.deck[f.i];
    if (!id) return;
    const currentState = useProfile.getState();
    if (displayedStatus(id, currentState.status, currentState.srs ?? {}) === "confirming") {
      const due = scheduleFor(id, currentState.status, currentState.srs ?? {}, currentState.statusAt)?.due ?? Infinity;
      if (due > Date.now()) {
        toast("Từ này chưa đến ngày kiểm tra lại");
        return;
      }
      recordAnswer(id, s === "mastered");
      logActivity("card");
      const updated = useProfile.getState();
      if (s === "mastered") {
        const passed = updated.srs?.[id]?.confirmations ?? 0;
        toast(
          updated.status[id] === "mastered"
            ? `${catalog.byId[id].word}: Đã xác nhận thuộc!`
            : `Đúng rồi — còn ${3 - passed} lượt đúng cách quãng`,
        );
      } else toast(`${catalog.byId[id].word}: quay lại Đang học`);
      move(1);
      return;
    }
    if (currentState.status[id] === "mastered") {
      toast(`${catalog.byId[id].word}: đã xác nhận thuộc, không cần kiểm tra lại`);
      move(1);
      return;
    }
    logActivity("card");
    if (s === "mastered") markRemembered(id);
    else setStatus(id, s);
    toast(
      s === "mastered"
        ? `${catalog.byId[id].word}: Đã nhớ — cần 3 lượt đúng cách quãng để xác nhận`
        : `${catalog.byId[id].word}: ${STATUS_INFO[s].label}`,
    );
    move(1);
  };

  // Phím tắt: Space lật thẻ, ← → chuyển thẻ, 1 2 3 chấm mức nhớ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tag) || useUI.getState().modal) return;
      if (e.key === " ") {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "1") rate("new");
      else if (e.key === "2") rate("learning");
      else if (e.key === "3") rate("mastered");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const setScope = (p: Partial<typeof fc>) => {
    setFc(p);
    buildDeck();
  };

  const controls = (
    <>
      <div className="card filter-bar">
        <div className="row">
          <ScopeSelects
            unit={fc.unit}
            lesson={fc.lesson}
            onUnit={(v) => setScope({ unit: v, lesson: "all" })}
            onLesson={(v) => setScope({ lesson: v })}
          />
          <label className="row" style={{ gap: 6 }}>
            <span className="eyebrow">Trạng thái</span>
            <select className="select" value={fc.status} onChange={(e) => setScope({ status: e.target.value })}>
              {STATUS_FILTER.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <span className="badge b-indigo" style={{ fontSize: ".82rem", padding: "6px 12px" }}>
            Thẻ: {fc.deck.length ? fc.i + 1 : 0} / {fc.deck.length}
          </span>
          <button
            className="btn sm"
            onClick={() => {
              act.shuffleDeck();
              toast("Đã trộn thẻ");
            }}
          >
            <Icon name="shuffle" size="sm" /> Trộn thẻ
          </button>
        </div>
      </div>
      <LessonNav unit={fc.unit} lesson={fc.lesson} where="fc" />
      <div className="bar">
        <span style={{ width: `${fc.deck.length ? ((fc.i + 1) / fc.deck.length) * 100 : 0}%` }} />
      </div>
    </>
  );

  if (!w)
    return (
      <div className="stack">
        {controls}
        <Empty title="Không có thẻ nào ở bộ lọc này">
          {fc.status === "unmastered" ? "Bạn đã thuộc hết phần này 🎉" : "Bộ lọc trạng thái đang loại hết các thẻ."}
          <br />
          <button className="btn" onClick={() => setScope({ status: "all" })}>
            Hiện tất cả thẻ của phần này
          </button>
        </Empty>
      </div>
    );

  const fam = familyOf(w).filter((f) => !same(f.w, w.word));
  const counts = POS_COLS.map((c) => [c, fam.filter((f) => f.pos === c.k).length] as const).filter(([, n]) => n);
  const s: Status = displayedStatus(w.id, statusMap, srs ?? {});
  const confirmations = srs?.[w.id]?.confirmations ?? 0;

  return (
    <div className="stack">
      {controls}
      <div className="fc-stage">
        <div className="fc-scene">
          <div
            className={cx("fc-card", fc.flipped && "flipped")}
            id="fc-card"
            title={fc.flipped ? "Bấm để lật lại" : "Bấm để lật thẻ"}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button, a")) return;
              flip();
            }}
          >
            <div className="fc-face fc-front">
              <div className="row between">
                <div className="row" style={{ gap: 6 }}>
                  <span className="badge b-indigo">{TOPIC_BY_ID[unitOf(w)].name}</span>
                  <span className="badge b-slate">{lessonLabel(w)}</span>
                  <PosTag pos={w.pos} />
                </div>
                <span
                  className={cx(
                    "badge",
                    s === "mastered"
                      ? "b-emerald"
                      : s === "confirming"
                        ? "b-sky"
                        : s === "learning"
                          ? "b-amber"
                          : "b-slate",
                  )}
                >
                  {STATUS_INFO[s].emoji} {STATUS_INFO[s].label}
                  {s === "confirming" ? ` · ${confirmations}/3` : ""}
                </span>
              </div>
              <div style={{ textAlign: "center" }} className="stack-sm">
                <div className="row" style={{ justifyContent: "center", gap: 10 }}>
                  <FreqMeter z={termInfo(w.word).z} />
                  <div className="fc-word">{w.word}</div>
                </div>
                <Ipa ipa={w.ipa} className="fc-ipa" />
                <div>
                  <button className="btn sm soft" onClick={() => speak(w.word)}>
                    <Icon name="volume" size="sm" /> Nghe phát âm
                  </button>
                </div>
                <p className="muted" style={{ fontSize: ".86rem", marginTop: 14 }}>
                  Nhẩm nghĩa và các dạng từ trước khi lật thẻ:
                </p>
                <div className="row" style={{ justifyContent: "center", gap: 6 }}>
                  {counts.map(([c, n]) => (
                    <span key={c.k} className={`badge ${c.cls}`}>
                      {n} {c.title.split(" (")[0].toLowerCase()}
                    </span>
                  ))}
                  {w.syn.length > 0 && <span className="badge b-teal">{w.syn.length} đồng nghĩa</span>}
                  {w.ant.length > 0 && <span className="badge b-rose">{w.ant.length} trái nghĩa</span>}
                </div>
              </div>
              <div className="fc-hint">
                <Icon name="repeat" size="sm" /> Nhấn vào thẻ hoặc phím <kbd>Space</kbd> để lật xem Sơ đồ Trường từ
              </div>
            </div>
            <div className="fc-face fc-back">
              <div
                className="row between"
                style={{ alignItems: "flex-start", borderBottom: "1px solid rgba(255,255,255,.1)", paddingBottom: 12 }}
              >
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <FreqMeter z={termInfo(w.word).z} />
                    <h3 style={{ fontSize: "1.5rem" }}>{w.word}</h3>
                    <span style={{ color: "oklch(0.8 0.05 262)", fontSize: ".9rem" }}>{w.ipa}</span>
                    {w.pos && (
                      <span
                        className="pp"
                        style={{ fontStyle: "italic", color: "oklch(0.78 0.05 262)", fontSize: ".85rem" }}
                      >
                        ({w.pos})
                      </span>
                    )}
                  </div>
                  <div className="fc-vi">{w.vi}</div>
                  {w.def && <div style={{ fontSize: ".78rem", color: "#94a3b8", marginTop: 2 }}>{w.def}</div>}
                </div>
                <Link className="btn sm primary" to={`/network/${w.id}`}>
                  Xem sơ đồ lớn
                </Link>
              </div>
              <div className="fc-list" style={{ margin: "12px 0" }}>
                {fam.length ? (
                  fam.slice(0, 8).map((f) => (
                    <div key={f.w}>
                      <b>{f.w}</b>
                      <span className="pp">({f.pos})</span>
                      <span style={{ color: "#cbd5e1", flex: 1 }}>{f.vi}</span>
                    </div>
                  ))
                ) : (
                  <div>Không có họ từ — học kỹ nghĩa và câu ví dụ.</div>
                )}
              </div>
              <div className="row" style={{ gap: 6 }}>
                {w.syn.map((x) => (
                  <span key={x} className="tag syn">
                    ≈ {x}
                  </span>
                ))}
                {w.ant.map((x) => (
                  <span key={x} className="tag ant">
                    ≠ {x}
                  </span>
                ))}
              </div>
              {w.ex[0] && (
                <div style={{ fontSize: ".78rem", color: "#94a3b8", fontStyle: "italic", marginTop: 10 }}>
                  “{w.ex[0]}”{w.exVi?.[0] && <div style={{ fontStyle: "normal", marginTop: 2 }}>{w.exVi[0]}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="rate-grid">
          <button className="rate-btn r1" onClick={() => rate("new")}>
            <Icon name="undo" size="sm" /> Chưa nhớ<small>Ôn lại ngày mai (phím 1)</small>
          </button>
          <button className="rate-btn r2" onClick={() => rate("learning")}>
            <Icon name="target" size="sm" /> Đang học<small>Giữ hộp, ôn ngày mai (phím 2)</small>
          </button>
          <button className="rate-btn r3" onClick={() => rate("mastered")}>
            <Icon name="check" size="sm" /> Đã nhớ<small>3 lượt đúng cách quãng để xác nhận (phím 3)</small>
          </button>
        </div>
        <div className="row between" style={{ marginTop: 12 }}>
          <button className="btn sm ghost" onClick={() => move(-1)}>
            <Icon name="left" size="sm" /> Từ trước
          </button>
          <button className="btn sm ghost" style={{ color: "var(--indigo)" }} onClick={flip}>
            <Icon name="repeat" size="sm" /> Lật thẻ
          </button>
          <button className="btn sm ghost" onClick={() => move(1)}>
            Từ tiếp <Icon name="right" size="sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
