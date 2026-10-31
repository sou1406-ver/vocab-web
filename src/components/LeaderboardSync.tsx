"use client";

import { useEffect, useRef } from "react";
import { avatarIndex } from "../lib/avatar";
import { useApp } from "../state/provider";
import { useCloud } from "../state/cloud-provider";
import { bookOfWord } from "../data/catalog";
import { countLearnedWords } from "../domain/cultivation";
import { readSyncedCultivatorSummary } from "../data/cultivation-summary";

export function LeaderboardSync() {
  const { data, ready, profileKey } = useApp();
  const { user, status, account } = useCloud();
  const avatar = avatarIndex(data.settings.avatarSeed ?? (data.settings.name.trim() || "Vocab guest"));
  const count = countLearnedWords(data.progress, (id) => Boolean(bookOfWord(id)));
  const sent = useRef<{ uid: string; count: number; avatar: number; username: string } | null>(null);
  const uid = user?.uid;
  useEffect(() => {
    if (account?.hiddenLeaderboard) {
      sent.current = null;
      return;
    }
    if (
      !account ||
      !ready ||
      !uid ||
      profileKey !== `user:${uid}` ||
      status !== "synced" ||
      (sent.current?.uid === uid &&
        sent.current.count === count &&
        sent.current.avatar === avatar &&
        sent.current.username === account.username)
    )
      return;
    let active = true;
    void import("../data/leaderboard-cloud")
      .then(async (cloud) => {
        if (!active) return;
        const summary = await readSyncedCultivatorSummary(uid);
        if (!active) return;
        await cloud.syncLeaderboardCount(uid, summary.count, summary.avatar, () => active);
        if (active) sent.current = { uid, ...summary, username: account.username };
      })
      .catch(() => {
        /* Ranking must not interrupt learning; retry after the next sync. */
      });
    return () => {
      active = false;
    };
  }, [uid, count, avatar, ready, profileKey, status, account]);
  return null;
}
