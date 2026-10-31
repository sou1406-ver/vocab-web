"use client";
import { useState } from "react";
import { useCloud } from "../state/cloud-provider";
import { useApp } from "../state/provider";
import StatusMark from "./react-bits/StatusMark";
import { UsernameSettings } from "./UsernameSettings";

export const syncLabels = {
  connecting: "Đang kết nối tài khoản…",
  syncing: "Đang đồng bộ…",
  synced: "Đã đồng bộ",
  offline: "Đang offline · Đã lưu trên máy",
  error: "Chưa đồng bộ · Đã lưu trên máy",
  conflict: "Cần chọn dữ liệu sau khôi phục",
};
export function AccountPanel() {
  const cloud = useCloud();
  const { ready, busy, data } = useApp();
  const [exportedRevision, setExportedRevision] = useState<number>();
  const disabled = cloud.loading || cloud.working || busy || !ready;
  const exportConflict = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ app: "VocabLearn-v2", exportedAt: new Date().toISOString(), data })], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "vocab-before-cloud-restore.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportedRevision(data.revision);
  };
  return (
    <section className="panel account-panel" aria-labelledby="account-heading">
      <div className="section-heading">
        <h2 id="account-heading">Tài khoản & đồng bộ</h2>
        {cloud.user && (
          <button className="button primary account-logout" disabled={disabled} onClick={() => void cloud.logout()}>
            Đăng xuất
          </button>
        )}
      </div>
      {cloud.loading ? (
        <p role="status">Đang mở tài khoản…</p>
      ) : cloud.user ? (
        <>
          <div className="account-summary">
            <p className="account-name">
              <strong>{cloud.account ? `@${cloud.account.username}` : "Tài khoản Google"}</strong>
              <span>{cloud.user.email}</span>
            </p>
            <StatusMark
              status={
                cloud.status === "synced"
                  ? "done"
                  : cloud.status === "error" || cloud.status === "conflict"
                    ? "failed"
                    : cloud.status === "offline"
                      ? "pending"
                      : "running"
              }
              size={18}
              label={syncLabels[cloud.status]}
            />
          </div>
          <details className="account-details">
            <summary>Quản lý tài khoản</summary>
            <UsernameSettings />
            <p className="muted">
              Tiến độ, từ riêng và cài đặt được đồng bộ giữa các máy. Lượt bài đang làm giữ riêng trên mỗi máy.
            </p>
          </details>
          {cloud.guestAvailable && (
            <div className="account-import" aria-label="Nhập tiến độ trên máy">
              <h3>Mang tiến độ trên máy vào tài khoản?</h3>
              <p>
                Chỉ nhập khi đây là dữ liệu của bạn. Giữ nguyên bản khách trên máy; kết quả trùng không được tính hai
                lần. Tiến độ tài khoản được ưu tiên khi đã có cùng từ.
              </p>
              <div className="import-actions">
                <button
                  className="button primary"
                  disabled={disabled || cloud.status === "connecting"}
                  onClick={() => void cloud.decideGuest(true)}
                >
                  Nhập tiến độ vào tài khoản
                </button>
                <button className="button secondary" disabled={disabled} onClick={() => void cloud.decideGuest(false)}>
                  Giữ riêng dữ liệu khách
                </button>
              </div>
            </div>
          )}
          {cloud.status === "conflict" && (
            <div className="account-import">
              <p>
                Tài khoản đã khôi phục bản sao trên máy khác. Xuất dữ liệu chưa gửi ở máy này trước khi dùng bản mới.
              </p>
              <div className="import-actions">
                <button className="button secondary" onClick={exportConflict}>
                  Tải bản sao chưa đồng bộ
                </button>
                <button
                  className="button primary"
                  disabled={exportedRevision !== data.revision || disabled}
                  onClick={() => void cloud.acceptRestored()}
                >
                  Dùng dữ liệu mới trên tài khoản
                </button>
              </div>
            </div>
          )}
          {(cloud.status === "error" || cloud.status === "offline") && (
            <div className="import-actions">
              <button className="button secondary" disabled={disabled} onClick={cloud.retry}>
                Thử đồng bộ lại
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p>Đăng nhập để giữ tiến độ và tiếp tục học trên thiết bị khác. Bạn vẫn có thể học không cần tài khoản.</p>
          <button className="button primary" disabled={disabled} onClick={() => void cloud.login()}>
            Đăng nhập bằng Google
          </button>
        </>
      )}
      {cloud.error && (
        <p className="inline-error" role="alert">
          {cloud.error}
        </p>
      )}
    </section>
  );
}
