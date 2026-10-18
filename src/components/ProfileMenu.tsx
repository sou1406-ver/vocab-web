import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { targetInfo } from "@/lib/data";
import { applyTheme, THEMES, useThemePref } from "@/lib/theme";
import type { Profile } from "@/lib/types";
import type { ReviewSchedule, Status } from "@/lib/types";
import { cx } from "@/lib/util";
import { push, signIn, signOut, useCloud } from "@/state/cloud";
import { useProfile } from "@/state/profile";
import { toast, useUI } from "@/state/ui";
import { Icon } from "./Icon";

export const initials = (name: string) => (name || "?").trim().split(/\s+/).slice(-1)[0].slice(0, 1).toUpperCase();

export function Avatar({ p, size = "" }: { p: Profile; size?: "" | "sm" | "lg" }) {
  const photo = p.cloud?.photo;
  return photo ? (
    <img className={cx("avatar", size)} src={photo} alt="" referrerPolicy="no-referrer" />
  ) : (
    <span className={cx("avatar", size)} style={{ background: p.color }}>
      {initials(p.name)}
    </span>
  );
}

function createDemoProfile() {
  const before = useProfile.getState();
  const words = before.catalog.all;
  const existing = before.profiles.find((profile) => profile.name === "Demo kiểm thử");
  if (existing) before.switchProfile(existing.id);
  else
    before.addProfile({
      name: "Demo kiểm thử",
      color: "#6b3f87",
      goal: 20,
      newWordLimit: 10,
      target: 600,
      setup: true,
    });

  // Re-seeding the demo should be deterministic and must not keep old demo progress.
  useProfile.getState().resetProgress();

  const now = Date.now();
  const status: Record<string, Status> = {};
  const statusAt: Record<string, number> = {};
  const srs: Record<string, ReviewSchedule> = {};
  const stats: Record<string, { c: number; w: number }> = {};
  const lessonPositions = new Map<number, number>();

  for (const word of words) {
    const position = lessonPositions.get(word.lesson) ?? 0;
    lessonPositions.set(word.lesson, position + 1);
    // Leave one new word per lesson and spread the rest across all six boxes.
    if (position === 0) continue;
    const box = ((position - 1) % 6) + 1;
    const confirming = box === 1;
    const at = now - (box + 1) * 86_400_000;
    status[word.id] = box >= 5 ? "mastered" : "learning";
    statusAt[word.id] = at;
    srs[word.id] = {
      box,
      at,
      due: now - 60_000,
      ...(confirming ? { confirming: true, confirmations: 1 } : {}),
    };
    stats[word.id] = { c: (position % 5) + 1, w: position % 3 };
  }

  useProfile.getState().importData({ status, statusAt, srs, stats });
  useUI.getState().setQuiz({
    mode: "auto",
    type: "mixed",
    unit: "all",
    lesson: "all",
    only: "all",
    forWord: null,
  });
  useUI.getState().setMenuOpen(false);
  toast("Đã mở hồ sơ demo với từ ở các hộp 1–6");
}

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
    />
  </svg>
);

function CloudBlock() {
  const { enabled, user, status, lastSync, error } = useCloud();
  const close = () => useUI.getState().setMenuOpen(false);
  if (user) {
    const label =
      {
        syncing: "Đang đồng bộ…",
        synced: `Đã đồng bộ${lastSync ? " lúc " + lastSync.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}`,
        error: "Lỗi đồng bộ — bấm để thử lại",
        idle: "",
        offline: "",
      }[status] ?? "";
    return (
      <div className="pm-cloud">
        <div className="pm-cloud-acc">
          <GoogleG />
          <span>{user.email}</span>
        </div>
        <button className={cx("pm-sync", status)} onClick={() => void push()} title="Đồng bộ ngay">
          <span className="sync-dot" />
          {label}
        </button>
      </div>
    );
  }
  return (
    <div className={cx("pm-cloud", !enabled && "off")}>
      <button
        className="google-btn"
        disabled={!enabled}
        onClick={() => {
          close();
          void signIn();
        }}
      >
        <GoogleG /> Đăng nhập với Google
      </button>
      <p className="pm-note" style={{ border: 0, margin: 0, padding: "6px 2px 0" }}>
        {!enabled
          ? "Chưa cấu hình Firebase (src/firebase-config.ts)."
          : error === "file"
            ? "Cần mở web qua http(s) (GitHub Pages hoặc localhost) để đăng nhập."
            : "Lưu tiến độ lên tài khoản, học tiếp trên mọi thiết bị."}
      </p>
    </div>
  );
}

/** Nút avatar + menu hồ sơ (chuyển hồ sơ, giao diện sáng/tối, đăng nhập Google) */
export function ProfileMenu() {
  const navigate = useNavigate();
  const { profiles, current, switchProfile } = useProfile();
  const p = useProfile((s) => s.profile());
  const open = useUI((s) => s.menuOpen);
  const { setMenuOpen, setModal, resetSession } = useUI.getState();
  const user = useCloud((s) => s.user);
  const pref = useThemePref();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setMenuOpen]);

  const others = profiles.filter((x) => x.id !== current);
  return (
    <div className="profile-wrap" ref={wrapRef}>
      <button
        ref={btnRef}
        className="avatar-btn"
        id="avatar-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Hồ sơ học tập"
        onClick={() => setMenuOpen(!open)}
      >
        <Avatar p={p} />
        <span className="avatar-name">{p.name}</span>
      </button>
      {open && (
        <div className="profile-menu" id="profile-menu" role="menu">
          <div className="pm-head">
            <Avatar p={p} size="lg" />
            <div>
              <b>{p.name}</b>
              <span className="muted">
                Mục tiêu {targetInfo(p.target)[0]}+ · {p.goal} câu/ngày
              </span>
            </div>
          </div>
          <CloudBlock />
          <button className="pm-item" role="menuitem" onClick={() => setModal({ kind: "profile", isNew: false })}>
            <Icon name="user" size="sm" /> Sửa hồ sơ &amp; mục tiêu
          </button>
          <button
            className="pm-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              navigate("/manage");
            }}
          >
            <Icon name="folder" size="sm" /> Từ của tôi &amp; sao lưu
          </button>
          {others.length > 0 && <div className="pm-label">Chuyển hồ sơ</div>}
          {others.map((o) => (
            <button
              key={o.id}
              className="pm-item"
              role="menuitem"
              onClick={() => {
                switchProfile(o.id);
                resetSession();
                setMenuOpen(false);
                toast(`Đang dùng hồ sơ “${o.name}”`);
                navigate("/");
              }}
            >
              <Avatar p={o} size="sm" /> {o.name}
              {o.cloud && (
                <span className="muted" style={{ fontSize: ".74rem" }}>
                  {" "}
                  · Google
                </span>
              )}
            </button>
          ))}
          <button className="pm-item" role="menuitem" onClick={() => setModal({ kind: "profile", isNew: true })}>
            <Icon name="plus" size="sm" /> Thêm hồ sơ mới
          </button>
          <button
            className="pm-item"
            role="menuitem"
            onClick={() => {
              createDemoProfile();
              resetSession();
              navigate("/quiz");
            }}
          >
            <Icon name="layers" size="sm" /> Tạo / làm mới hồ sơ demo
          </button>
          <div className="pm-label">Giao diện</div>
          <div className="pm-theme" role="radiogroup" aria-label="Giao diện">
            {THEMES.map(([k, ic, label]) => (
              <button
                key={k}
                role="radio"
                aria-checked={pref === k}
                className={cx(pref === k && "active")}
                onClick={() => {
                  applyTheme(k);
                  toast(`Giao diện: ${label}`);
                }}
              >
                <Icon name={ic} size="sm" /> {label}
              </button>
            ))}
          </div>
          {p.cloud && user && (
            <button
              className="pm-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                void signOut();
              }}
            >
              <Icon name="logout" size="sm" /> Đăng xuất Google
            </button>
          )}
          <p className="pm-note">
            {p.cloud
              ? "Hồ sơ Google — tự đồng bộ lên đám mây."
              : "Hồ sơ lưu trên trình duyệt này. Đăng nhập Google hoặc dùng “Sao lưu” để học trên máy khác."}
          </p>
        </div>
      )}
    </div>
  );
}
