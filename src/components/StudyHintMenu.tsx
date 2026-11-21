import { useEffect, useId, useRef, useState } from "react";
import { isSemanticHint, type StudyHintOffer, type StudyHintPrice } from "../domain/study-hints";
import type { StudyHint, StudyHintKind } from "../domain/types";

const labels: Record<StudyHintKind, string> = {
  example: "Ví dụ khác",
  definition: "Định nghĩa",
  synonym: "Đồng nghĩa",
  letter: "Chữ ngẫu nhiên",
  prefix: "Tiền tố",
  suffix: "Hậu tố",
  pronunciation: "Nghe phát âm",
  eliminate: "Loại hai đáp án sai",
};
const prices: Record<StudyHintPrice, string> = {
  free: "Miễn phí 1 lần",
  letter: "Trừ hạn mức",
  assisted: "Tính là chưa thuộc",
};

export function StudyHintMenu({
  offers,
  busy,
  onSelect,
}: {
  offers: readonly StudyHintOffer[];
  busy: boolean;
  onSelect: (offer: StudyHintOffer) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<StudyHintOffer | null>(null);

  useEffect(() => {
    if (!open) return;
    (menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)") ?? menu.current)?.focus({
      preventScroll: true,
    });
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    const node = dialog.current;
    if (!node || !confirm) return;
    if (!node.open) node.showModal();
    cancel.current?.focus();
    return () => node.close();
  }, [confirm]);

  const close = () => {
    setOpen(false);
    setConfirm(null);
    dialog.current?.close();
    trigger.current?.focus({ preventScroll: true });
  };
  const unavailable = busy || !offers.some((offer) => !offer.blocked);
  if (!offers.length && !open && !confirm) return null;

  return (
    <div
      className="study-hint-control"
      ref={root}
      data-study-hint-open={open || confirm ? "" : undefined}
      onBlur={(event) => {
        if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close();
        }
      }}
    >
      <button
        type="button"
        ref={trigger}
        className="text-link study-hint-trigger"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-disabled={busy || undefined}
        onClick={() => {
          if (!busy) setOpen(!open);
        }}
      >
        Gợi ý
      </button>
      {open && (
        <div className="study-hint-menu" id={id} role="group" aria-label="Các loại gợi ý" ref={menu} tabIndex={-1}>
          {offers.map((offer) => (
            <button
              type="button"
              key={offer.hint.kind}
              className="study-hint-item"
              disabled={busy || offer.blocked}
              onClick={() => {
                if (offer.hint.kind === "pronunciation" || offer.hint.kind === "eliminate") {
                  setOpen(false);
                  setConfirm(offer);
                } else {
                  close();
                  onSelect(offer);
                }
              }}
            >
              <span>
                {labels[offer.hint.kind]}
                {offer.blocked && <small>Vượt hạn mức chữ còn lại</small>}
              </span>
              <span className="study-hint-price" data-price={offer.price}>
                {prices[offer.price]}
              </span>
            </button>
          ))}
          {unavailable && !offers.length && <p>Không còn gợi ý cho câu này.</p>}
        </div>
      )}
      <dialog
        ref={dialog}
        className="study-hint-confirm"
        aria-labelledby={`${id}-confirmation`}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <p id={`${id}-confirmation`}>Dùng gợi ý này sẽ tính là chưa thuộc</p>
        <div>
          <button type="button" className="button secondary" ref={cancel} onClick={close}>
            Hủy
          </button>
          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={() => {
              if (confirm) {
                close();
                onSelect(confirm);
              }
            }}
          >
            Dùng gợi ý
          </button>
        </div>
      </dialog>
    </div>
  );
}

export function StudyHintCues({
  hints,
  replayPronunciation,
}: {
  hints: readonly StudyHint[];
  replayPronunciation?: () => void;
}) {
  const semantic = hints.filter(isSemanticHint);
  const pronunciation = replayPronunciation && hints.some(({ kind }) => kind === "pronunciation");
  return (
    <div className="study-hint-cues" aria-live="polite">
      {semantic.length > 0 && (
        <dl>
          {semantic.map(({ kind, value }) => (
            <div key={kind}>
              <dt>{labels[kind]}</dt>
              <dd lang="en">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {pronunciation && (
        <button type="button" className="text-link" onClick={replayPronunciation}>
          Nghe lại gợi ý phát âm
        </button>
      )}
    </div>
  );
}
