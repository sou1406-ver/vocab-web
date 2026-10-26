"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findArticle } from "./knowledge/articles";
import { library, findWords } from "../data/catalog";
import { useApp } from "../state/provider";
import { statusOf } from "../domain/learning";
import { useWord } from "../app/context";
import { Empty, Icon } from "../shared/ui";

export default function Library() {
  const { data, start, busy } = useApp();
  const router = useRouter();
  const inspect = useWord();
  const params = useSearchParams();
  const setParams = (values: Record<string, string>, options?: { replace?: boolean }) => {
    const origin = params.get("from") ?? "";
    const url = "/library?" + new URLSearchParams({ ...values, ...(findArticle(origin) ? { from: origin } : {}) });
    if (options?.replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  };
  const [limit, setLimit] = useState(24);
  const query = params.get("q") ?? "";
  const filter = params.get("filter") ?? "all";
  const sourceArticle = findArticle(params.get("from") ?? "");
  const from = sourceArticle ? `/knowledge/${sourceArticle.slug}` : undefined;
  const all = [...library.words, ...data.customWords];
  const found = findWords(query, all).filter(
    (word) =>
      filter === "all" ||
      (filter === "saved"
        ? (data.savedWords ?? []).includes(word.id)
        : filter === "weak"
          ? (data.progress[word.id]?.incorrect ?? 0) > 0
          : filter === "custom"
            ? word.lesson === 0
            : Boolean(data.progress[word.id])),
  );
  const learnSaved = async () => {
    if (data.session && data.session.phase !== "complete") return router.push("/study");
    const untested = found.filter((word) => !data.progress[word.id]?.tested);
    if (
      await start(
        (untested.length ? untested : found).slice(0, 5),
        untested.length ? "learn" : "practice",
        "Từ đã lưu của bạn",
        from,
      )
    )
      router.push("/study");
  };
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>
            Thư viện từ vựng<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">Tìm từ, khám phá họ từ và cách dùng trong ngữ cảnh.</p>
        </div>
        {filter === "saved" && found.length > 0 && (
          <Button className="min-h-11" disabled={busy} onClick={() => void learnSaved()}>
            {data.session && data.session.phase !== "complete" ? "Tiếp tục lượt đang học" : "Học từ đã lưu"}
            <Icon name="arrow" />
          </Button>
        )}
      </div>
      {from && (
        <Link className="back-link" href={from}>
          ← Quay lại bài đang đọc
        </Link>
      )}
      <div className="library-search">
        <Icon name="search" size={23} />
        <label className="sr-only" htmlFor="library-query">
          Tìm từ hoặc nghĩa tiếng Việt
        </label>
        <Input
          id="library-query"
          placeholder="Tìm từ hoặc nghĩa tiếng Việt…"
          value={query}
          onChange={(e) => {
            setParams({ q: e.target.value, filter }, { replace: true });
            setLimit(24);
          }}
        />
        {query && (
          <button className="icon-button" aria-label="Xoá tìm kiếm" onClick={() => setParams({ filter })}>
            <Icon name="close" size={18} />
          </button>
        )}
        <span className="search-hint">Có thể gõ không dấu</span>
      </div>
      <div className="filter-bar">
        <div className="filter-buttons" role="group" aria-label="Lọc thư viện">
          {[
            ["all", "Tất cả"],
            ["saved", "Đã lưu"],
            ["started", "Đã bắt đầu"],
            ["weak", "Từng làm sai"],
            ["custom", "Từ của tôi"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? "filter-chip selected" : "filter-chip"}
              onClick={() => {
                setParams({ q: query, filter: value });
                setLimit(24);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="muted" role="status">
          {found.length} từ
        </span>
      </div>
      {found.length ? (
        <>
          <div className="vocabulary-grid">
            {found.slice(0, limit).map((word) => (
              <button className="vocabulary-card" key={word.id} onClick={() => inspect(word)}>
                <div className="vocabulary-card-top">
                  <span className="small-label">
                    {word.lesson ? `BÀI ${String(word.lesson).padStart(2, "0")}` : "TỪ CỦA BẠN"}
                  </span>
                  <span className="pos">{word.pos}</span>
                </div>
                <h2 lang="en">{word.text}</h2>
                <span className="vocab-ipa" lang="en">
                  {word.ipa || " "}
                </span>
                <p>{word.meaning}</p>
                <div className="vocabulary-card-bottom">
                  <span className={`status-badge ${data.progress[word.id] ? "started" : ""}`}>
                    {statusOf(data.progress[word.id])}
                  </span>
                  <Icon name="arrow" size={17} />
                </div>
              </button>
            ))}
          </div>
          {found.length > limit && (
            <div className="load-more">
              <button className="button secondary" onClick={() => setLimit((n) => n + 24)}>
                Xem thêm 24 từ
              </button>
              <span className="muted">
                Đang xem {Math.min(limit, found.length)}/{found.length} từ
              </span>
            </div>
          )}
        </>
      ) : (
        <Empty title={filter === "custom" && !query ? "Chưa có từ riêng" : "Chưa tìm thấy từ phù hợp"}>
          <p>
            {filter === "custom"
              ? "Bạn có thể nhập từ tự thêm từ bản sao lưu web cũ trong Cài đặt & sao lưu."
              : "Thử từ khoá ngắn hơn hoặc tìm bằng nghĩa tiếng Việt nhé."}
          </p>
        </Empty>
      )}
    </div>
  );
}
