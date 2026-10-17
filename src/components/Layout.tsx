import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useUI } from "@/state/ui";
import { GlobalSearch } from "./GlobalSearch";
import { Icon, type IconName } from "./Icon";
import { ProfileModal, WordModal } from "./Modals";
import { ProfileMenu } from "./ProfileMenu";

export const TABS: { to: string; label: string; short: string; icon: IconName; end?: boolean }[] = [
  { to: "/topics", label: "Chủ đề", short: "Chủ đề", icon: "grid" },
  { to: "/review", label: "Ôn tập", short: "Ôn tập", icon: "repeat" },
  { to: "/knowledge", label: "Kiến thức", short: "Kiến thức", icon: "book" },
  { to: "/", label: "Tổng quan", short: "Tổng quan", icon: "home", end: true },
];

const PRACTICE_LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: "/network", label: "Trường từ", icon: "network" },
  { to: "/flashcards", label: "Flashcard", icon: "layers" },
  { to: "/quiz", label: "Bài tập", icon: "pencil" },
];

function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const modal = useUI((s) => s.modal);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const practiceTopRef = useRef<HTMLDivElement>(null);
  const practiceBottomRef = useRef<HTMLDivElement>(null);
  const tabKey = pathname.split("/")[1] || "dash";
  const prevTab = useRef(tabKey);
  const practiceActive =
    pathname.startsWith("/term/") || PRACTICE_LINKS.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`));

  // Đổi tab: cuộn lên đầu trang
  useEffect(() => {
    if (prevTab.current !== tabKey) window.scrollTo(0, 0);
    prevTab.current = tabKey;
  }, [tabKey]);

  useEffect(() => {
    if (!practiceOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!practiceTopRef.current?.contains(target) && !practiceBottomRef.current?.contains(target))
        setPracticeOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setPracticeOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [practiceOpen]);

  const practiceMenu = (compact: boolean, ref: RefObject<HTMLDivElement>) => (
    <div className={`practice-menu${compact ? " compact" : ""}`} ref={ref}>
      <button
        type="button"
        className={`${compact ? "" : "tab"}${practiceActive ? " active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={practiceOpen}
        aria-label="Luyện tập"
        onClick={() => setPracticeOpen((open) => !open)}
      >
        <Icon name="pencil" size={compact ? undefined : "sm"} />
        <span>{compact ? "Luyện" : "Luyện tập"}</span>
      </button>
      {practiceOpen && (
        <div className="practice-popover" role="menu">
          {PRACTICE_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => setPracticeOpen(false)}
              className={({ isActive }) =>
                isActive || pathname.startsWith(`${item.to}/`) || (item.to === "/network" && pathname.startsWith("/term/"))
                  ? "active"
                  : ""
              }
            >
              <Icon name={item.icon} size="sm" /> {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <button className="brand" onClick={() => navigate("/")} aria-label="Vocab Learn — về trang tổng quan">
            <img className="brand-logo" src="./logo-mark.png" alt="" width="36" height="36" />
            <div>
              <div className="brand-name">
                Vocab <span>Learn</span>
              </div>
              <div className="brand-sub">600 Essential Words · TOEIC</div>
            </div>
          </button>
          <nav className="tabs" aria-label="Các trang">
            {TABS.slice(0, 1).map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab${isActive ? " active" : ""}`}>
                <Icon name={t.icon} size="sm" />
                <span className="tl">{t.label}</span>
                <span className="ts">{t.short}</span>
              </NavLink>
            ))}
            {practiceMenu(false, practiceTopRef)}
            {TABS.slice(1).map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `tab${isActive || (t.to === "/knowledge" && pathname.startsWith("/affixes")) ? " active" : ""}`
                }
              >
                <Icon name={t.icon} size="sm" />
                <span className="tl">{t.label}</span>
                <span className="ts">{t.short}</span>
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <GlobalSearch />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <main id="app" className="container page-enter" key={tabKey}>
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Các trang">
        {TABS.slice(0, 1).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              isActive ? "active" : ""
            }
          >
            <Icon name={t.icon} />
            <span>{t.short}</span>
          </NavLink>
        ))}
        {practiceMenu(true, practiceBottomRef)}
        {TABS.slice(1).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              isActive || (t.to === "/knowledge" && pathname.startsWith("/affixes")) ? "active" : ""
            }
          >
            <Icon name={t.icon} />
            <span>{t.short}</span>
          </NavLink>
        ))}
      </nav>
      <Toasts />
      {modal?.kind === "profile" && <ProfileModal isNew={modal.isNew} />}
      {modal?.kind === "word" && <WordModal id={modal.id} />}
    </>
  );
}

/** Khung modal: đóng khi bấm nền hoặc phím Esc, tự focus ô đầu tiên */
export function ModalFrame({ children, width, onClose }: { children: ReactNode; width?: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLInputElement>("input, select, textarea")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} style={{ display: "contents" }} data-width={width}>
        {children}
      </div>
    </div>
  );
}
