"use client";

import { useEffect, useRef, useState } from "react";
import { useCloud } from "../state/cloud-provider";
import { Logo } from "../shared/ui";

export function AccountSetup({ theme }: { theme: string }) {
  const cloud = useCloud();
  const [username, setUsername] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <main className="account-setup-page">
      <div className="account-setup-brand">
        <Logo theme={theme} />
      </div>
      <section className="guest-notice-card" aria-labelledby="choose-username-title">
        <p className="eyebrow">HOÀN TẤT TÀI KHOẢN</p>
        <h1 id="choose-username-title">Chọn username</h1>
        <p>Đặt tên riêng của bạn để bắt đầu học và xuất hiện trên bảng tu luyện.</p>
        <form
          className="username-form"
          onSubmit={(event) => {
            event.preventDefault();
            void cloud.setUsername(username);
          }}
        >
          <label htmlFor="setup-username">Username</label>
          <input
            ref={input}
            id="setup-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            pattern="[a-z0-9_]{3,20}"
            minLength={3}
            maxLength={20}
            required
            aria-describedby="username-format"
          />
          <p id="username-format" className="field-hint">
            3–20 ký tự: chữ thường a–z, chữ số hoặc dấu _. Mỗi tên chỉ thuộc về một tài khoản.
          </p>
          <p className="field-hint">
            Username hiển thị trên BXH; bạn có thể ẩn khỏi bảng trong Cài đặt. Tiến độ chưa đồng bộ cho đến khi chọn tên
            xong.
          </p>
          {cloud.error && (
            <p className="inline-error" role="alert">
              {cloud.error}
            </p>
          )}
          <button className="button primary" disabled={cloud.working}>
            {cloud.working ? "Đang giữ chỗ…" : "Tạo tài khoản"}
          </button>
        </form>
        <button
          className="text-link guest-notice-continue"
          disabled={cloud.working}
          onClick={() => void cloud.logout()}
        >
          Đăng xuất
        </button>
      </section>
    </main>
  );
}
