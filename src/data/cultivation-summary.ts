import { readAccount } from "./repository";
import { materialize } from "./sync";
import { bookOfWord } from "./catalog";
import { countLearnedWords } from "../domain/cultivation";
import { avatarIndex } from "../lib/avatar";

export async function readSyncedCultivatorSummary(uid: string) {
  const account = await readAccount(`user:${uid}`);
  if (account.pending.length) throw new Error("Đợi tiến độ đồng bộ xong rồi thử lại.");
  const snapshot = materialize(account.confirmed);
  return {
    count: countLearnedWords(snapshot.progress, (id) => Boolean(bookOfWord(id))),
    avatar: avatarIndex(snapshot.settings.avatarSeed ?? (snapshot.settings.name.trim() || "Vocab guest")),
  };
}
