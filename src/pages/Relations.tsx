import { Link } from "react-router-dom";
import { Ipa, netHref, SpeakBtn } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { freqLevel, termInfo, type Catalog } from "@/lib/data";
import type { Word } from "@/lib/types";
import { cx, lower } from "@/lib/util";

/** Link của một từ đồng nghĩa / trái nghĩa: có trong sách → trường từ của nó, không thì → trang riêng của từ */
export function termHref(cat: Catalog, term: string) {
  const id = cat.rootIdFor(term);
  return id ? netHref(id, term) : `/term/${encodeURIComponent(term)}`;
}

/** Vạch đo độ phổ biến 3 nấc */
export function FreqMeter({ z }: { z: number }) {
  const { level, label } = freqLevel(z);
  return (
    <span className={`freq freq-${level}`} title={`${label} (Zipf ${z || "—"})`} aria-label={label}>
      <i />
      <i />
      <i />
    </span>
  );
}

function RelCard({ term, kind, root, cat }: { term: string; kind: "syn" | "ant"; root: Word; cat: Catalog }) {
  const info = termInfo(term);
  const { level, label } = freqLevel(info.z);
  const target = cat.rootIdFor(term);
  const linked = target && target !== root.id;
  // Những từ gốc khác cũng có từ này làm đồng nghĩa / trái nghĩa
  const also = (cat.relIndex[lower(term)] ?? []).filter((r) => r.id !== root.id && cat.byId[r.id]);

  return (
    <div className={cx("rel-card", kind, level >= 2 && "common")}>
      <div className="rel-main">
        <div className="rel-top">
          <FreqMeter z={info.z} />
          <Link
            className="rel-word"
            to={linked ? netHref(target, term) : termHref(cat, term)}
            title={
              linked
                ? `Mở trường từ “${cat.byId[target].word}”`
                : `Xem “${term}”: nghĩa, phát âm và các trường từ liên quan`
            }
          >
            {term}
            <Icon name="right" size="sm" />
          </Link>
          <Ipa ipa={info.ipa} className="rel-ipa" />
          {level >= 2 && <span className={cx("freq-tag", level === 3 && "top")}>{label}</span>}
        </div>
        {info.vi && <div className="rel-vi">{info.vi}</div>}
        {(["syn", "ant"] as const).map((k) => {
          const rs = also.filter((r) => r.kind === k);
          if (!rs.length) return null;
          return (
            <div className="rel-also" key={k}>
              {k === "syn" ? "≈ Đồng nghĩa của " : "≠ Trái nghĩa của "}
              {rs.slice(0, 4).map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ", "}
                  <Link to={netHref(r.id)}>{cat.byId[r.id].word}</Link>
                </span>
              ))}
              {rs.length > 4 && ` +${rs.length - 4}`}
            </div>
          );
        })}
      </div>
      <SpeakBtn text={term} />
    </div>
  );
}

/** Mục Đồng nghĩa & trái nghĩa: nghĩa tiếng Việt, độ phổ biến (từ phổ biến xếp trước), link qua lại giữa các trường từ */
export function RelationList({ w, cat, kind }: { w: Word; cat: Catalog; kind: "syn" | "ant" }) {
  const list = (kind === "syn" ? w.syn : w.ant)
    .map((t, i) => ({ t, i, lv: freqLevel(termInfo(t).z).level }))
    .sort((a, b) => b.lv - a.lv || a.i - b.i);
  return (
    <>
      {list.map(({ t }) => (
        <RelCard key={kind + t} term={t} kind={kind} root={w} cat={cat} />
      ))}
    </>
  );
}

export function FreqLegend() {
  return (
    <div className="freq-legend" title="Theo tần suất xuất hiện trong tiếng Anh (dữ liệu wordfreq)">
      <FreqMeter z={5.2} /> rất phổ biến
      <FreqMeter z={4.5} /> phổ biến
      <FreqMeter z={3.6} /> ít gặp
    </div>
  );
}
