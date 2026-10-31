"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Cloud, Laptop, LogIn, ShieldCheck } from "lucide-react";
import { useApp } from "../state/provider";
import { useCloud } from "../state/cloud-provider";
import { acknowledgeGuestNotice, hasAcknowledgedGuestNotice } from "../lib/guest-notice";

export function GuestStudyNotice({ children }: { children: ReactNode }) {
  const { data, profileKey, ready, busy } = useApp();
  const cloud = useCloud();
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null);
  useEffect(() => setAcknowledged(hasAcknowledgedGuestNotice()), []);
  const active = data.session && data.session.phase !== "complete";
  if (!active || profileKey !== "guest") return children;
  if (!ready || acknowledged === null)
    return (
      <div className="page" role="status">
        Đang mở lượt học…
      </div>
    );
  if (acknowledged) return children;
  return (
    <div className="page guest-notice-page">
      <section className="guest-notice-card" aria-labelledby="guest-notice-title">
        <span className="guest-notice-icon" aria-hidden="true">
          <LogIn size={32} />
        </span>
        <h1 id="guest-notice-title">Đăng nhập để giữ tiến độ</h1>
        <p>Đăng nhập Google miễn phí để lưu tiến độ và tiếp tục học trên thiết bị khác.</p>
        <ul className="guest-notice-benefits">
          <li>
            <Cloud size={20} aria-hidden="true" />
            Đồng bộ từ đã học và lịch ôn
          </li>
          <li>
            <Laptop size={20} aria-hidden="true" />
            Tiếp tục học trên máy khác
          </li>
          <li>
            <ShieldCheck size={20} aria-hidden="true" />
            Đăng nhập nhanh bằng Google
          </li>
        </ul>
        <p className="guest-notice-local">
          Chưa đăng nhập, tiến độ vẫn lưu trên trình duyệt này. Nếu xóa dữ liệu trang web hoặc đổi máy, bạn có thể mất
          tiến độ.
        </p>
        <button
          className="button primary guest-notice-login"
          disabled={cloud.working || busy}
          onClick={() => void cloud.login()}
        >
          <LogIn size={20} aria-hidden="true" />
          {cloud.working ? "Đang đăng nhập…" : "Đăng nhập bằng Google"}
        </button>
        <button
          className="text-link guest-notice-continue"
          disabled={cloud.working || busy}
          onClick={() => {
            acknowledgeGuestNotice();
            setAcknowledged(true);
          }}
        >
          Tiếp tục không đăng nhập
        </button>
        {cloud.error && (
          <p className="inline-error" role="alert">
            {cloud.error}
          </p>
        )}
      </section>
    </div>
  );
}
