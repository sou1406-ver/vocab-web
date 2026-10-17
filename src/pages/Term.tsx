import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Empty, Ipa, netHref, SpeakBtn } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { FreqMeter } from "@/components/FreqMeter";
import { freqLevel, lessonLabel, termInfo } from "@/lib/data";
import { cx, lower } from "@/lib/util";
import { useProfile } from "@/state/profile";
import { termHref } from "./Relations";

/** Trang của một từ đồng nghĩa / trái nghĩa KHÔNG có trong 600 từ của sách (vd "program"):
    nghĩa, phát âm, độ phổ biến và các trường từ mà nó thuộc về. */
export function TermPage() {
  const navigate = useNavigate();
  const { term = "" } = useParams();
  const catalog = useProfile((s) => s.catalog);
  const t = term.trim();

  // Từ có trong sách → mở thẳng trường từ của nó
  const own = catalog.rootIdFor(t);
  if (own) return <Navigate to={netHref(own, t)} replace />;

  const info = termInfo(t);
  const { level, label } = freqLevel(info.z);
  const rels = catalog.relIndex[lower(t)] ?? [];
  if (!info.vi && !rels.length)
    return (
      <Empty title={`Chưa có dữ liệu cho “${t}”`}>
        <Link className="btn" to="/network">
          Về trang Trường từ
        </Link>
      </Empty>
    );

  const groups = (["syn", "ant"] as const)
    .map((k) => ({ k, items: rels.filter((r) => r.kind === k && catalog.byId[r.id]) }))
    .filter((g) => g.items.length);

  return (
    <div className="stack term-page">
      <div>
        <button className="btn sm ghost" onClick={() => navigate(-1)}>
          <Icon name="left" size="sm" /> Quay lại
        </button>
      </div>
      <section className="root-banner animate-pop">
        <div className="crumbs">Từ liên quan · không nằm trong 600 từ của sách</div>
        <div className="row" style={{ marginTop: 6, gap: 10, alignItems: "baseline" }}>
          <h2>{t}</h2>
          <Ipa ipa={info.ipa} />
          <SpeakBtn text={t} size="" />
        </div>
        <div className="vi">{info.vi}</div>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <FreqMeter z={info.z} />
          <span className={cx("freq-tag", level === 3 && "top")}>{label}</span>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            theo tần suất xuất hiện trong tiếng Anh
          </span>
        </div>
      </section>

      {groups.map(({ k, items }) => (
        <section className="card branch" key={k}>
          <div className="branch-head">
            <div>
              <h3>
                {k === "syn" ? "≈ Đồng nghĩa của" : "≠ Trái nghĩa của"} {items.length} từ trong sách
              </h3>
              <p className="section-sub">Bấm để mở trường từ đầy đủ</p>
            </div>
          </div>
          <div className="term-roots">
            {items.map((r) => {
              const w = catalog.byId[r.id];
              const siblings = (k === "syn" ? w.syn : w.ant).filter((x) => lower(x) !== lower(t));
              return (
                <div key={r.id} className={cx("term-root", k)}>
                  <Link className="term-root-word" to={netHref(w.id)}>
                    {w.word}
                    <Icon name="right" size="sm" />
                  </Link>
                  <Ipa ipa={w.ipa} />
                  <div className="term-root-vi">{w.vi}</div>
                  <div className="term-root-meta">{lessonLabel(w)}</div>
                  {siblings.length > 0 && (
                    <div className="term-siblings">
                      <span className="muted">{k === "syn" ? "Đồng nghĩa khác:" : "Trái nghĩa khác:"}</span>
                      {siblings.map((x) => (
                        <Link key={x} className={`tag ${k}`} to={termHref(catalog, x)}>
                          {x}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
