import { Fragment, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AFFIXES, affixType, POS_LABEL, STATUS_INFO } from "@/lib/data";
import { speak } from "@/lib/speech";
import type { Status } from "@/lib/types";
import { cx } from "@/lib/util";
import { useProfile } from "@/state/profile";
import { Icon } from "./Icon";

/* Mảnh giao diện nhỏ dùng ở nhiều trang */

export const netHref = (id: string, form?: string) => `/network/${id}${form ? `/${encodeURIComponent(form)}` : ""}`;

export function Ipa({ ipa, className }: { ipa?: string; className?: string }) {
  return ipa ? <span className={cx("ipa", className)}>{ipa}</span> : null;
}

export function PosTag({ pos }: { pos?: string }) {
  return pos ? (
    <span className="pos-tag" title={POS_LABEL[pos] ?? pos}>
      ({pos})
    </span>
  ) : null;
}

export function SpeakBtn({ text, size = "sm" }: { text: string; size?: "" | "sm" }) {
  return (
    <button
      type="button"
      className="speak-btn"
      title="Nghe phát âm"
      aria-label={`Nghe phát âm “${text}”`}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        speak(text);
      }}
    >
      <Icon name="volume" size={size} />
    </button>
  );
}

export function StatusDot({ id }: { id: string }) {
  const s: Status = useProfile((st) => st.status[id] ?? "new");
  return <span className={`dot ${s}`} title={STATUS_INFO[s].label} />;
}

/** Chuỗi chip màu: tiền tố + gốc + hậu tố */
export function Chips({ parts }: { parts: string[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="plus"> + </span>}
          <span className={`chip ${affixType(p)}`}>{p}</span>
        </Fragment>
      ))}
    </>
  );
}

/** Ô hình thái lớn trong công thức cấu tạo từ — bấm để đi tới phụ tố / từ gốc */
export function Morph({ part, rootTarget }: { part: string; rootTarget?: string | null }) {
  const t = affixType(part);
  if (t === "root") {
    const inner = (
      <>
        {part}
        <small>Từ gốc</small>
      </>
    );
    return rootTarget ? (
      <Link className="morph root" to={netHref(rootTarget, part)}>
        {inner}
      </Link>
    ) : (
      <span className="morph root">{inner}</span>
    );
  }
  const a = AFFIXES[part];
  return (
    <Link className={`morph ${t}`} to={`/affixes/${encodeURIComponent(part)}`} title={a?.fn ?? ""}>
      {part}
      <small>{a ? a.vi : t === "prefix" ? "Tiền tố" : "Hậu tố"}</small>
    </Link>
  );
}

export function Progress({ value, className, title }: { value: number; className?: string; title?: string }) {
  return (
    <div className={cx("progress", className)} title={title}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card empty">
      <b>{title}</b>
      {children}
    </div>
  );
}
