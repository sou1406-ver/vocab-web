"use client";
import { type ReactNode, type RefObject } from "react";
import type { Word } from "../domain/types";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "../state/provider";
import { brandIcons } from "./brand-icons";
import { setWordSaved } from "../domain/personal";
import { speak } from "../lib/speech";
import { useEnglishVoices } from "../lib/use-english-voices";

const iconAliases = {
  book: "lessons",
  search: "library",
  chart: "progress",
  arrow: "arrow-right",
  repeat: "review",
  sound: "audio",
  leaf: "knowledge",
  chevron: "chevron-right",
} as const;
const supplementalIcons = {
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
  upload: <path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01" />
    </>
  ),
};
export type IconName = keyof typeof brandIcons | keyof typeof iconAliases | keyof typeof supplementalIcons;
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const canonical = iconAliases[name as keyof typeof iconAliases] ?? name;
  const shape = brandIcons[canonical as keyof typeof brandIcons];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={size <= 16 ? 1.5 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape ? (
        <>
          {shape.p.map((d, i) => (
            <path key={i} d={d} />
          ))}
          {shape.d.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
          ))}
        </>
      ) : (
        supplementalIcons[name as keyof typeof supplementalIcons]
      )}
    </svg>
  );
}
export function Logo({ theme = "light", compact = false }: { theme?: string; compact?: boolean }) {
  const variant = theme === "dark" ? "dark" : "light";
  return (
    <picture className="brand-logo">
      {compact && <source media="(min-width: 681px) and (max-width: 900px)" srcSet={`/brand/symbol-${variant}.svg`} />}
      <img src={`/brand/logo-${variant}.svg`} alt="Vocab Learn" width={1165} height={218} fetchPriority="high" />
    </picture>
  );
}
export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="leaf" size={28} />
      </span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Speak({ text }: { text: string }) {
  const voices = useEnglishVoices();
  if (!voices.length) return null;
  return (
    <button
      type="button"
      className="icon-button sound-button"
      onClick={() => speak(text)}
      aria-label={`Nghe phát âm ${text}`}
      title="Nghe phát âm"
    >
      <Icon name="sound" />
    </button>
  );
}
export function WordContent({ word }: { word: Word }) {
  return (
    <div className="word-content">
      <div className="word-heading">
        <h2 lang="en">{word.text}</h2>
        <Speak text={word.text} />
      </div>
      <div className="word-meta">
        <span className="pos">{word.pos}</span>
        <span lang="en">{word.ipa}</span>
      </div>
      <p className="word-meaning">{word.meaning}</p>
      <p className="muted" lang="en">
        {word.definition}
      </p>
      {word.examples.slice(0, 2).map((example, i) => (
        <blockquote key={i}>
          <p lang="en">{example.text}</p>
          {example.translation && <footer>{example.translation}</footer>}
        </blockquote>
      ))}
      {!!word.family.length && (
        <details className="word-family">
          <summary>Họ từ · {word.family.length} dạng</summary>
          <div>
            {word.family.map((f, i) => (
              <div className="family-row" key={i}>
                <b lang="en">{f.text}</b>
                <span className="pos">{f.pos}</span>
                <span>{f.meaning}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
export function WordDialog({
  word,
  close,
  opener,
}: {
  word: Word | null;
  close: () => void;
  opener: RefObject<HTMLElement | null>;
}) {
  const { ready, data, busy, change } = useApp();
  const saved = word ? (data.savedWords ?? []).includes(word.id) : false;
  return (
    <Dialog
      open={Boolean(word)}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="word-dialog max-h-[85dvh] w-[calc(100%-30px)] max-w-[620px] overflow-y-auto rounded-[20px] bg-card p-7 pt-10 sm:p-9"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener.current?.focus({ preventScroll: true });
        }}
      >
        <DialogTitle className="sr-only">Chi tiết từ</DialogTitle>
        <DialogDescription className="sr-only">Nghĩa, ví dụ và lưu vào bộ cá nhân.</DialogDescription>
        {word && (
          <>
            <WordContent word={word} />
            <div className="word-save">
              <Button
                disabled={!ready || busy}
                variant={saved ? "secondary" : "default"}
                className="min-h-11"
                onClick={() => void change((s) => setWordSaved(s, word.id, !saved))}
              >
                {saved ? "Bỏ lưu từ" : "Lưu vào bộ cá nhân"}
              </Button>
              <span className="saved-notice" role="status">
                {!ready
                  ? "Cần mở được dữ liệu trên máy để lưu."
                  : saved
                    ? "Đã lưu trên máy · chưa tính là đã học."
                    : "Lưu để học sau, chưa thay đổi lịch ôn."}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
