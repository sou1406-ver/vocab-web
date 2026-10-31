"use client";

import { useState } from "react";
import { useCloud } from "../state/cloud-provider";

export function UsernameSettings() {
  const cloud = useCloud();
  const [draft, setDraft] = useState<{ uid: string; value: string }>();
  if (!cloud.user || !cloud.account) return null;
  const uid = cloud.user.uid;
  const username = draft?.uid === uid ? draft.value : cloud.account.username;
  return (
    <div className="username-settings">
      <form
        className="username-form"
        onSubmit={(event) => {
          event.preventDefault();
          void cloud.setUsername(username);
        }}
      >
        <label htmlFor="account-username">Username</label>
        <input
          id="account-username"
          value={username}
          onChange={(event) => setDraft({ uid, value: event.target.value })}
          autoComplete="username"
          autoCapitalize="none"
          lang="en"
          autoCorrect="off"
          spellCheck={false}
          pattern="[a-z0-9_]{3,20}"
          minLength={3}
          maxLength={20}
          required
        />
        <p className="field-hint">Đổi tên sẽ giải phóng username cũ cho người khác.</p>
        <button className="button secondary" disabled={cloud.working || username === cloud.account.username}>
          {cloud.working ? "Đang lưu…" : "Đổi username"}
        </button>
      </form>
      <label className="deep-roots-toggle">
        <input
          type="checkbox"
          aria-label="Ẩn khỏi bảng xếp hạng"
          checked={cloud.account.hiddenLeaderboard}
          disabled={cloud.working}
          onChange={(event) => void cloud.setLeaderboardHidden(event.target.checked)}
        />
        <span>
          <strong>Ẩn khỏi bảng xếp hạng</strong>
          <small>Ẩn hồ sơ công khai, vẫn giữ username và toàn bộ tiến độ học.</small>
        </span>
      </label>
    </div>
  );
}
