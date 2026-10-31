"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { avatarSeeds } from "../lib/avatar";
import { useCloud } from "../state/cloud-provider";
import { cultivationOf, cultivationRealms, rankCultivators, type Cultivator } from "../domain/cultivation";
import { CultivationAvatar } from "../components/CultivationAvatar";
import { CultivationCard } from "../components/CultivationCard";

type Connection = { uid?: string; rows: Cultivator[]; own: Cultivator | null; ready: boolean; error: string };
const initial: Connection = { rows: [], own: null, ready: false, error: "" };

export default function Leaderboard() {
  const cloud = useCloud();
  const uid = cloud.user?.uid;
  const [connection, setConnection] = useState<Connection>(initial);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const subscriptions: (() => void)[] = [];
    setConnection({ ...initial, uid });
    if (!uid) return;
    const fail = (reason: unknown) => {
      const denied = reason && typeof reason === "object" && "code" in reason && reason.code === "permission-denied";
      if (active)
        setConnection((state) => ({
          ...state,
          error: denied
            ? "Bảng tu luyện online chưa được bật. Cảnh giới cá nhân vẫn sử dụng bình thường."
            : "Chưa tải được bảng tu luyện. Hãy kiểm tra kết nối và thử lại.",
        }));
    };
    void import("../data/leaderboard-cloud")
      .then((api) => {
        if (!active) return;
        subscriptions.push(
          api.watchLeaderboard((rows) => {
            if (active) setConnection((state) => ({ ...state, rows, ready: true, error: "" }));
          }, fail),
        );
        subscriptions.push(
          api.watchCultivator(
            uid,
            (own) => {
              if (active) setConnection((state) => ({ ...state, own }));
            },
            fail,
          ),
        );
      })
      .catch(fail);
    return () => {
      active = false;
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [uid, attempt]);
  const current = connection.uid === uid ? connection : initial;
  const rankings = rankCultivators(current.rows);
  return (
    <div className="page leaderboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MỖI TỪ MỘT BƯỚC TIẾN</p>
          <h1 tabIndex={-1}>
            Bảng tu luyện<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">Cùng tích lũy vốn từ, từng bước tiến cảnh giới.</p>
        </div>
      </div>
      <CultivationCard action={{ href: "/lessons", label: "Học thêm từ" }} />
      <div className="leaderboard-columns">
        <section className="panel" aria-labelledby="ranking-title">
          <div className="section-heading">
            <h2 id="ranking-title">Đạo hữu dẫn đầu</h2>
            <span className="muted">Tối đa 50 người</span>
          </div>
          <p className="muted">Xếp theo số từ giáo trình đã học và kiểm tra trên tất cả sách. Cùng số từ, cùng hạng.</p>
          {!uid ? (
            <p className="quiet-note">Đăng nhập để xem bảng tu luyện của cộng đồng.</p>
          ) : current.error ? (
            <div role="alert">
              <p>{current.error}</p>
              <button className="button secondary" onClick={() => setAttempt((value) => value + 1)}>
                Thử tải lại
              </button>
            </div>
          ) : !current.ready ? (
            <p role="status">Đang tải bảng tu luyện…</p>
          ) : rankings.length ? (
            <ol className="cultivator-list">
              {rankings.map((entry) => (
                <li className={entry.id === uid ? "cultivator-row is-self" : "cultivator-row"} key={entry.id}>
                  <span className="cultivator-rank" aria-label={`Hạng ${entry.rank}`}>
                    #{entry.rank}
                  </span>
                  <CultivationAvatar words={entry.learnedCount} seed={avatarSeeds[entry.avatar]} decorative />
                  <div className="cultivator-name">
                    <strong>{entry.username}</strong>
                    <small>
                      {cultivationOf(entry.learnedCount).name}
                      {entry.id === uid ? " · Bạn" : ""}
                    </small>
                  </div>
                  <span className="cultivator-score">
                    <strong>{entry.learnedCount}</strong>
                    <small>từ đã học</small>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="quiet-note">Chưa có đạo hữu tham gia. Hãy mở đầu hành trình này.</p>
          )}
          {current.own && current.ready && !rankings.some((entry) => entry.id === uid) && (
            <p className="quiet-note">Bạn đã tham gia; hiện chưa nằm trong 50 người dẫn đầu.</p>
          )}
        </section>
        <section className="panel" aria-labelledby="public-profile-title">
          <div className="section-heading">
            <h2 id="public-profile-title">Hồ sơ tu luyện</h2>
          </div>
          {uid && cloud.account ? (
            <>
              <p className="account-name">
                <strong>@{cloud.account.username}</strong>
              </p>
              <p className="muted">
                {cloud.account.hiddenLeaderboard
                  ? "Bạn đang ẩn khỏi bảng xếp hạng. Username và tiến độ vẫn được giữ."
                  : "Avatar, username, cảnh giới và số từ đã học hiển thị với người đã đăng nhập."}
              </p>
              {cloud.status !== "synced" && (
                <p className="quiet-note">Số từ sẽ cập nhật sau khi tiến độ đồng bộ xong.</p>
              )}
              <Link href="/settings" className="button secondary">
                Cài đặt username & hiển thị
              </Link>
            </>
          ) : (
            <>
              <p className="muted">
                Đăng nhập Google và chọn username để hoàn tất tài khoản. Khách vẫn có thể học trên máy, không xuất hiện
                trên BXH.
              </p>
              <button
                className="button primary"
                disabled={cloud.loading || cloud.working}
                onClick={() => void cloud.login()}
              >
                {cloud.working ? "Đang đăng nhập…" : "Đăng nhập bằng Google"}
              </button>
              {cloud.error && (
                <p className="inline-error" role="alert">
                  {cloud.error}
                </p>
              )}
            </>
          )}
          <p className="quiet-note">Cảnh giới tính theo số từ đã học, chưa phải mức thành thạo.</p>
        </section>
      </div>
      <details className="panel cultivation-realms">
        <summary>12 cảnh giới tu luyện</summary>
        <ol>
          {cultivationRealms.map((realm) => (
            <li key={realm.name}>
              <CultivationAvatar words={realm.words} decorative />
              <strong>{realm.name}</strong>
              <span>{realm.words} từ</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
