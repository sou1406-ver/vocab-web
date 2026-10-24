import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Chips, netHref, PosTag } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { POS_LABEL } from "@/lib/data";
import type { FamilyEntry, Word } from "@/lib/types";
import { cx, scrollBehavior } from "@/lib/util";

export function Explain({
  ok,
  close = false,
  entry,
  root,
  extra,
  onNext,
}: {
  ok: boolean;
  close?: boolean;
  entry?: FamilyEntry | null;
  root: Word;
  extra?: ReactNode;
  onNext: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    btn.current?.focus({ preventScroll: true });
    // Trên màn hình nhỏ, kéo phần giải thích vào tầm nhìn
    if (box.current && box.current.getBoundingClientRect().bottom > window.innerHeight)
      box.current.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, []);
  return (
    <div className={cx("explain", close ? "close" : ok ? "ok" : "bad")} ref={box}>
      <div style={{ flex: "1 1 300px" }}>
        <h4>{close ? "💡 Gần đúng — giữ nguyên bậc" : ok ? "✅ Đúng rồi!" : "❌ Chưa đúng"}</h4>
        {entry && entry.parts && entry.parts.length > 1 && (
          <div className="row" style={{ gap: 4, marginTop: 8 }}>
            <Chips parts={entry.parts} />
            <span className="plus">→</span>
            <b>{entry.w}</b>
            <PosTag pos={entry.pos} />
          </div>
        )}
        <p>
          {close ? (
            <>Sai một ký tự hoặc dùng dạng khác trong họ từ nên lượt này không tăng hay giảm hộp ôn. {extra}</>
          ) : (
            extra
          )}
          {entry && (
            <>
              {" "}
              <b>{entry.w}</b> {entry.pos ? `(${POS_LABEL[entry.pos] ?? entry.pos})` : ""}: {entry.vi}.
            </>
          )}
          {entry?.note && (
            <>
              <br />
              <span className="note">{entry.note}</span>
            </>
          )}
        </p>
        <p style={{ fontSize: ".78rem" }}>
          <Link to={netHref(root.id, entry ? entry.w : root.word)}>Mở trường từ “{root.word}” →</Link>
        </p>
      </div>
      <button className="btn dark" id="quiz-next" ref={btn} onClick={onNext}>
        Câu tiếp <Icon name="right" size="sm" />
      </button>
    </div>
  );
}

