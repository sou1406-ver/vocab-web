"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { LogOut, Settings, LogIn } from "lucide-react";
import { useApp } from "../state/provider";
import { useCloud } from "../state/cloud-provider";
import { bookOfWord } from "../data/catalog";
import { countLearnedWords } from "../domain/cultivation";
import { CultivationAvatar } from "./CultivationAvatar";
import { syncLabels } from "./AccountPanel";
import { useContentReviewer } from "../lib/use-content-reviewer";

export function AccountMenu() {
  const { data, ready, busy } = useApp();
  const cloud = useCloud();
  const reviewer = useContentReviewer();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const hovered = useRef(false);
  const id = useId();
  const disabled = cloud.loading || cloud.working || busy || !ready;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const focusFirst = () => {
    hovered.current = false;
    setOpen(true);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("nav a")?.focus());
  };
  return (
    <div
      className="account-menu"
      ref={root}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && !open) {
          hovered.current = true;
          setOpen(true);
        }
      }}
      onPointerLeave={() => {
        if (hovered.current && !root.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="avatar"
        aria-label="Mở hồ sơ"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          setOpen(hovered.current || !open);
          hovered.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            focusFirst();
          }
        }}
      >
        <CultivationAvatar
          words={countLearnedWords(data.progress, (wordId) => Boolean(bookOfWord(wordId)))}
          seed={data.settings.avatarSeed ?? (data.settings.name.trim() || "Vocab guest")}
          decorative
        />
      </button>
      {open && (
        <div className="account-menu-position">
          <nav id={id} className="account-menu-card" aria-label="Tài khoản">
            <div className="account-menu-identity">
              <strong>{cloud.account ? `@${cloud.account.username}` : data.settings.name.trim() || "Khách"}</strong>
              <span>{cloud.user ? syncLabels[cloud.status] : "Tiến độ lưu trên máy này"}</span>
            </div>
            <Link href="/settings" onClick={() => setOpen(false)}>
              <Settings size={18} aria-hidden="true" /> Tài khoản & cài đặt
            </Link>
            {reviewer.allowed && (
              <Link href="/review" onClick={() => setOpen(false)}>
                Kiểm tra nội dung
              </Link>
            )}
            {cloud.user ? (
              <button
                disabled={disabled}
                onClick={() => {
                  void cloud.logout();
                }}
              >
                <LogOut size={18} aria-hidden="true" /> Đăng xuất
              </button>
            ) : (
              <button
                disabled={disabled}
                onClick={() => {
                  void cloud.login();
                }}
              >
                <LogIn size={18} aria-hidden="true" /> Đăng nhập bằng Google
              </button>
            )}
            {cloud.error && (
              <p className="inline-error" role="alert">
                {cloud.error}
              </p>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
