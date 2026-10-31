"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { avatarSeeds } from "../lib/avatar";
import { readSyncedCultivatorSummary } from "../data/cultivation-summary";
import { useApp } from "../state/provider";
import { useCloud } from "../state/cloud-provider";
import { cultivationOf, cultivationRealms, rankCultivators, type Cultivator } from "../domain/cultivation";
import { CultivationAvatar } from "../components/CultivationAvatar";
import { CultivationCard } from "../components/CultivationCard";

type Connection = { uid?: string; rows: Cultivator[]; own: Cultivator | null; ready: boolean; error: string };
const initial: Connection = { rows: [], own: null, ready: false, error: "" };

export default function Leaderboard() {
  const { profileKey, ready } = useApp();
  const cloud = useCloud();
  const uid = cloud.user?.uid;
  const [connection, setConnection] = useState<Connection>(initial);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<{ uid: string; value: string }>();
  const [consent, setConsent] = useState(false);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<{ uid: string; message: string }>();
  const actionTicket = useRef(0);
  useEffect(() => {
    let active = true;
    actionTicket.current++;
    const subscriptions: (() => void)[] = [];
    setConnection({ ...initial, uid });
    setConsent(false);
    setWorking(false);
    if (!uid) return;
    const fail = () => {
      if (active)
        setConnection((state) => ({
          ...state,
          error: "Chưa tải được bảng tu luyện. Hãy kiểm tra kết nối và thử lại.",
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
  const nickname = draft && draft.uid === uid ? draft.value : (current.own?.nickname ?? "");
  const canSave = ready && uid && profileKey === `user:${uid}` && cloud.status === "synced" && !working;
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || (!current.own && !consent)) return;
    const ticket = ++actionTicket.current;
    setWorking(true);
    setActionError(undefined);
    try {
      const summary = await readSyncedCultivatorSummary(uid);
      if (ticket !== actionTicket.current) return;
      await (await import("../data/leaderboard-cloud")).joinLeaderboard(uid, nickname, summary.count, summary.avatar);
    } catch (reason) {
      if (ticket === actionTicket.current)
        setActionError({ uid, message: reason instanceof Error ? reason.message : "Chưa lưu được hồ sơ tu luyện." });
    } finally {
      if (ticket === actionTicket.current) setWorking(false);
    }
  };
  const leave = async () => {
    if (!uid || working) return;
    const ticket = ++actionTicket.current;
    setWorking(true);
    setActionError(undefined);
    try {
      await (await import("../data/leaderboard-cloud")).leaveLeaderboard(uid);
      if (ticket === actionTicket.current) setConsent(false);
    } catch {
      if (ticket === actionTicket.current)
        setActionError({ uid, message: "Chưa rời được bảng tu luyện. Hãy kiểm tra kết nối và thử lại." });
    } finally {
      if (ticket === actionTicket.current) setWorking(false);
    }
  };
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
                    <strong>{entry.nickname}</strong>
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
            <h2 id="public-profile-title">{current.own ? "Hồ sơ tu luyện" : "Tham gia bảng tu luyện"}</h2>
          </div>
          {uid ? (
            <form className="leaderboard-form" onSubmit={(event) => void save(event)}>
              <p className="muted">
                Biệt danh, avatar, cảnh giới và số từ đã học sẽ hiện với người đã đăng nhập. Mỗi từ chỉ tính một lần.
              </p>
              <label htmlFor="cultivator-nickname">Biệt danh công khai</label>
              <input
                id="cultivator-nickname"
                value={nickname}
                maxLength={32}
                minLength={2}
                required
                autoComplete="off"
                placeholder="Ví dụ: Đạo hữu ham học"
                onChange={(event) => setDraft({ uid, value: event.target.value })}
              />
              {!current.own && (
                <label className="leaderboard-consent">
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                  Tôi đồng ý hiện biệt danh, avatar, cảnh giới và số từ đã học trên bảng.
                </label>
              )}
              {cloud.status !== "synced" && (
                <p className="quiet-note">Đợi tiến độ đồng bộ xong để cập nhật số từ lên bảng.</p>
              )}
              <button className="button primary" disabled={!canSave || (!current.own && !consent)}>
                {working ? "Đang lưu…" : current.own ? "Cập nhật hồ sơ" : "Tham gia bảng tu luyện"}
              </button>
              {current.own && (
                <button type="button" className="text-link" disabled={working} onClick={() => void leave()}>
                  Rời bảng tu luyện
                </button>
              )}
              {actionError?.uid === uid && (
                <p className="inline-error" role="alert">
                  {actionError.message}
                </p>
              )}
            </form>
          ) : (
            <>
              <p className="muted">
                Đăng nhập Google để tham gia bằng biệt danh của bạn. Hành trình tu luyện cá nhân vẫn được lưu trên máy
                khi học không đăng nhập.
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
          <p className="quiet-note">
            Cảnh giới tính theo số từ đã học, chưa phải mức thành thạo. Kết quả đồng bộ từ ứng dụng dùng để khích lệ học
            đều.
          </p>
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
