"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { filterRootsCards, type RootsCard, type RootsKind } from "../data/roots-search";

const sections: { kind: RootsKind; title: string }[] = [
  { kind: "root", title: "Gốc từ" },
  { kind: "prefix", title: "Họ tiền tố" },
  { kind: "particle", title: "Giới từ" },
  { kind: "core", title: "Từ đa nghĩa" },
];
export function RootsExplorer({ cards }: { cards: RootsCard[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<RootsKind | "all">("all");
  const found = useMemo(() => filterRootsCards(cards, query, kind), [cards, query, kind]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        sections.map((section) => [section.kind, cards.filter((card) => card.kind === section.kind).length]),
      ),
    [cards],
  );
  return (
    <>
      <div className="library-search roots-search">
        <Search aria-hidden="true" size={23} />
        <label className="sr-only" htmlFor="roots-query">
          Tìm gốc, từ hoặc nghĩa
        </label>
        <input
          id="roots-query"
          type="text"
          role="searchbox"
          enterKeyHint="search"
          autoComplete="off"
          className="roots-search-input"
          placeholder="Tìm gốc, từ hoặc nghĩa… (vd: tract, kéo, attract)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button className="icon-button" type="button" aria-label="Xoá tìm kiếm" onClick={() => setQuery("")}>
            <X aria-hidden="true" size={18} />
          </button>
        )}
        <span className="search-hint">Có thể gõ không dấu</span>
      </div>
      <div className="filter-bar">
        <div className="filter-buttons" role="group" aria-label="Lọc kho gốc từ">
          {[{ kind: "all" as const, title: "Tất cả" }, ...sections].map((option) => (
            <button
              key={option.kind}
              type="button"
              aria-pressed={kind === option.kind}
              className={kind === option.kind ? "filter-chip selected" : "filter-chip"}
              onClick={() => setKind(option.kind)}
            >
              {option.title}
              {option.kind !== "all" && <span className="filter-chip-count">{counts[option.kind]}</span>}
            </button>
          ))}
        </div>
        <span className="muted" role="status">
          {found.length} mục
        </span>
      </div>
      {found.length === 0 && (
        <p className="panel roots-empty">
          Chưa có mục nào khớp với “{query}”. Thử gõ gốc (vd: <span lang="en">spect</span>) hoặc nghĩa tiếng Việt.
        </p>
      )}
      {sections.map((section) => {
        const items = found.filter((card) => card.kind === section.kind);
        if (!items.length) return null;
        return (
          <section className="roots-extra" aria-labelledby={`roots-${section.kind}`} key={section.kind}>
            <h2 id={`roots-${section.kind}`}>
              {section.title} <span className="muted">· {items.length}</span>
            </h2>
            <div className="roots-grid">
              {items.map((card) => (
                <Link className="panel root-card" href={card.href} key={card.key}>
                  <h3 lang="en">{card.title}</h3>
                  <p>{card.meaning}</p>
                  <span className="muted">{card.count} · Khám phá →</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
