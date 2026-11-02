import type { StoreApi } from "zustand/vanilla";
import type { AppState } from "./store";
import {
  appliedEdits,
  applyContentEdits,
  fingerprint,
  readEdit,
  readRestDocument,
  type ContentEdit,
} from "../data/content-edits";
import { firebaseConfig, firebaseEmulated } from "../lib/firebase-config";

const CACHE = "vocab:content-edits:v1";
// Each browser asks Firestore at most this often; an admin's own saves refresh immediately.
const REFRESH_MS = 15 * 60_000;

const endpoint = () => {
  const local = firebaseEmulated && ["localhost", "127.0.0.1"].includes(location.hostname);
  const origin = local ? "http://127.0.0.1:8080" : "https://firestore.googleapis.com";
  return `${origin}/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/contentEdits`;
};

// Public, SDK-free read of every content edit (Firestore REST, paginated).
export async function fetchContentEdits(signal?: AbortSignal): Promise<ContentEdit[]> {
  const edits: ContentEdit[] = [];
  let pageToken = "";
  for (let page = 0; page < 20; page++) {
    const url = new URL(endpoint());
    url.searchParams.set("pageSize", "300");
    url.searchParams.set("key", firebaseConfig.apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { signal, cache: "no-store" });
    if (!response.ok) throw new Error(`Không tải được nội dung đã sửa (${response.status}).`);
    const body = (await response.json()) as { documents?: unknown[]; nextPageToken?: string };
    for (const document of body.documents ?? []) {
      const edit = readRestDocument(document);
      if (edit) edits.push(edit);
    }
    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }
  return edits.sort((a, b) => a.id.localeCompare(b.id));
}

function readCache(): { at: number; edits: ContentEdit[] } {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE) ?? "null") as { at?: number; edits?: unknown[] } | null;
    const edits = (raw?.edits ?? []).flatMap((edit) => {
      const valid = readEdit(edit);
      return valid ? [valid] : [];
    });
    return { at: Number(raw?.at) || 0, edits };
  } catch {
    return { at: 0, edits: [] };
  }
}
function writeCache(edits: ContentEdit[]) {
  try {
    localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), edits }));
  } catch {
    /* Without storage the next visit simply fetches again. */
  }
}
const same = (a: readonly ContentEdit[], b: readonly ContentEdit[]) => fingerprint(a) === fingerprint(b);

// Applies new edits right away unless a study session is open; then they wait for the next visit.
export async function refreshContentEdits(store: StoreApi<AppState>, force = false) {
  const fresh = await fetchContentEdits();
  writeCache(fresh);
  if (same(fresh, appliedEdits())) return false;
  const session = store.getState().data.session;
  if (!force && session && session.phase !== "complete") return false;
  applyContentEdits(fresh);
  store.setState({ clock: Date.now() });
  return true;
}

// Called once at start-up, before the store opens: cached edits apply first so content never flickers.
export function startContentEdits(store: StoreApi<AppState>) {
  const cache = readCache();
  if (cache.edits.length) applyContentEdits(cache.edits);
  if (Date.now() - cache.at < REFRESH_MS) return;
  void refreshContentEdits(store).catch(() => {
    // Offline or Firestore unavailable: keep the cached or bundled content and wait before asking again.
    writeCache(cache.edits);
  });
}
