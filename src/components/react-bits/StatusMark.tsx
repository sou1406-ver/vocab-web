// Adapted from React Bits Status Mark by David Haz (2026).
// Source: https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Micro/StatusMark
// MIT + Commons Clause: see LICENSE.md in this directory.
// Local adaptation: CSS motion, Vietnamese labels, brand tokens and decorative mode.
// Styles are imported by app/globals.css to preserve the application's layer order.
import type { CSSProperties, ReactNode } from "react";

export type StatusMarkStatus = "pending" | "running" | "done" | "failed" | "cancelled";
const TEXT: Record<StatusMarkStatus, string> = {
  pending: "Đang chờ",
  running: "Đang xử lý",
  done: "Đã hoàn tất",
  failed: "Có lỗi",
  cancelled: "Đã hủy",
};

export default function StatusMark({
  status = "pending",
  progress,
  label,
  size = 20,
  decorative = false,
  className = "",
}: {
  status?: StatusMarkStatus;
  progress?: number;
  label?: ReactNode;
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  const C = 2 * Math.PI * 9;
  const P = C / 8;
  const determinate = status === "running" && typeof progress === "number" && Number.isFinite(progress);
  const indeterminate = status === "running" && !determinate;
  const solid = status === "running" || status === "done" || status === "failed";
  const arc = indeterminate ? 0.68 : determinate ? Math.min(1, Math.max(0, progress!)) : 1;
  const dash = solid ? arc * C : 0.3 * P;
  const gap = solid ? (1 - arc) * C : 0.7 * P;
  const hasLabel = label !== undefined && label !== null;
  const spoken = TEXT[status] + (determinate ? `, ${Math.round(arc * 100)}%` : "");
  return (
    <span
      className={`status-mark ${className}`.trim()}
      data-status={status}
      data-indeterminate={indeterminate || undefined}
      aria-hidden={decorative || undefined}
      style={{ "--sm-size": `${size}px` } as CSSProperties}
    >
      <svg
        className="status-mark__glyph"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        role={hasLabel || decorative ? undefined : "img"}
        aria-label={hasLabel || decorative ? undefined : spoken}
        aria-hidden={hasLabel || decorative || undefined}
        focusable="false"
      >
        <circle className="status-mark__track" cx="12" cy="12" r="9" />
        <g className="status-mark__rotation">
          <circle
            className="status-mark__ring"
            cx="12"
            cy="12"
            r="9"
            transform="rotate(-90 12 12)"
            style={{ strokeDasharray: `${dash} ${gap}` }}
          />
        </g>
        <path className="status-mark__check" d="M7.5 12.25 10.5 15.25 16.75 8.75" pathLength="1" />
        <path className="status-mark__cross" d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5" pathLength="1" />
      </svg>
      {hasLabel && <span className="status-mark__label">{label}</span>}
    </span>
  );
}
