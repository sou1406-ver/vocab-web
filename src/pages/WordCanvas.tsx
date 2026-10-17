import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Chips, Ipa, Morph, PosTag, SpeakBtn } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { familyOf, lessonLabel, LESSON_BY_N, POS_COLS, STATUS_INFO, TOPIC_BY_ID, unitOf } from "@/lib/data";
import type { FamilyEntry, Status, Word } from "@/lib/types";
import { lower, same } from "@/lib/util";
import { goLesson, useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";
import { toast, useUI } from "@/state/ui";
import { FreqLegend, RelationList } from "./Relations";

const QUICK_TYPES: [string, string][] = [
  ["synonym", "Đồng nghĩa & Trái nghĩa"],
  ["meaning", "Nghĩa của từ"],
  ["build", "Ghép từ"],
];

function Head({ no, title, sub, extra }: { no: number; title: string; sub?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="branch-head">
      <div className="row" style={{ gap: 12, flexWrap: "nowrap", alignItems: "baseline" }}>
        <span className="branch-no">{String(no).padStart(2, "0")}</span>
        <div>
          <h3>{title}</h3>
          {sub && <p className="section-sub">{sub}</p>}
        </div>
      </div>
      {extra}
    </div>
  );
}

function WordCard({ f, root }: { f: FamilyEntry; root: Word }) {
  return (
    <div className={`wcard${same(f.w, root.word) ? " is-root" : ""}`} data-w={lower(f.w)}>
      <div className="row between" style={{ gap: 4, flexWrap: "nowrap" }}>
        <span className="ww">{f.w}</span>
        <SpeakBtn text={f.w} />
      </div>
      {f.ipa && <div className="ipa">{f.ipa}</div>}
      {f.parts && f.parts.length > 1 && (
        <div style={{ marginTop: 4, fontSize: ".7rem" }}>
          <Chips parts={f.parts} />
        </div>
      )}
      <div className="wv">{f.vi}</div>
      {f.note && <div className="note">{f.note}</div>}
      {f.ex && (
        <>
          <div className="wx">“{f.ex}”</div>
          {f.exVi && <div className="ex-vi">{f.exVi}</div>}
        </>
      )}
    </div>
  );
}

export function WordCanvas({ w, prev, next, lesson }: { w: Word; prev?: Word; next?: Word; lesson: string }) {
  const act = useActions();
  const { catalog, setStatus } = useProfile();
  const st: Status = useProfile((s) => s.status[w.id] ?? "new");
  const setModal = useUI((s) => s.setModal);

  const fam = familyOf(w);
  const unit = TOPIC_BY_ID[unitOf(w)];
  const formulas = fam.filter((f) => f.parts && f.parts.length >= 2);
  const other = fam.filter((f) => !POS_COLS.some((c) => c.k === f.pos));
  const posCols = POS_COLS.map((c) => ({ ...c, items: fam.filter((f) => f.pos === c.k) })).filter(
    (c) => c.items.length,
  );
  const hasRel = w.syn.length > 0 || w.ant.length > 0;
  // Đánh số các mục theo thứ tự thực sự hiển thị (mục trống bị ẩn)
  let no = 0;

  return (
    <>
      <section className="root-banner animate-pop">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 380px", minWidth: 0 }}>
            <div className="crumbs">
              {unit.name} › {lessonLabel(w)}
              {w.lesson ? ` · ${LESSON_BY_N[w.lesson].vi}` : ""}
            </div>
            <div className="row" style={{ marginTop: 6, gap: 10, alignItems: "baseline" }}>
              <h2>{w.word}</h2>
              <Ipa ipa={w.ipa} />
              {(w.senses?.length ? w.senses.map((sense) => sense.pos) : [w.pos]).map((pos, i) => (
                <PosTag key={`${pos}-${i}`} pos={pos} />
              ))}
              <SpeakBtn text={w.word} size="" />
            </div>
            {w.senses?.length ? (
              <div className="word-senses">
                {w.senses.map((sense, senseIndex) => (
                  <section className="word-sense" key={`${sense.pos}-${senseIndex}`}>
                    <div className="word-sense-head">
                      <PosTag pos={sense.pos} />
                      <span className="vi">{sense.meaning}</span>
                    </div>
                    <div className="def">{sense.definition}</div>
                    {sense.ex?.map((example, i) => (
                      <div className="word-sense-example" key={i}>
                        <span>{example}{sense.exVi?.[i] && <span className="ex-vi">{sense.exVi[i]}</span>}</span>
                        <SpeakBtn text={example} />
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            ) : (
              <>
                <div className="vi">{w.vi}</div>
                {w.def && <div className="def">{w.def}</div>}
              </>
            )}
          </div>
          <div className="stack-sm" style={{ textAlign: "right" }}>
            <select
              className={`status-select ${st}`}
              aria-label="Trạng thái học"
              value={st}
              onChange={(e) => {
                const v = e.target.value as Status;
                setStatus(w.id, v);
                toast(`Đã đánh dấu: ${STATUS_INFO[v].label}`);
              }}
            >
              {Object.entries(STATUS_INFO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            {!w.lesson && (
              <button className="btn sm" onClick={() => setModal({ kind: "word", id: w.id })}>
                <Icon name="pencil" size="sm" /> Sửa
              </button>
            )}
          </div>
        </div>
        {!w.senses?.length && w.ex.length > 0 && (
          <div className="book-ex">
            {w.ex.map((x, i) => (
              <div key={i}>
                <span>
                  {x}
                  {w.exVi?.[i] && <span className="ex-vi">{w.exVi[i]}</span>}
                </span>
                <SpeakBtn text={x} />
              </div>
            ))}
          </div>
        )}
      </section>

      {formulas.length > 0 && (
        <section className="card branch">
          <Head
            no={++no}
            title="Cấu tạo từ"
            sub="Bấm vào tiền tố / hậu tố để xem các từ khác dùng nó"
            extra={
              <div className="legend">
                <span className="chip prefix">tiền tố</span>
                <span className="chip root">gốc</span>
                <span className="chip suffix">hậu tố</span>
              </div>
            }
          />
          {formulas.map((f) => (
            <div className="formula" key={f.w}>
              <div className="formula-parts">
                {f.parts.map((p, i) => (
                  <span key={i} style={{ display: "contents" }}>
                    {i > 0 && <span className="plus">+</span>}
                    <Morph part={p} rootTarget={catalog.rootIdFor(p, w.id)} />
                  </span>
                ))}
                <span className="arrow">
                  <Icon name="right" size="sm" />
                </span>
                <span className="formula-result">
                  <b>{f.w}</b>
                  <Ipa ipa={f.ipa} />
                  <PosTag pos={f.pos} />
                  <SpeakBtn text={f.w} />
                </span>
              </div>
              <div className="formula-meaning">
                {f.vi}
                {f.note && <div className="note">{f.note}</div>}
              </div>
            </div>
          ))}
        </section>
      )}

      {fam.length > 1 && (
        <section className="card branch">
          <Head
            no={++no}
            title="Họ từ theo từ loại"
            sub={
              <>
                Câu in nghiêng lấy từ mục <i>Word Families</i> của sách
              </>
            }
          />
          {posCols.length > 0 && (
            <div
              className="pos-cols"
              style={{ "--cols": posCols.length, "--cols-md": Math.min(posCols.length, 2) } as CSSProperties}
            >
              {posCols.map((c) => (
                <div className="pos-col" key={c.k}>
                  <div className="pos-col-head">
                    <span className="badge">{c.title}</span>
                    <span className="muted" style={{ fontSize: ".8rem" }}>
                      {c.items.length}
                    </span>
                  </div>
                  {c.items.map((f) => (
                    <WordCard key={f.w} f={f} root={w} />
                  ))}
                </div>
              ))}
            </div>
          )}
          {other.length > 0 && (
            <div style={posCols.length ? { marginTop: 14 } : undefined}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Cụm từ / dạng khác
              </div>
              <div className="grid grid-3">
                {other.map((f) => (
                  <WordCard key={f.w} f={f} root={w} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className={hasRel ? "grid grid-2" : "grid"}>
        {hasRel && (
          <section className="card branch">
            <Head
              no={++no}
              title="Đồng nghĩa & trái nghĩa"
              sub="Từ phổ biến xếp trước · bấm từ để mở trường từ của nó"
              extra={<FreqLegend />}
            />
            {w.syn.length > 0 && (
              <>
                <div className="rel-label" style={{ color: "var(--teal-text)" }}>
                  ≈ Đồng nghĩa
                </div>
                <RelationList w={w} cat={catalog} kind="syn" />
              </>
            )}
            {w.ant.length > 0 && (
              <>
                <div className="rel-label" style={{ color: "var(--rose-text)", marginTop: w.syn.length ? 16 : 0 }}>
                  ≠ Trái nghĩa
                </div>
                <RelationList w={w} cat={catalog} kind="ant" />
              </>
            )}
          </section>
        )}
        <section className="card branch" style={{ display: "flex", flexDirection: "column" }}>
          <Head no={++no} title="Luyện riêng họ từ này" sub={`${fam.length} từ`} />
          <button className="btn primary" style={{ width: "100%" }} onClick={() => act.quizForWord(w.id, "formation")}>
            Điền dạng từ trong câu <Icon name="right" size="sm" />
          </button>
          {w.lesson > 0 && (
            <button
              className="btn"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => act.openLessonBook(w.lesson)}
            >
              <Icon name="book" size="sm" /> Bài tập trong sách · bài {w.lesson}
            </button>
          )}
          <div className="row" style={{ marginTop: 10, gap: "6px 16px" }}>
            {QUICK_TYPES.map(([k, label]) => (
              <button key={k} className="text-link" onClick={() => act.quizForWord(w.id, k)}>
                {label}
              </button>
            ))}
          </div>
          <div className="row between" style={{ marginTop: "auto", paddingTop: 16 }}>
            {prev ? (
              <Link className="btn sm ghost" to={`/network/${prev.id}`}>
                <Icon name="left" size="sm" /> {prev.word}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link className="btn sm ghost" to={`/network/${next.id}`}>
                {next.word} <Icon name="right" size="sm" />
              </Link>
            ) : lesson !== "all" && LESSON_BY_N[+lesson + 1] ? (
              <button
                className="btn sm soft"
                onClick={() => {
                  goLesson("net", String(+lesson + 1));
                  act.navigate("/network");
                }}
              >
                Sang bài {+lesson + 1} <Icon name="right" size="sm" />
              </button>
            ) : (
              <span />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
