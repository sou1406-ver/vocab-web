"use client";
import { Fragment, useEffect, useState, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../state/provider";
import { Icon, Logo, WordDialog, type IconName } from "../shared/ui";
import { WordContext } from "./context";
import type { Word } from "../domain/types";
import { AccountMenu } from "../components/AccountMenu";
import { AccountSetup } from "../components/AccountSetup";
import StatusMark from "../components/react-bits/StatusMark";
import { useCloud } from "../state/cloud-provider";
import { syncLabels } from "../components/AccountPanel";
import { LeaderboardSync } from "../components/LeaderboardSync";
const links: { to: string; label: string; icon: IconName; end?: boolean; group?: string; deep?: boolean }[] = [
  { to: "/", label: "Hôm nay", icon: "home", end: true },
  { to: "/lessons", label: "Bài học", icon: "book", group: "HỌC TẬP" },
  { to: "/library", label: "Thư viện", icon: "search" },
  { to: "/knowledge", label: "Kiến thức", icon: "leaf" },
  { to: "/roots", label: "Gốc từ", icon: "leaf", group: "HỌC SÂU", deep: true },
  { to: "/progress", label: "Tiến độ", icon: "chart", group: "THEO DÕI" },
  { to: "/leaderboard", label: "Bảng tu luyện", icon: "target" },
];
export function Shell({ children }: { children: ReactNode }) {
  const { data, ready, error, busy, change, clearError } = useApp();
  const cloud = useCloud();
  const pathname = usePathname();
  const [word, setWord] = useState<Word | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [online, setOnline] = useState(true);
  const [resolvedTheme, setResolvedTheme] = useState("light");
  const studying = pathname === "/study";
  const visibleLinks = links.filter((link) => !link.deep || data.settings.deepRoots === true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  useEffect(() => {
    setWord(null);
    document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  }, [pathname]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme = data.settings.theme === "system" ? (media.matches ? "dark" : "light") : data.settings.theme;
      document.documentElement.dataset.theme = theme;
      setResolvedTheme(theme);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data.settings.theme]);
  const inspect = async (selected: Word) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const session = data.session;
    if (session?.phase === "question" && session.questions[session.index].wordId === selected.id) {
      const saved = await change((state) =>
        state.session?.id === session.id && state.session.index === session.index
          ? { ...state, session: { ...state.session, peeked: true } }
          : state,
      );
      if (!saved) return;
    }
    setWord(selected);
  };
  const date = new Intl.DateTimeFormat("vi", {
    day: "numeric",
    month: "long",
    timeZone: data.settings.timezone,
  }).format();
  if (cloud.loading && !cloud.account)
    return (
      <main className="account-setup-page">
        <p role="status">Đang mở tài khoản…</p>
      </main>
    );
  if (cloud.user && !cloud.account) return <AccountSetup theme={resolvedTheme} />;
  return (
    <WordContext.Provider value={(selected) => void inspect(selected)}>
      <LeaderboardSync />
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <div className={`app-shell${studying ? " is-studying" : ""}`}>
        <aside className="sidebar">
          <Link className="brand" href="/" aria-label="Vocab Learn — Hôm nay">
            <Logo theme={resolvedTheme} compact />
          </Link>
          <div className="sidebar-caption">GÓC HỌC CỦA BẠN</div>
          <nav className="main-nav" aria-label="Điều hướng chính">
            {visibleLinks.map((link) => (
              <Fragment key={link.to}>
                {link.group && <div className="nav-section-label">{link.group}</div>}
                <Link
                  href={link.to}
                  aria-current={
                    pathname === link.to || (link.to !== "/" && pathname.startsWith(link.to + "/")) ? "page" : undefined
                  }
                  aria-label={link.label}
                  className={
                    pathname === link.to || (link.to !== "/" && pathname.startsWith(link.to + "/"))
                      ? "nav-item active"
                      : "nav-item"
                  }
                >
                  <Icon name={link.icon} />
                  <span>{link.label}</span>
                  <span className="nav-dot" />
                </Link>
              </Fragment>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="nav-section-label">TÀI KHOẢN</div>
            <Link href="/settings" className="sidebar-settings" aria-label="Cài đặt và sao lưu">
              <Icon name="settings" />
              <span>Cài đặt & sao lưu</span>
            </Link>
            <div className="build-label">
              Vocab Learn <span>BẢN THỬ NGHIỆM</span>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <Link className="mobile-brand" href="/" aria-label="Vocab Learn — Hôm nay">
              <Logo theme={resolvedTheme} />
            </Link>
            <span className="topbar-location">
              <span className="mini-leaf">
                <Icon name="leaf" size={16} />
              </span>{" "}
              Không gian học tập{" "}
              <span className="topbar-date" suppressHydrationWarning>
                / {date}
              </span>
            </span>
            <div className="topbar-actions">
              <StatusMark
                className="save-status"
                size={16}
                status={
                  error
                    ? "failed"
                    : !ready || busy
                      ? "running"
                      : cloud.user
                        ? cloud.status === "synced"
                          ? "done"
                          : cloud.status === "error" || cloud.status === "conflict"
                            ? "failed"
                            : cloud.status === "offline"
                              ? "pending"
                              : "running"
                        : "done"
                }
                label={
                  error
                    ? "Cần kiểm tra"
                    : !ready
                      ? "Đang mở dữ liệu…"
                      : busy
                        ? "Đang lưu…"
                        : cloud.user
                          ? syncLabels[cloud.status]
                          : "Lưu trên máy"
                }
              />
              <button
                className="icon-button theme-toggle"
                aria-label="Đổi giao diện sáng tối"
                disabled={!ready || busy}
                onClick={() =>
                  void change((s) => ({
                    ...s,
                    settings: { ...s.settings, theme: resolvedTheme === "dark" ? "light" : "dark" },
                  }))
                }
              >
                <Icon name={resolvedTheme === "dark" ? "sun" : "moon"} />
              </button>
              <AccountMenu key={cloud.user?.uid ?? "guest"} />
            </div>
          </header>
          {!online && (
            <div className="offline-note" role="status">
              Bạn đang offline. Tiến độ vẫn được lưu trên thiết bị này.
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              {data.session && data.session.phase !== "complete" && !studying && (
                <Link href="/study">Tiếp tục lượt học</Link>
              )}
              <button className="icon-button" aria-label="Đóng thông báo" onClick={clearError}>
                <Icon name="close" />
              </button>
            </div>
          )}
          <main id="main">
            {ready ? (
              <div key={cloud.user?.uid ?? "guest"}>{children}</div>
            ) : (
              <p className="muted" role="status">
                Đang mở dữ liệu học…
              </p>
            )}
          </main>
          <footer className="app-footer">
            <span>Học để hiểu. Ôn để nhớ.</span>
            <Link href="/progress">Tiến độ học của bạn →</Link>
          </footer>
        </div>
        {!studying && (
          <nav className="mobile-nav" aria-label="Điều hướng trên điện thoại">
            {visibleLinks
              .filter((link) => link.to !== "/progress" && link.to !== "/leaderboard")
              .map((link) => (
                <Link className={pathname === link.to ? "active" : undefined} key={link.to} href={link.to}>
                  <Icon name={link.icon} />
                  <span>{link.label}</span>
                </Link>
              ))}
          </nav>
        )}
      </div>
      <WordDialog word={word} close={() => setWord(null)} opener={opener} />
    </WordContext.Provider>
  );
}
