import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { Chips, netHref, PosTag, SpeakBtn } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { AFFIXES, familyOf } from "@/lib/data";
import { cx, lower, scrollBehavior } from "@/lib/util";
import { useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";

export function AffixesPage() {
  const act = useActions();
  const { affix } = useParams();
  const catalog = useProfile((s) => s.catalog);
  const panelRef = useRef<HTMLElement>(null);
  const keys = Object.keys(AFFIXES);
  const sel = affix && AFFIXES[affix] ? affix : null;

  // Số từ (trong họ từ) dùng mỗi phụ tố
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const w of catalog.all) for (const f of familyOf(w)) for (const p of f.parts ?? []) c[p] = (c[p] ?? 0) + 1;
    return c;
  }, [catalog]);

  useEffect(() => {
    if (sel) panelRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }, [sel]);

  const groups: [string, string[]][] = [
    ["Tiền tố — đổi NGHĨA, thường giữ nguyên từ loại", keys.filter((k) => AFFIXES[k].type === "prefix")],
    ["Hậu tố tạo DANH TỪ", keys.filter((k) => AFFIXES[k].type === "suffix" && AFFIXES[k].makes === "n")],
    ["Hậu tố tạo TÍNH TỪ", keys.filter((k) => AFFIXES[k].type === "suffix" && /^adj/.test(AFFIXES[k].makes ?? ""))],
    ["Hậu tố tạo ĐỘNG TỪ", keys.filter((k) => AFFIXES[k].makes === "v")],
    ["Hậu tố tạo TRẠNG TỪ", keys.filter((k) => AFFIXES[k].makes === "adv")],
    [
      "Hậu tố đa năng (danh từ / tính từ)",
      keys.filter(
        (k) =>
          AFFIXES[k].type === "suffix" && /\//.test(AFFIXES[k].makes || "") && !/^adj/.test(AFFIXES[k].makes ?? ""),
      ),
    ],
  ];

  let panel = null;
  if (sel) {
    const a = AFFIXES[sel];
    const seen = new Set<string>();
    const list = catalog.all
      .flatMap((w) =>
        familyOf(w)
          .filter((f) => f.parts?.includes(sel))
          .map((f) => ({ w, f })),
      )
      .filter(({ f }) => {
        const k = lower(f.w);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    panel = (
      <section className="card pad animate-pop" id="affix-panel" ref={panelRef}>
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div className="row" style={{ gap: 14 }}>
            <span className={`morph ${a.type}`} style={{ fontSize: "1.3rem", padding: "10px 16px" }}>
              {sel}
              <small>{a.type === "prefix" ? "Tiền tố" : "Hậu tố"}</small>
            </span>
            <div>
              <h3 style={{ fontSize: "1.15rem" }}>{a.vi}</h3>
              <p className="muted" style={{ fontSize: ".85rem" }}>
                {a.fn}
              </p>
            </div>
          </div>
          <div className="row">
            <button className="btn sm soft" onClick={() => act.netByAffix(sel)}>
              <Icon name="network" size="sm" /> Lọc trường từ theo phụ tố này
            </button>
            <Link className="btn sm ghost" to="/affixes">
              <Icon name="x" size="sm" /> Đóng
            </Link>
          </div>
        </div>
        <div className="eyebrow" style={{ margin: "18px 0 10px" }}>
          {list.length} từ trong 600 từ TOEIC dùng {a.type === "prefix" ? "tiền tố" : "hậu tố"} này
        </div>
        <div className="affix-words">
          {list.map(({ w, f }) => (
            <div className="affix-word" key={f.w}>
              <Link className="aw" to={netHref(w.id, f.w)}>
                {f.w}
              </Link>
              <SpeakBtn text={f.w} />
              <PosTag pos={f.pos} />
              <span style={{ fontSize: ".74rem" }}>
                <Chips parts={f.parts} />
              </span>
              <span className="avi">{f.vi}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="page-head">
        <p className="kicker">{keys.length} tiền tố &amp; hậu tố</p>
        <h1>Nhìn đuôi từ, đoán từ loại</h1>
        <p className="lede">Kỹ năng then chốt cho TOEIC Part 5. Bấm vào một phụ tố để xem mọi từ trong sách dùng nó.</p>
      </section>
      {panel}
      {groups
        .filter(([, ks]) => ks.length)
        .map(([title, ks]) => (
          <section key={title}>
            <h2 className="section-title" style={{ marginBottom: 12 }}>
              {title}
            </h2>
            <div className="grid grid-4">
              {ks.map((k) => {
                const a = AFFIXES[k];
                return (
                  <Link
                    key={k}
                    className={cx("card affix-card", sel === k && "active")}
                    to={`/affixes/${encodeURIComponent(k)}`}
                  >
                    <span>
                      <span className={`chip ${a.type}`} style={{ fontSize: ".95rem", padding: "3px 10px" }}>
                        {k}
                      </span>
                    </span>
                    <span className="av">{a.vi}</span>
                    <span className="af">{a.fn}</span>
                    <span className="ac">{counts[k] ?? 0} từ</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
    </div>
  );
}
