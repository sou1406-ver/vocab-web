import "./vocabulary.css";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { netHref, PosTag, SpeakBtn } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { familyOf, POS_COLS, POS_LABEL } from "@/lib/data";
import type { FamilyEntry, Word } from "@/lib/types";
import { lower, same } from "@/lib/util";
import { useProfile } from "@/state/profile";
import { useLessonDetails } from "@/lib/useLessonDetails";

type RootFamily = { root: string; meaning: string; forms: { form: FamilyEntry; source: Word }[] };

function rootFamilies(words: Word[]): RootFamily[] {
  const groups = new Map<string, RootFamily>();
  for (const source of words) {
    for (const form of familyOf(source)) {
      const root = form.parts?.find((part) => !part.startsWith("-") && !part.endsWith("-") && !/\s/.test(part));
      if (!root || root.length < 3) continue;
      const key = lower(root);
      const group = groups.get(key) ?? { root, meaning: "", forms: [] };
      if (!group.forms.some(({ form: existing }) => same(existing.w, form.w))) group.forms.push({ form, source });
      if (!group.meaning && same(form.w, root)) group.meaning = form.vi;
      groups.set(key, group);
    }
  }
  return [...groups.values()]
    .filter((group) => group.forms.length >= 2)
    .map((group) => ({
      ...group,
      meaning: group.meaning || group.forms[0]?.form.vi || "",
      forms: group.forms.sort((a, b) => a.form.w.localeCompare(b.form.w)),
    }))
    .sort((a, b) => b.forms.length - a.forms.length || a.root.localeCompare(b.root));
}

const POS_MEANING: Record<string, string> = {
  n: "Gọi tên người, vật, việc hoặc ý niệm",
  v: "Diễn tả hành động hoặc trạng thái",
  adj: "Miêu tả đặc điểm của người hoặc vật",
  adv: "Bổ nghĩa cho hành động, tính chất hoặc cách diễn ra",
};

function firstCleanExample(form: FamilyEntry) {
  const example = form.ex?.split(/(?<=[.!?])\s+/)[0]?.trim();
  const escaped = form.w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return example && example.length < 180 && new RegExp(`\\b${escaped}\\b`, "i").test(example) ? example : undefined;
}

export function RootsPage() {
  const { root: rootParam } = useParams();
  const navigate = useNavigate();
  const catalog = useProfile((state) => state.catalog);
  const detailsReady = useLessonDetails();
  const groups = useMemo(() => rootFamilies(catalog.all), [catalog]);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState("all");
  const [visibleCount, setVisibleCount] = useState(40);
  const active = groups.find((group) => same(group.root, rootParam ?? ""));
  const filtered = groups.filter((group) => {
    const matchesQuery =
      !query ||
      lower(
        `${group.root} ${group.meaning} ${group.forms.map(({ form }) => `${form.w} ${form.vi}`).join(" ")}`,
      ).includes(lower(query.trim()));
    const matchesPos = pos === "all" || group.forms.some(({ form }) => form.pos === pos);
    return matchesQuery && matchesPos;
  });

  if (!detailsReady)
    return (
      <div className="card" role="status">
        Đang tải dữ liệu họ từ…
      </div>
    );

  return (
    <div className="roots-page stack">
      <header className="page-head">
        <p className="kicker">HỌ TỪ · Ý NGHĨA · TỪ LOẠI</p>
        <h1>Tìm gốc nghĩa, hiểu cả họ từ</h1>
        <p className="lede">
          Bắt đầu từ ý nghĩa chung của họ từ. Sau đó xem mỗi từ dùng ý nghĩa ấy để gọi tên, diễn tả hành động hay miêu
          tả đặc điểm — thay vì đoán đáp án chỉ từ một cái đuôi.
        </p>
      </header>

      <section className="card roots-principle" aria-label="Cách hiểu từ loại">
        {POS_COLS.map(({ k, cls }) => (
          <div className="roots-role" key={k}>
            <span className={`badge ${cls}`}>{POS_LABEL[k]}</span>
            <span>{POS_MEANING[k]}</span>
          </div>
        ))}
      </section>

      {active ? (
        <section className="roots-detail stack" aria-labelledby="root-detail-title">
          <div className="row between roots-detail-head">
            <div>
              <p className="eyebrow">GỐC NGHĨA</p>
              <h2 id="root-detail-title">{active.root}</h2>
              <p className="roots-core-meaning">{active.meaning}</p>
            </div>
            <button className="btn sm ghost" onClick={() => navigate("/roots")}>
              <Icon name="left" size="sm" /> Tất cả gốc từ
            </button>
          </div>
          <p className="muted roots-explainer">
            Cùng một lõi nghĩa có thể xuất hiện dưới nhiều từ loại. Hãy nhìn vai trò của từ trong câu; dạng chữ là một
            dấu hiệu, còn nghĩa và cách dùng mới quyết định cách hiểu.
          </p>
          <div className="roots-family-grid">
            {active.forms.map(({ form, source }) => {
              const example = firstCleanExample(form);
              return (
                <article className="card roots-form" key={lower(form.w)}>
                  <div className="row between">
                    <Link className="roots-word" to={netHref(source.id, form.w)}>
                      {form.w}
                    </Link>
                    <PosTag pos={form.pos} />
                  </div>
                  <p className="roots-form-meaning">{form.vi}</p>
                  <div className="row roots-word-actions">
                    <SpeakBtn text={form.w} />
                    <span className="muted">{POS_MEANING[form.pos] ?? "Cách dùng trong họ từ"}</span>
                  </div>
                  {example && <p className="roots-example">{example}</p>}
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          <section className="roots-controls" aria-label="Tìm gốc từ">
            <label className="roots-search">
              <Icon name="search" size="sm" />
              <span className="sr-only">Tìm từ hoặc ý nghĩa</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm gốc, từ trong họ hoặc nghĩa…"
              />
            </label>
            <div className="roots-pos-filter" role="group" aria-label="Lọc theo từ loại">
              {[{ k: "all", title: "Tất cả" }, ...POS_COLS.map(({ k }) => ({ k, title: POS_LABEL[k] }))].map((item) => (
                <button
                  key={item.k}
                  className={pos === item.k ? "active" : ""}
                  aria-pressed={pos === item.k}
                  onClick={() => setPos(item.k)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </section>

          <div className="roots-results-head">
            <h2>Họ từ trong bộ TOEIC</h2>
            <span className="muted">{filtered.length} gốc từ</span>
          </div>
          {filtered.length ? (
            <div className="roots-list">
              {filtered.slice(0, visibleCount).map((group) => {
                const partsOfSpeech = [...new Set(group.forms.map(({ form }) => form.pos))];
                return (
                  <Link className="card roots-card" key={group.root} to={`/roots/${encodeURIComponent(group.root)}`}>
                    <div className="roots-card-main">
                      <span className="roots-card-title">{group.root}</span>
                      <span className="muted">{group.meaning}</span>
                    </div>
                    <div className="row roots-card-meta">
                      {partsOfSpeech.map((formPos) => (
                        <PosTag key={formPos} pos={formPos} />
                      ))}
                      <span className="roots-form-count">{group.forms.length} dạng</span>
                    </div>
                    <Icon name="right" size="sm" />
                  </Link>
                );
              })}
              {filtered.length > visibleCount && (
                <button className="btn roots-show-more" onClick={() => setVisibleCount((count) => count + 40)}>
                  Hiện thêm {Math.min(40, filtered.length - visibleCount)} gốc từ
                </button>
              )}
            </div>
          ) : (
            <div className="card roots-empty">Chưa tìm thấy họ từ phù hợp. Thử từ khóa hoặc bộ lọc khác nhé.</div>
          )}
        </>
      )}
    </div>
  );
}
