import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Empty, StatusDot } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { LessonNav } from "@/components/LessonNav";
import {
  AFFIXES,
  expandedCount,
  familyOf,
  isPhrase,
  LESSON_BY_N,
  LESSONS,
  lessonLabel,
  type Catalog,
} from "@/lib/data";
import { matchReason } from "@/lib/search";
import type { Status, Word } from "@/lib/types";
import { cx, fold, lower, scrollBehavior } from "@/lib/util";
import { useProfile } from "@/state/profile";
import { NET_DEFAULT, useUI, type NetState } from "@/state/ui";
import { WordCanvas } from "./WordCanvas";

const NET_FILTERS: Record<"status" | "pos" | "sort", { label: string; options: [string, string][] }> = {
  status: {
    label: "Trạng thái",
    options: [
      ["all", "Mọi trạng thái"],
      ["new", "Chưa học"],
      ["learning", "Đang học"],
      ["mastered", "Đã thuộc"],
      ["unmastered", "Chưa thuộc"],
    ],
  },
  pos: {
    label: "Từ loại",
    options: [
      ["all", "Mọi từ loại"],
      ["n", "Danh từ"],
      ["v", "Động từ"],
      ["adj", "Tính từ"],
      ["adv", "Trạng từ"],
      ["phr", "Cụm từ"],
    ],
  },
  sort: {
    label: "Sắp xếp",
    options: [
      ["book", "Theo thứ tự sách"],
      ["az", "A → Z"],
      ["family", "Họ từ lớn nhất"],
      ["weak", "Hay làm sai nhất"],
    ],
  },
};

const activeFilters = (n: NetState) =>
  (["status", "pos", "affix"] as const).filter((k) => n[k] !== "all").length + (n.sort !== "book" ? 1 : 0);

export function networkList(
  cat: Catalog,
  n: NetState,
  status: Record<string, Status>,
  stats: Record<string, { w: number }>,
): Word[] {
  const matches = (w: Word) => {
    const s = status[w.id] ?? "new";
    if (n.status === "unmastered" ? s === "mastered" : n.status !== "all" && s !== n.status) return false;
    if (n.pos === "phr" ? !isPhrase(w) : n.pos !== "all" && (isPhrase(w) || w.pos !== n.pos)) return false;
    if (n.affix !== "all" && !familyOf(w).some((f) => f.parts?.includes(n.affix))) return false;
    return true;
  };
  let list = cat.scope(n.unit, n.lesson).filter(matches);
  if (n.sort === "az") list = list.slice().sort((a, b) => a.word.localeCompare(b.word));
  else if (n.sort === "family") list = list.slice().sort((a, b) => expandedCount(b) - expandedCount(a));
  else if (n.sort === "weak") list = list.slice().sort((a, b) => (stats[b.id]?.w ?? 0) - (stats[a.id]?.w ?? 0));
  const q = n.q.trim();
  if (q) {
    const f = fold(q);
    list = list.filter((w) => fold(w.word).includes(f) || matchReason(w, q));
    list.sort((a, b) => (fold(a.word).startsWith(f) ? 0 : 1) - (fold(b.word).startsWith(f) ? 0 : 1));
  }
  return list;
}

function FilterRow({ net, onChange }: { net: NetState; onChange: (p: Partial<NetState>) => void }) {
  const sel = (key: "status" | "pos" | "sort") => {
    const f = NET_FILTERS[key];
    return (
      <label className={cx("filter-sel", net[key] !== (key === "sort" ? "book" : "all") && "on")}>
        <span>{f.label}</span>
        <select value={net[key]} onChange={(e) => onChange({ [key]: e.target.value })}>
          {f.options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
    );
  };
  const affixOpts = (type: "prefix" | "suffix") =>
    Object.keys(AFFIXES)
      .filter((k) => AFFIXES[k].type === type)
      .map((k) => (
        <option key={k} value={k}>
          {k} — {AFFIXES[k].vi}
        </option>
      ));
  const n = activeFilters(net);
  return (
    <div className="filter-row">
      {sel("status")}
      {sel("pos")}
      <label className={cx("filter-sel", net.affix !== "all" && "on")}>
        <span>Phụ tố</span>
        <select value={net.affix} onChange={(e) => onChange({ affix: e.target.value })}>
          <option value="all">Mọi phụ tố</option>
          <optgroup label="Tiền tố">{affixOpts("prefix")}</optgroup>
          <optgroup label="Hậu tố">{affixOpts("suffix")}</optgroup>
        </select>
      </label>
      {sel("sort")}
      {n > 0 && (
        <button
          className="text-link"
          onClick={() => onChange({ status: "all", pos: "all", affix: "all", sort: "book" })}
        >
          <Icon name="x" size="sm" /> Xoá {n} bộ lọc
        </button>
      )}
    </div>
  );
}

export function NetworkPage() {
  const navigate = useNavigate();
  const { id: paramId, form } = useParams();
  const { catalog, status, stats } = useProfile();
  const net = useUI((s) => s.net);
  const setNet = useUI((s) => s.setNet);
  const [q, setQ] = useState(net.q);
  const listRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => networkList(catalog, net, status, stats), [catalog, net, status, stats]);

  // Từ đang mở (theo link) có thể nằm ngoài bộ lọc hiện tại: vẫn hiện từ đó, GIỮ NGUYÊN bộ lọc và danh sách
  const linked = paramId ? catalog.byId[paramId] : undefined;
  const cur = linked ?? list[0];
  const outside = !!cur && !list.some((w) => w.id === cur.id);

  /** Chuyển bộ lọc sang đúng bài của từ đang xem (giữ nguyên từ) */
  const openOwnLesson = () => {
    if (!cur) return;
    setQ("");
    setNet(
      cur.lesson
        ? { ...NET_DEFAULT, unit: LESSON_BY_N[cur.lesson].unit, lesson: String(cur.lesson) }
        : { ...NET_DEFAULT, unit: "custom" },
    );
  };

  // Đổi bộ lọc: chọn lại từ đầu danh sách
  const changeNet = (p: Partial<NetState>) => {
    setNet(p);
    if (paramId) navigate("/network", { replace: true });
  };

  // Gõ tới đâu lọc tới đó, chờ 120ms để không vẽ lại liên tục
  useEffect(() => {
    if (q === net.q) return;
    const t = setTimeout(() => changeNet({ q }), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Chỉ cuộn danh sách bên trái tới từ đang chọn (không kéo cả trang theo)
  useEffect(() => {
    const box = listRef.current;
    const active = box?.querySelector<HTMLElement>(".root-item.active");
    if (!box || !active) return;
    const lr = box.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    if (ar.top < lr.top || ar.bottom > lr.bottom) box.scrollTop += ar.top - lr.top - lr.height / 2 + ar.height / 2;
  }, [cur?.id]);

  // Mở từ link (tìm kiếm, bài tập…): màn hẹp thì cuộn tới sơ đồ; có dạng từ thì nháy thẻ của dạng đó
  useEffect(() => {
    if (!paramId) return;
    if (form) {
      const el = canvasRef.current?.querySelector<HTMLElement>(`.wcard[data-w="${CSS.escape(lower(form))}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: scrollBehavior() });
        el.classList.remove("flash");
        void el.offsetWidth;
        el.classList.add("flash");
      }
    } else {
      const c = canvasRef.current;
      if (c && (window.innerWidth < 1024 || c.getBoundingClientRect().top < 70))
        window.scrollTo({ top: window.scrollY + c.getBoundingClientRect().top - 84, behavior: scrollBehavior() });
    }
  }, [paramId, form]);

  const lessons = net.unit === "all" ? LESSONS : LESSONS.filter((l) => l.unit === net.unit);
  const qt = net.q.trim();
  const idx = cur ? list.indexOf(cur) : -1;

  return (
    <div className="stack">
      <div className="card filter-bar net-filter">
        <div className="row net-tools">
          {net.unit !== "custom" && (
            <select
              className="select"
              aria-label="Chọn bài"
              value={net.lesson}
              onChange={(e) => changeNet({ lesson: e.target.value })}
            >
              <option value="all">Tất cả bài</option>
              {lessons.map((l) => (
                <option key={l.n} value={l.n}>
                  Bài {l.n}: {l.title}
                </option>
              ))}
            </select>
          )}
          <div className="search-box" style={{ flex: "1 1 240px" }}>
            <Icon name="search" size="sm" />
            <input
              className="input"
              id="net-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm từ gốc, họ từ, đồng nghĩa, nghĩa Việt…"
              aria-label="Tìm trong danh sách từ gốc"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="pill-row">
          <span className="eyebrow">Chủ đề:</span>
          {[{ id: "all", name: "Tất cả" }, ...catalog.topics].map((t) => (
            <button
              key={t.id}
              className={cx("pill-btn", net.unit === t.id && "active")}
              onClick={() => changeNet({ unit: t.id, lesson: "all" })}
            >
              {t.name}
            </button>
          ))}
        </div>
        <FilterRow net={net} onChange={changeNet} />
      </div>

      <LessonNav unit={net.unit} lesson={net.lesson} where="net" />

      <div className="explorer">
        <aside className="card sidebar">
          <div className="row between">
            <h3 style={{ fontSize: ".92rem" }}>Chọn từ gốc</h3>
            <span className="badge b-indigo" id="root-count">
              {list.length} từ
            </span>
          </div>
          <div className="root-list" id="root-list" ref={listRef}>
            {list.length ? (
              list.map((w) => {
                const reason = qt ? matchReason(w, qt) : null;
                return (
                  <button
                    key={w.id}
                    className={cx("root-item", w.id === cur?.id && "active")}
                    data-id={w.id}
                    onClick={() => navigate(`/network/${w.id}`)}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        <StatusDot id={w.id} />
                        <span className="rw">{w.word}</span>
                        <span className="mono muted" style={{ fontSize: ".7rem" }}>
                          {w.pos ? `(${w.pos})` : ""}
                        </span>
                      </div>
                      <div className="rv">{w.vi}</div>
                      {reason && <span className="match-tag">Khớp: {reason}</span>}
                    </div>
                    <span className="rc">+{expandedCount(w)}</span>
                  </button>
                );
              })
            ) : (
              <div className="empty" style={{ padding: 24 }}>
                Không có từ nào khớp.
                {(activeFilters(net) > 0 || net.q) && (
                  <>
                    <br />
                    <button
                      className="btn sm"
                      onClick={() => {
                        setQ("");
                        changeNet({ ...NET_DEFAULT });
                      }}
                    >
                      Bỏ lọc &amp; tìm kiếm
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
        <div className="stack" id="canvas" ref={canvasRef}>
          {cur ? (
            <>
              {outside && (
                <div className="outside-note" role="status">
                  <Icon name="search" size="sm" />
                  <span>
                    “<b>{cur.word}</b>” nằm ngoài danh sách đang lọc ({lessonLabel(cur)}). Danh sách bên trái vẫn giữ
                    nguyên.
                  </span>
                  <button className="btn sm soft" onClick={openOwnLesson}>
                    Mở {cur.lesson ? `bài ${cur.lesson}` : "từ tự thêm"}
                  </button>
                </div>
              )}
              <WordCanvas
                key={cur.id}
                w={cur}
                prev={outside ? undefined : list[idx - 1]}
                next={outside ? undefined : list[idx + 1]}
                lesson={outside ? "all" : net.lesson}
              />
            </>
          ) : (
            <Empty title="Không tìm thấy từ nào">
              Thử từ khác, hoặc xem lại toàn bộ 600 từ.
              <br />
              <button
                className="btn"
                onClick={() => {
                  setQ("");
                  changeNet({ ...NET_DEFAULT });
                }}
              >
                Xem tất cả từ
              </button>
            </Empty>
          )}
        </div>
      </div>
      {/* giữ thông tin thuần cho trình đọc màn hình */}
      <span className="sr-only" aria-live="polite">
        {cur ? `Đang xem trường từ ${cur.word}` : ""}
      </span>
    </div>
  );
}
