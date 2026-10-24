import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FreqMeter } from "@/components/FreqMeter";
import { lessonLabel, termInfo } from "@/lib/data";
import { searchWords } from "@/lib/search";
import { cx } from "@/lib/util";
import { useProfile } from "@/state/profile";
import { useLessonDetails } from "@/lib/useLessonDetails";
import { Ipa, netHref, PosTag } from "./bits";
import { Icon } from "./Icon";

/** Ô tìm từ trên thanh tiêu đề: phím "/" để mở, ↑ ↓ để chọn, Enter để đi tới trường từ */
export function GlobalSearch() {
  const catalog = useProfile((s) => s.catalog);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const detailsReady = useLessonDetails(open || mobileOpen ? null : []);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchWords(catalog, q), [catalog, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !["input", "textarea", "select"].includes(tag)) {
        e.preventDefault();
        setMobileOpen(true);
        // ô tìm có thể đang ẩn (màn hẹp) — đợi lớp .search-open được gắn rồi mới focus
        setTimeout(() => inputRef.current?.focus());
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  useEffect(() => {
    document.querySelector(".header")?.classList.toggle("search-open", mobileOpen);
  }, [mobileOpen]);

  const go = (i: number) => {
    const e = results[i];
    if (!e) return;
    setQ("");
    setOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
    // từ đồng nghĩa ngoài sách → trang riêng của từ đó
    navigate(e.kind === "syn" ? `/term/${encodeURIComponent(e.form)}` : netHref(e.root.id, e.form));
  };

  const show = open && !!q.trim() && detailsReady;
  return (
    <div className="gsearch-wrap" ref={wrapRef}>
      <div className="gsearch" id="gsearch">
        <input
          ref={inputRef}
          id="gsearch-input"
          className="input"
          type="search"
          placeholder="Tìm từ, họ từ, nghĩa Việt…"
          autoComplete="off"
          spellCheck={false}
          aria-label="Tìm từ"
          aria-controls="gsearch-results"
          aria-expanded={show}
          role="combobox"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            const n = results.length;
            if (e.key === "ArrowDown" && n) {
              e.preventDefault();
              setSel((sel + 1) % n);
            } else if (e.key === "ArrowUp" && n) {
              e.preventDefault();
              setSel((sel - 1 + n) % n);
            } else if (e.key === "Enter" && n) {
              e.preventDefault();
              go(sel);
            } else if (e.key === "Escape") {
              setQ("");
              setOpen(false);
              setMobileOpen(false);
              inputRef.current?.blur();
            }
          }}
        />
        <kbd className="gsearch-key" aria-hidden="true">
          /
        </kbd>
        {show && (
          <div className="gsearch-results" id="gsearch-results" role="listbox">
            {results.length ? (
              results.map((e, i) => (
                <button
                  key={e.form + e.root.id}
                  className={cx("gs-item", i === sel && "sel")}
                  role="option"
                  aria-selected={i === sel}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(i)}
                >
                  <span className="gs-main">
                    <FreqMeter z={termInfo(e.form).z} />
                    <b>{e.form}</b>
                    <Ipa ipa={e.ipa} />
                    <PosTag pos={e.pos} />
                  </span>
                  <span className="gs-vi">{e.vi}</span>
                  <span className="gs-from">
                    {e.kind === "root"
                      ? lessonLabel(e.root)
                      : e.kind === "family"
                        ? `họ từ ${e.root.word}`
                        : `→ ${e.root.word}`}
                  </span>
                </button>
              ))
            ) : (
              <div className="gs-empty">Không tìm thấy “{q}”. Thử gõ không dấu hoặc một phần của từ.</div>
            )}
          </div>
        )}
      </div>
      <button
        className="icon-btn gsearch-toggle"
        title="Tìm từ"
        aria-label="Tìm từ"
        id="gsearch-btn"
        onClick={() => {
          setMobileOpen(!mobileOpen);
          setTimeout(() => inputRef.current?.focus());
        }}
      >
        <Icon name="search" />
      </button>
    </div>
  );
}
