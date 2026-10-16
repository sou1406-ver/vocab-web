"use strict";

/* =====================================================================
   VocaNetwork — học 600 Essential Words for the TOEIC theo trường từ
   Dữ liệu: js/data.js (TOPICS, LESSONS, AFFIXES, WORDS) do tools/build_data.py tạo ra
   ===================================================================== */

// ---------------------------------------------------------------- helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lower = (s) => String(s).toLowerCase().trim();
const same = (a, b) => lower(a) === lower(b);
const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uniq = (arr, key = lower) => { const seen = new Set(); return arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); };
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bộ nhớ bị chặn: bỏ qua */ } },
};

// ---------------------------------------------------------------- icons (nét vẽ theo bộ Lucide)
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  network: '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  folder: '<path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  left: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  anchor: '<circle cx="12" cy="5" r="3"/><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>',
  branch: '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  puzzle: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.47 2.5 2.5 0 1 1 3.01 3.01 1 1 0 0 0-.47 1.68l1.68 1.68a2.4 2.4 0 0 1 0 3.42l-1.68 1.68a1 1 0 0 1-1.68-.47 2.5 2.5 0 1 0-3.01 3.01 1 1 0 0 1 .47 1.68l-1.68 1.68a2.4 2.4 0 0 1-3.42 0l-1.68-1.68a1 1 0 0 0-1.68.47 2.5 2.5 0 1 1-3.01-3.01 1 1 0 0 0 .47-1.68l-1.68-1.68a2.4 2.4 0 0 1 0-3.42l1.68-1.68a1 1 0 0 1 1.68.47 2.5 2.5 0 1 0 3.01-3.01 1 1 0 0 1-.47-1.68l1.68-1.68a2.4 2.4 0 0 1 3.42 0z"/>',
  compare: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  check2: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  briefcase: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/>',
  building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 14h.01"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  film: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
};
const icon = (n, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;

// ---------------------------------------------------------------- constants
const POS_LABEL = { n: "Danh từ", v: "Động từ", adj: "Tính từ", adv: "Trạng từ", phr: "Cụm từ", prep: "Giới từ", conj: "Liên từ" };
const POS_COLS = [
  { k: "n", title: "Danh từ (Noun)", cls: "b-indigo" },
  { k: "v", title: "Động từ (Verb)", cls: "b-violet" },
  { k: "adj", title: "Tính từ (Adj)", cls: "b-emerald" },
  { k: "adv", title: "Trạng từ (Adv)", cls: "b-amber" },
];
const STATUS = {
  new: { label: "Chưa học", emoji: "⚪" },
  learning: { label: "Đang học", emoji: "🟡" },
  mastered: { label: "Đã thuộc", emoji: "🟢" },
};
const TAB_DEFS = [
  { id: "dash", label: "Tổng quan", short: "Tổng quan", icon: "home", href: "#/" },
  { id: "topics", label: "Chủ đề", short: "Chủ đề", icon: "grid", href: "#/topics" },
  { id: "network", label: "Trường từ", short: "Trường từ", icon: "network", href: "#/network" },
  { id: "flashcards", label: "Flashcard 3D", short: "Flashcard", icon: "layers", href: "#/flashcards" },
  { id: "quiz", label: "Bài tập", short: "Bài tập", icon: "pencil", href: "#/quiz" },
  { id: "affixes", label: "Tiền tố · Hậu tố", short: "Phụ tố", icon: "puzzle", href: "#/affixes" },
];
const QUIZ_TYPES = {
  formation: { label: "Biến đổi từ loại", icon: "branch", desc: "Câu ví dụ trong sách, điền dạng đúng của từ" },
  synonym: { label: "Đồng nghĩa & Trái nghĩa", icon: "compare", desc: "Chọn từ đồng nghĩa / trái nghĩa" },
  meaning: { label: "Nghĩa của từ", icon: "book", desc: "Anh ↔ Việt" },
  build: { label: "Ghép từ", icon: "puzzle", desc: "Ghép tiền tố + gốc + hậu tố" },
  mixed: { label: "Tổng hợp", icon: "layers", desc: "Trộn tất cả dạng bài" },
};
const QUIZ_LEN = 10;
const AFFIX_GROUPS = [["-ion", "-tion", "-sion", "-ation", "-ition", "-ison"], ["-able", "-ible"], ["-er", "-or", "-itor"], ["-ance", "-ence", "-ancy", "-ency"], ["-ant", "-ent"], ["-al", "-ial", "-ual"], ["-ive", "-ative", "-itive"], ["-ic", "-ical", "-atic", "-tic"], ["-ory", "-atory", "-ary"], ["-ure", "-ture", "-ature"]];
const RARE_AFFIXES = new Set(["-ison", "-ele", "-s", "-is", "-se", "-ety", "-ise", "-ior", "-ite", "-n", "-ice", "-th", "-dom", "-ology", "ac-", "sur-", "a-", "mal-"]);

// ---------------------------------------------------------------- hồ sơ học tập (tài khoản cục bộ)
// Mỗi hồ sơ có dữ liệu riêng: khoá lưu dạng "vn-status@<id hồ sơ>".
const PROFILE_KEYS = ["vn-custom", "vn-status", "vn-stats", "vn-book", "vn-log"];
const PROFILE_COLORS = ["#2f4b8f", "#a8442f", "#2f7a55", "#8a5a1f", "#6b3f87", "#2b6f7d"];
let PROFILES = store.get("vn-profiles", []);
let CURRENT = store.get("vn-current", null);
const pstore = {
  get: (k, d) => store.get(`${k}@${CURRENT}`, d),
  set: (k, v) => store.set(`${k}@${CURRENT}`, v),
};
const newProfileId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
function ensureProfile() {
  if (!PROFILES.length) {
    const p = { id: newProfileId(), name: "Bạn", color: PROFILE_COLORS[0], goal: 20, target: 600, created: Date.now(), setup: false };
    PROFILES = [p];
    // dữ liệu từ phiên bản trước (chưa có hồ sơ) chuyển sang hồ sơ đầu tiên
    for (const k of PROFILE_KEYS) { const v = store.get(k, null); if (v != null) store.set(`${k}@${p.id}`, v); }
  }
  if (!PROFILES.some((p) => p.id === CURRENT)) CURRENT = PROFILES[0].id;
  store.set("vn-profiles", PROFILES);
  store.set("vn-current", CURRENT);
}
const profile = () => PROFILES.find((p) => p.id === CURRENT);
function saveProfiles() { store.set("vn-profiles", PROFILES); store.set("vn-current", CURRENT); }

// ---------------------------------------------------------------- data & persistence
let CUSTOM = [];
let STATUS_MAP = {};
let STATS = {};
let LOG = {};          // nhật ký theo ngày: { "2026-10-16": { a: câu đã làm, c: câu đúng, f: thẻ đã ôn, m: từ mới thuộc } }
function loadProfileData() {
  CUSTOM = pstore.get("vn-custom", []);
  STATUS_MAP = pstore.get("vn-status", {});
  STATS = pstore.get("vn-stats", {});
  LOG = pstore.get("vn-log", {});
  if (typeof BOOK_SCORES !== "undefined") BOOK_SCORES = pstore.get("vn-book", {});
}
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function logActivity(kind, ok) {
  const k = dayKey();
  const e = LOG[k] || (LOG[k] = { a: 0, c: 0, f: 0, m: 0 });
  if (kind === "answer") { e.a++; if (ok) e.c++; } else if (kind === "card") e.f++; else if (kind === "mastered") e.m++;
  pstore.set("vn-log", LOG);
}
// chuỗi ngày học liên tiếp (tính đến hôm nay, hoặc hôm qua nếu hôm nay chưa học)
function streak() {
  const active = (d) => { const e = LOG[dayKey(d)]; return e && e.a + e.f > 0; };
  const d = new Date();
  if (!active(d)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (active(d)) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const CUSTOM_TOPIC = { id: "custom", name: "Tự thêm", en: "My word networks", icon: "folder", lessons: [] };
let ALL = [], BY_ID = {}, LESSON_BY_N = {}, TOPIC_BY_ID = {}, FORM_INDEX = {};

function rebuildIndex() {
  SEARCH_INDEX = null;
  ALL = [...WORDS, ...CUSTOM];
  BY_ID = Object.fromEntries(ALL.map((w) => [w.id, w]));
  LESSON_BY_N = Object.fromEntries(LESSONS.map((l) => [l.n, l]));
  TOPIC_BY_ID = Object.fromEntries([...TOPICS, CUSTOM_TOPIC].map((t) => [t.id, t]));
  FORM_INDEX = {};
  const add = (form, id) => { const k = lower(form); (FORM_INDEX[k] = FORM_INDEX[k] || []).includes(id) || FORM_INDEX[k].push(id); };
  for (const w of ALL) { add(w.word, w.id); for (const f of w.family) add(f.w, w.id); }
}
const unitOf = (w) => (w.lesson ? LESSON_BY_N[w.lesson].unit : "custom");
const topicsWithCustom = () => (CUSTOM.length ? [...TOPICS, CUSTOM_TOPIC] : TOPICS);
const statusOf = (id) => STATUS_MAP[id] || "new";
function setStatus(id, s) {
  if (s === "mastered" && STATUS_MAP[id] !== "mastered") logActivity("mastered");
  if (s === "new") delete STATUS_MAP[id]; else STATUS_MAP[id] = s;
  pstore.set("vn-status", STATUS_MAP);
}
function recordAnswer(id, ok) {
  const st = STATS[id] || { c: 0, w: 0 };
  ok ? st.c++ : st.w++;
  STATS[id] = st;
  pstore.set("vn-stats", STATS);
  logActivity("answer", ok);
  if (!ok && statusOf(id) === "new") setStatus(id, "learning");
}
// Họ từ đầy đủ, luôn chứa chính từ gốc
function familyOf(w) {
  const fam = w.family.slice();
  if (!fam.some((f) => same(f.w, w.word))) fam.unshift({ w: w.word, pos: w.pos || "phr", parts: w.parts || [w.word], vi: w.vi, ipa: w.ipa });
  return fam;
}
const expandedCount = (w) => familyOf(w).filter((f) => !same(f.w, w.word)).length + w.syn.length + w.ant.length;
function rootIdFor(form, prefer) {
  const ids = FORM_INDEX[lower(form)];
  if (!ids) return null;
  return prefer && ids.includes(prefer) ? prefer : ids[0];
}
function lessonLabel(w) {
  if (!w.lesson) return "Tự thêm";
  const l = LESSON_BY_N[w.lesson];
  return `Bài ${l.n}: ${l.title}`;
}
function scopeWords(unit, lesson) {
  return ALL.filter((w) => (unit === "all" || unitOf(w) === unit) && (lesson === "all" || String(w.lesson) === String(lesson)));
}
const affixType = (p) => (p.length > 1 && p.endsWith("-") ? "prefix" : p.length > 1 && p.startsWith("-") ? "suffix" : "root");

// ---------------------------------------------------------------- speech, toast, theme
function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  // Ưu tiên giọng tiếng Anh tự nhiên nếu máy có (Google / Microsoft Online)
  const voices = speechSynthesis.getVoices().filter((v) => /^en[-_]US/i.test(v.lang));
  const voice = voices.find((v) => /natural|online|google/i.test(v.name)) || voices[0];
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}
if ("speechSynthesis" in window) speechSynthesis.getVoices(); // nạp sẵn danh sách giọng
const speakBtn = (t, cls = "sm") => `<button class="speak-btn" data-act="speak" data-text="${esc(t)}" title="Nghe phát âm">${icon("volume", cls)}</button>`;
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
const THEMES = [["light", "sun", "Sáng"], ["dark", "moon", "Tối"], ["system", "monitor", "Theo máy"]];
const darkQuery = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
function themePref() {
  try { return localStorage.getItem("vn-theme") || "system"; } catch (e) { return "system"; }
}
function applyTheme(pref) {
  const dark = pref === "dark" || (pref === "system" && darkQuery && darkQuery.matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  try { localStorage.setItem("vn-theme", pref); } catch (e) { /* bỏ qua */ }
  renderThemeSeg();
}
function renderThemeSeg() {
  const pref = themePref();
  if (!$("#theme-seg")) return;
  $("#theme-seg").innerHTML = THEMES.map(([k, ic, label]) =>
    `<button role="radio" aria-checked="${pref === k}" class="${pref === k ? "active" : ""}" data-act="setTheme" data-theme="${k}" title="${label}">${icon(ic, "sm")}<span>${label}</span></button>`).join("");
}
if (darkQuery) darkQuery.addEventListener("change", () => { if (themePref() === "system") applyTheme("system"); });
const applyThemeIcon = renderThemeSeg; // tên cũ

// ---------------------------------------------------------------- tìm kiếm toàn trang (ô trên thanh tiêu đề)
let SEARCH_INDEX = null;
const GS = { results: [], sel: 0 };
function buildSearchIndex() {
  SEARCH_INDEX = [];
  for (const w of ALL) {
    SEARCH_INDEX.push({ form: w.word, pos: w.pos, vi: w.vi, ipa: w.ipa, root: w, kind: "root" });
    for (const f of w.family) if (!same(f.w, w.word)) SEARCH_INDEX.push({ form: f.w, pos: f.pos, vi: f.vi, ipa: f.ipa, root: w, kind: "family" });
    for (const s of w.syn) SEARCH_INDEX.push({ form: s, pos: "", vi: `đồng nghĩa của “${w.word}”`, root: w, kind: "syn" });
  }
  for (const e of SEARCH_INDEX) { e.ff = fold(e.form); e.fv = fold(e.vi); }
}
function searchWords(q) {
  const f = fold(q.trim());
  if (!f) return [];
  if (!SEARCH_INDEX) buildSearchIndex();
  const kindRank = { root: 0, family: 1, syn: 2 };
  const scored = [];
  for (const e of SEARCH_INDEX) {
    let s = -1;
    if (e.ff === f) s = 0;
    else if (e.ff.startsWith(f)) s = 1;
    else if (e.ff.includes(" " + f) || e.ff.includes("-" + f)) s = 2;
    else if (f.length >= 3 && e.ff.includes(f)) s = 3;
    else if (f.length >= 2 && e.kind !== "syn" && e.fv.includes(f)) s = 4;
    if (s >= 0) scored.push([s * 10 + kindRank[e.kind], e]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].form.length - b[1].form.length);
  const seen = new Set();
  // Mỗi từ chỉ hiện một lần (ưu tiên bản là từ gốc trong sách)
  return scored.map((x) => x[1]).filter((e) => { const k = lower(e.form); return seen.has(k) ? false : seen.add(k); }).slice(0, 10);
}
function renderSearch() {
  const box = $("#gsearch-results"), inp = $("#gsearch-input");
  const q = inp.value.trim();
  if (!q) { box.hidden = true; inp.setAttribute("aria-expanded", "false"); return; }
  GS.results = searchWords(q);
  GS.sel = Math.min(GS.sel, Math.max(0, GS.results.length - 1));
  box.innerHTML = GS.results.length ? GS.results.map((e, i) => `
    <button class="gs-item ${i === GS.sel ? "sel" : ""}" role="option" aria-selected="${i === GS.sel}" data-act="gsGo" data-href="#/network/${e.root.id}/${encodeURIComponent(e.form)}">
      <span class="gs-main"><b>${esc(e.form)}</b>${ipaTag(e)}${posTag(e.pos)}</span>
      <span class="gs-vi">${esc(e.vi)}</span>
      <span class="gs-from">${e.kind === "root" ? esc(lessonLabel(e.root)) : e.kind === "family" ? `họ từ ${esc(e.root.word)}` : `→ ${esc(e.root.word)}`}</span>
    </button>`).join("")
    : `<div class="gs-empty">Không tìm thấy “${esc(q)}”. Thử gõ không dấu hoặc một phần của từ.</div>`;
  box.hidden = false;
  inp.setAttribute("aria-expanded", "true");
}
function closeSearch(clear) {
  $("#gsearch-results").hidden = true;
  $("#gsearch-input").setAttribute("aria-expanded", "false");
  document.querySelector(".header").classList.remove("search-open");
  if (clear) { $("#gsearch-input").value = ""; $("#gsearch-input").blur(); }
}

// ---------------------------------------------------------------- shared fragments
const ipaTag = (x) => (x && x.ipa ? `<span class="ipa">${esc(x.ipa)}</span>` : "");
const posTag = (p) => (p ? `<span class="pos-tag" title="${POS_LABEL[p] || p}">(${esc(p)})</span>` : "");
const dot = (id) => `<span class="dot ${statusOf(id)}" title="${STATUS[statusOf(id)].label}"></span>`;

function morphHTML(p, rootId) {
  const t = affixType(p);
  if (t === "root") {
    const target = rootIdFor(p, rootId);
    const attrs = target ? `data-act="nav" data-href="#/network/${target}/${encodeURIComponent(p)}"` : "";
    return `<${target ? "button" : "span"} class="morph root" ${attrs}>${esc(p)}<small>Từ gốc</small></${target ? "button" : "span"}>`;
  }
  const a = AFFIXES[p];
  return `<button class="morph ${t}" data-act="nav" data-href="#/affixes/${encodeURIComponent(p)}" title="${esc(a ? a.fn : "")}">${esc(p)}<small>${esc(a ? a.vi : t === "prefix" ? "Tiền tố" : "Hậu tố")}</small></button>`;
}
function chipsHTML(parts) {
  return parts.map((p) => `<span class="chip ${affixType(p)}">${esc(p)}</span>`).join('<span class="plus"> + </span>');
}
function scopeSelects(st, prefix) {
  const units = topicsWithCustom();
  const lessons = st.unit === "all" ? LESSONS : st.unit === "custom" ? [] : LESSONS.filter((l) => l.unit === st.unit);
  return `
    <label class="row" style="gap:6px"><span class="eyebrow">Chủ đề</span>
      <select class="select" data-change="${prefix}Unit">
        <option value="all">Tất cả chủ đề</option>
        ${units.map((t) => `<option value="${t.id}" ${st.unit === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
      </select></label>
    ${st.unit === "custom" ? "" : `<label class="row" style="gap:6px"><span class="eyebrow">Bài</span>
      <select class="select" data-change="${prefix}Lesson">
        <option value="all">Tất cả bài</option>
        ${lessons.map((l) => `<option value="${l.n}" ${String(st.lesson) === String(l.n) ? "selected" : ""}>${l.n}. ${esc(l.title)}</option>`).join("")}
      </select></label>`}`;
}

// ---------------------------------------------------------------- app state
const S = {
  tab: "dash",
  menuOpen: false,
  net: { unit: "all", lesson: "all", q: "", id: null, focus: null, status: "all", pos: "all", affix: "all", sort: "book" },
  fc: { unit: "all", lesson: "1", status: "all", deck: [], i: 0, flipped: false },
  quiz: { type: "formation", unit: "all", lesson: "1", style: "choice", qs: [], i: 0, right: 0, wrong: 0, answered: false, picked: [], last: null },
  affix: null,
  mgrQ: "",
};

// =====================================================================
// TAB 1 — CHỦ ĐỀ
// =====================================================================
function lessonProgress(n) {
  const words = ALL.filter((w) => w.lesson === n);
  const mastered = words.filter((w) => statusOf(w.id) === "mastered").length;
  const started = words.some((w) => statusOf(w.id) !== "new");
  return { total: words.length, mastered, started };
}
// Bài nên học tiếp: bài đang học dở đầu tiên, nếu không có thì bài chưa xong đầu tiên
function resumeLesson() {
  const open = LESSONS.filter((l) => { const p = lessonProgress(l.n); return p.mastered < p.total; });
  return open.find((l) => lessonProgress(l.n).started) || open[0] || LESSONS[0];
}
function viewTopics() {
  const total = ALL.length;
  const mastered = ALL.filter((w) => statusOf(w.id) === "mastered").length;
  const learning = ALL.filter((w) => statusOf(w.id) === "learning").length;
  const pct = total ? Math.round((mastered / total) * 100) : 0;
  const next = resumeLesson();
  const np = lessonProgress(next.n);
  const unitBlock = (t, i) => {
    const words = ALL.filter((w) => unitOf(w) === t.id);
    const m = words.filter((w) => statusOf(w.id) === "mastered").length;
    const lessons = t.id === "custom" ? [] : LESSONS.filter((l) => l.unit === t.id);
    return `
    <section class="unit">
      <div>
        <div class="unit-no">${t.id === "custom" ? "Của bạn" : `Phần ${i + 1}`}</div>
        <h3 class="unit-title">${esc(t.name)}</h3>
        <div class="unit-en">${esc(t.en)}</div>
        <div class="unit-meta"><span>${m}/${words.length} từ đã thuộc</span></div>
        <div class="unit-links">
          <button class="text-link" data-act="openUnit" data-unit="${t.id}" data-to="flashcards">Flashcard</button>
          <button class="text-link" data-act="openUnit" data-unit="${t.id}" data-to="quiz">Bài tập</button>
        </div>
      </div>
      <div class="lesson-grid">${lessons.length ? lessons.map((l) => {
        const p = lessonProgress(l.n);
        const done = p.total && p.mastered === p.total;
        return `<button class="lesson-tile ${done ? "done" : ""}" data-act="openLesson" data-n="${l.n}">
          <span class="ln">Bài ${l.n}${done ? " · xong" : p.mastered ? ` · ${p.mastered}/${p.total}` : ""}${hasBook && lessonBookDone(l.n) ? ' <span class="ex-done" title="Đã làm bài tập trong sách">✓ bài tập</span>' : ""}</span>
          <span class="lt">${esc(l.title)}</span>
          <span class="lv">${esc(l.vi)}</span>
          <span class="progress"><span style="width:${p.total ? (p.mastered / p.total) * 100 : 0}%"></span></span>
        </button>`;
      }).join("") : words.map((w) => `<button class="lesson-tile" data-act="nav" data-href="#/network/${w.id}">
          <span class="lt">${esc(w.word)}</span><span class="lv">${esc(w.vi)}</span></button>`).join("")}</div>
    </section>`;
  };
  return `
  <div class="stack">
    <section class="home-head">
      <div>
        <p class="kicker">600 Essential Words for the TOEIC · 50 bài</p>
        <h1>Học một từ, nhớ cả họ từ.</h1>
        <p class="lede">Mỗi từ trong sách được tách thành <b>tiền tố + gốc + hậu tố</b>. Nhìn cách ghép là thấy ngay
          danh từ, động từ, tính từ, trạng từ của nó — đúng dạng bài điền từ trong TOEIC Part 5.</p>
      </div>
      <div class="resume">
        <div class="eyebrow">${np.started ? "Học tiếp" : "Bắt đầu"}</div>
        <h3>Bài ${next.n} · ${esc(next.title)}</h3>
        <p class="muted">${esc(next.vi)} · ${np.mastered}/${np.total} từ đã thuộc</p>
        <div class="progress"><span style="width:${np.total ? (np.mastered / np.total) * 100 : 0}%"></span></div>
        <div class="row">
          <button class="btn primary" data-act="openLesson" data-n="${next.n}">Mở trường từ bài ${next.n} ${icon("right", "sm")}</button>
          <button class="btn" data-act="openLessonFlash" data-n="${next.n}">Flashcard</button>
          ${hasBook ? `<button class="btn" data-act="openLessonBook" data-n="${next.n}">Bài tập sách</button>` : ""}
        </div>
      </div>
    </section>

    <div class="overall">
      <span><b>${mastered}</b> / ${total} từ đã thuộc</span>
      <span>${learning} đang học</span>
      <div class="progress" title="${pct}%"><span style="width:${pct}%"></span></div>
    </div>

    <div>
      <div class="toc-head">
        <h2 class="section-title">Mục lục</h2>
        <button class="btn sm ghost" data-act="openWordModal">${icon("plus", "sm")} Thêm trường từ của bạn</button>
      </div>
      ${topicsWithCustom().map(unitBlock).join("")}
    </div>
  </div>`;
}

// =====================================================================
// TAB 2 — MẠNG LƯỚI TRƯỜNG TỪ
// =====================================================================
function matchReason(w, q) {
  const f = fold(q);
  if (fold(w.word).includes(f)) return null;
  const fam = w.family.find((x) => fold(x.w).includes(f));
  if (fam) return `${fam.w} (họ từ)`;
  const syn = w.syn.find((x) => fold(x).includes(f));
  if (syn) return `${syn} (đồng nghĩa)`;
  const ant = w.ant.find((x) => fold(x).includes(f));
  if (ant) return `${ant} (trái nghĩa)`;
  if (fold(w.vi).includes(f)) return "nghĩa tiếng Việt";
  const famVi = w.family.find((x) => fold(x.vi).includes(f));
  if (famVi) return `${famVi.w}: ${famVi.vi}`;
  return null;
}
// Bộ lọc phụ của trang Trường từ
const NET_FILTERS = {
  status: { label: "Trạng thái", options: [["all", "Mọi trạng thái"], ["new", "Chưa học"], ["learning", "Đang học"], ["mastered", "Đã thuộc"], ["unmastered", "Chưa thuộc"]] },
  pos: { label: "Từ loại", options: [["all", "Mọi từ loại"], ["n", "Danh từ"], ["v", "Động từ"], ["adj", "Tính từ"], ["adv", "Trạng từ"], ["phr", "Cụm từ"]] },
  sort: { label: "Sắp xếp", options: [["book", "Theo thứ tự sách"], ["az", "A → Z"], ["family", "Họ từ lớn nhất"], ["weak", "Hay làm sai nhất"]] },
};
const isPhrase = (w) => /\s/.test(w.word.trim());
function matchesFilters(w) {
  const { status, pos, affix } = S.net;
  const s = statusOf(w.id);
  if (status === "unmastered" ? s === "mastered" : status !== "all" && s !== status) return false;
  if (pos === "phr" ? !isPhrase(w) : pos !== "all" && (isPhrase(w) || w.pos !== pos)) return false;
  if (affix !== "all" && !familyOf(w).some((f) => f.parts && f.parts.includes(affix))) return false;
  return true;
}
const activeNetFilters = () => ["status", "pos", "affix"].filter((k) => S.net[k] !== "all").length + (S.net.sort !== "book" ? 1 : 0);
function networkList() {
  const { unit, lesson, q, sort } = S.net;
  let list = scopeWords(unit, lesson).filter(matchesFilters);
  if (sort === "az") list = list.slice().sort((a, b) => a.word.localeCompare(b.word));
  else if (sort === "family") list = list.slice().sort((a, b) => expandedCount(b) - expandedCount(a));
  else if (sort === "weak") list = list.slice().sort((a, b) => ((STATS[b.id] || {}).w || 0) - ((STATS[a.id] || {}).w || 0));
  if (q.trim()) {
    const f = fold(q.trim());
    list = list.filter((w) => fold(w.word).includes(f) || matchReason(w, q.trim()));
    list.sort((a, b) => (fold(a.word).startsWith(f) ? 0 : 1) - (fold(b.word).startsWith(f) ? 0 : 1));
  }
  return list;
}
function filterBarHTML() {
  const sel = (key) => {
    const f = NET_FILTERS[key];
    return `<label class="filter-sel ${S.net[key] !== (key === "sort" ? "book" : "all") ? "on" : ""}"><span>${f.label}</span>
      <select data-change="netFilter" data-key="${key}">${f.options.map(([v, l]) => `<option value="${v}" ${S.net[key] === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
  };
  const affixOpts = (type) => Object.keys(AFFIXES).filter((k) => AFFIXES[k].type === type)
    .map((k) => `<option value="${esc(k)}" ${S.net.affix === k ? "selected" : ""}>${esc(k)} — ${esc(AFFIXES[k].vi)}</option>`).join("");
  const n = activeNetFilters();
  return `<div class="filter-row">
    ${sel("status")}${sel("pos")}
    <label class="filter-sel ${S.net.affix !== "all" ? "on" : ""}"><span>Phụ tố</span>
      <select data-change="netFilter" data-key="affix"><option value="all">Mọi phụ tố</option>
        <optgroup label="Tiền tố">${affixOpts("prefix")}</optgroup><optgroup label="Hậu tố">${affixOpts("suffix")}</optgroup></select></label>
    ${sel("sort")}
    ${n ? `<button class="text-link" data-act="netClearFilters">${icon("x", "sm")} Xoá ${n} bộ lọc</button>` : ""}
  </div>`;
}

// Thanh chuyển bài: bài trước / các bài cùng phần / bài sau. "where" = net | fc | quiz
function lessonNavHTML(st, where) {
  if (st.unit === "all" || st.unit === "custom") return "";
  const cur = st.lesson === "all" ? null : +st.lesson;
  const sib = LESSONS.filter((l) => l.unit === st.unit);
  const prev = cur ? LESSON_BY_N[cur - 1] : null, next = cur ? LESSON_BY_N[cur + 1] : null;
  const unitIdx = TOPICS.findIndex((x) => x.id === st.unit);
  const step = (l) => {
    const p = lessonProgress(l.n);
    const on = l.n === cur;
    return `<button class="step ${on ? "active" : ""} ${p.total && p.mastered === p.total ? "done" : ""}" data-act="goLesson" data-where="${where}" data-n="${l.n}" ${on ? 'aria-current="page"' : ""}>
      <span class="step-n">Bài ${l.n}</span><span class="step-t">${esc(l.title)}</span>
      <span class="step-bar"><span style="width:${p.total ? (p.mastered / p.total) * 100 : 0}%"></span></span></button>`;
  };
  return `<nav class="lesson-nav" aria-label="Chuyển bài">
    <button class="btn sm ghost nav-edge" data-act="goLesson" data-where="${where}" data-n="${prev ? prev.n : ""}" ${prev ? "" : "disabled"} title="${prev ? `Bài ${prev.n}: ${esc(prev.title)}` : ""}">${icon("left", "sm")}<span>Bài trước</span></button>
    <div class="lesson-steps">
      <button class="step step-all ${cur ? "" : "active"}" data-act="goLesson" data-where="${where}" data-n="all"><span class="step-n">Phần ${unitIdx + 1}</span><span class="step-t">Cả phần</span></button>
      ${sib.map(step).join("")}
    </div>
    <button class="btn sm ghost nav-edge" data-act="goLesson" data-where="${where}" data-n="${next ? next.n : ""}" ${next ? "" : "disabled"} title="${next ? `Bài ${next.n}: ${esc(next.title)}` : ""}"><span>Bài sau</span>${icon("right", "sm")}</button>
  </nav>`;
}

function rootListHTML(list, q) {
  if (!list.length) return `<div class="empty" style="padding:24px">Không có từ nào khớp.${activeNetFilters() || S.net.q ? `<br><button class="btn sm" data-act="netReset">Bỏ lọc &amp; tìm kiếm</button>` : ""}</div>`;
  return list.map((w) => {
    const reason = q ? matchReason(w, q) : null;
    return `<button class="root-item ${w.id === S.net.id ? "active" : ""}" data-act="nav" data-href="#/network/${w.id}" data-id="${w.id}">
      <div style="min-width:0">
        <div class="row" style="gap:6px;flex-wrap:nowrap">${dot(w.id)}<span class="rw">${esc(w.word)}</span><span class="mono muted" style="font-size:.7rem">${w.pos ? `(${esc(w.pos)})` : ""}</span></div>
        <div class="rv">${esc(w.vi)}</div>
        ${reason ? `<span class="match-tag">Khớp: ${esc(reason)}</span>` : ""}
      </div>
      <span class="rc">+${expandedCount(w)}</span></button>`;
  }).join("");
}
const canvasOrEmpty = (cur) => (cur ? canvasHTML(cur) : `<div class="card empty"><b>Không tìm thấy từ nào</b>Thử từ khác, hoặc xem lại toàn bộ 600 từ.<br><button class="btn" data-act="netReset">Xem tất cả từ</button></div>`);

// Cập nhật riêng danh sách + sơ đồ (giữ nguyên ô tìm kiếm và vị trí cuộn)
function updateNetwork({ list: refreshList = true } = {}) {
  if (!$("#root-list")) return render();
  const list = networkList();
  if (!list.some((w) => w.id === S.net.id)) S.net.id = list[0] ? list[0].id : null;
  if (refreshList) {
    $("#root-count").textContent = `${list.length} từ`;
    $("#root-list").innerHTML = rootListHTML(list, S.net.q.trim());
    $("#root-list").scrollTop = 0;
  } else {
    $$(".root-item").forEach((b) => b.classList.toggle("active", b.dataset.id === S.net.id));
  }
  $("#canvas").innerHTML = canvasOrEmpty(BY_ID[S.net.id]);
  afterNetwork();
}

function viewNetwork() {
  const list = networkList();
  if (!list.some((w) => w.id === S.net.id)) S.net.id = list[0] ? list[0].id : null;
  const cur = BY_ID[S.net.id];
  const units = topicsWithCustom();
  const q = S.net.q.trim();
  const lessons = S.net.unit === "all" ? LESSONS : LESSONS.filter((l) => l.unit === S.net.unit);
  return `
  <div class="stack">
    <div class="card filter-bar net-filter">
      <div class="row net-tools">
        ${S.net.unit === "custom" ? "" : `<select class="select" data-change="netLesson">
          <option value="all">Tất cả bài</option>
          ${lessons.map((l) => `<option value="${l.n}" ${String(S.net.lesson) === String(l.n) ? "selected" : ""}>Bài ${l.n}: ${esc(l.title)}</option>`).join("")}
        </select>`}
        <div class="search-box" style="flex:1 1 240px">${icon("search", "sm")}
          <input class="input" id="net-search" type="search" value="${esc(S.net.q)}" placeholder="Tìm từ gốc, họ từ, đồng nghĩa, nghĩa Việt…" data-input="netSearch" autocomplete="off"></div>
      </div>
      <div class="pill-row">
        <span class="eyebrow">Chủ đề:</span>
        <button class="pill-btn ${S.net.unit === "all" ? "active" : ""}" data-act="netUnit" data-unit="all">Tất cả</button>
        ${units.map((t) => `<button class="pill-btn ${S.net.unit === t.id ? "active" : ""}" data-act="netUnit" data-unit="${t.id}">${esc(t.name)}</button>`).join("")}
      </div>
      ${filterBarHTML()}
    </div>
    ${lessonNavHTML(S.net, "net")}

    <div class="explorer">
      <aside class="card sidebar">
        <div class="row between"><h3 style="font-size:.92rem">Chọn từ gốc</h3><span class="badge b-indigo" id="root-count">${list.length} từ</span></div>
        <div class="root-list" id="root-list">${rootListHTML(list, q)}</div>
      </aside>
      <div class="stack" id="canvas">${canvasOrEmpty(cur)}</div>
    </div>
  </div>`;
}

function canvasHTML(w) {
  const fam = familyOf(w);
  const unit = TOPIC_BY_ID[unitOf(w)];
  const formulas = fam.filter((f) => f.parts && f.parts.length >= 2);
  const st = statusOf(w.id);
  const other = fam.filter((f) => !POS_COLS.some((c) => c.k === f.pos));
  const wordCard = (f) => `
    <div class="wcard ${same(f.w, w.word) ? "is-root" : ""}" data-w="${esc(lower(f.w))}">
      <div class="row between" style="gap:4px;flex-wrap:nowrap"><span class="ww">${esc(f.w)}</span>${speakBtn(f.w)}</div>${f.ipa ? `<div class="ipa">${esc(f.ipa)}</div>` : ""}
      ${f.parts && f.parts.length > 1 ? `<div style="margin-top:4px;font-size:.7rem">${chipsHTML(f.parts)}</div>` : ""}
      <div class="wv">${esc(f.vi)}</div>
      ${f.note ? `<div class="note">${esc(f.note)}</div>` : ""}
      ${f.ex ? `<div class="wx">“${esc(f.ex)}”</div>` : ""}
    </div>`;
  const relCard = (x, kind) => {
    const target = rootIdFor(x);
    return `<div class="rel-card ${kind}"><div><b>${esc(x)}</b>
      ${target && target !== w.id ? ` <a href="#/network/${target}/${encodeURIComponent(x)}" style="font-size:.72rem">xem trường từ →</a>` : ""}</div>${speakBtn(x)}</div>`;
  };
  const prevNext = (() => {
    const list = networkList();
    const i = list.findIndex((x) => x.id === w.id);
    return { prev: list[i - 1], next: list[i + 1] };
  })();
  const head = (no, title, sub, extra = "") => `
    <div class="branch-head">
      <div class="row" style="gap:12px;flex-wrap:nowrap;align-items:baseline">
        <span class="branch-no">${no}</span>
        <div><h3>${title}</h3>${sub ? `<p class="section-sub">${sub}</p>` : ""}</div>
      </div>${extra}
    </div>`;
  return `
    <section class="root-banner animate-pop">
      <div class="row between" style="align-items:flex-start">
        <div style="flex:1 1 380px;min-width:0">
          <div class="crumbs">${esc(unit.name)} › ${esc(lessonLabel(w))}${w.lesson ? ` · ${esc(LESSON_BY_N[w.lesson].vi)}` : ""}</div>
          <div class="row" style="margin-top:6px;gap:10px;align-items:baseline">
            <h2>${esc(w.word)}</h2>${ipaTag(w)}${posTag(w.pos)}
            <button class="speak-btn" data-act="speak" data-text="${esc(w.word)}" title="Nghe phát âm">${icon("volume")}</button>
          </div>
          <div class="vi">${esc(w.vi)}</div>
          ${w.def ? `<div class="def">${esc(w.def)}</div>` : ""}
        </div>
        <div class="stack-sm" style="text-align:right">
          <select class="status-select ${st}" data-change="status" data-id="${w.id}" aria-label="Trạng thái học">
            ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === st ? "selected" : ""}>${v.label}</option>`).join("")}
          </select>
          ${w.lesson ? "" : `<button class="btn sm" data-act="openWordModal" data-id="${w.id}">${icon("pencil", "sm")} Sửa</button>`}
        </div>
      </div>
      ${w.ex && w.ex.length ? `<div class="book-ex">${w.ex.map((x) => `<div><span>${esc(x)}</span>${speakBtn(x)}</div>`).join("")}</div>` : ""}
    </section>

    <section class="card branch">
      ${head("01", "Cấu tạo từ", "Bấm vào tiền tố / hậu tố để xem các từ khác dùng nó",
        `<div class="legend"><span class="chip prefix">tiền tố</span><span class="chip root">gốc</span><span class="chip suffix">hậu tố</span></div>`)}
      ${formulas.length ? formulas.map((f) => `
        <div class="formula">
          <div class="formula-parts">
            ${f.parts.map((p) => morphHTML(p, w.id)).join('<span class="plus">+</span>')}
            <span class="arrow">${icon("right", "sm")}</span>
            <span class="formula-result"><b>${esc(f.w)}</b>${ipaTag(f)}${posTag(f.pos)}${speakBtn(f.w)}</span>
          </div>
          <div class="formula-meaning">${esc(f.vi)}${f.note ? `<div class="note">${esc(f.note)}</div>` : ""}</div>
        </div>`).join("") : `<p class="muted">“${esc(w.word)}” là cụm từ / từ đơn, không ghép thêm tiền tố hay hậu tố.</p>`}
    </section>

    <section class="card branch">
      ${head("02", "Họ từ theo từ loại", "Câu in nghiêng lấy từ mục <i>Word Families</i> của sách")}
      <div class="pos-cols">${POS_COLS.map((c) => {
        const items = fam.filter((f) => f.pos === c.k);
        return `<div class="pos-col"><div class="pos-col-head"><span class="badge">${c.title}</span><span class="muted" style="font-size:.8rem">${items.length || "—"}</span></div>
          ${items.length ? items.map(wordCard).join("") : `<p class="muted" style="font-size:.84rem;padding:0 2px">Không có dạng này</p>`}</div>`;
      }).join("")}</div>
      ${other.length ? `<div style="margin-top:14px"><div class="eyebrow" style="margin-bottom:8px">Cụm từ / dạng khác</div><div class="grid grid-3">${other.map(wordCard).join("")}</div></div>` : ""}
    </section>

    <div class="grid grid-2">
      <section class="card branch">
        ${head("03", "Đồng nghĩa &amp; trái nghĩa", "")}
        <div class="rel-label" style="color:var(--teal-text)">≈ Đồng nghĩa</div>
        ${w.syn.length ? w.syn.map((x) => relCard(x, "syn")).join("") : `<p class="muted" style="font-size:.86rem">Chưa có</p>`}
        <div class="rel-label" style="color:var(--rose-text);margin-top:16px">≠ Trái nghĩa</div>
        ${w.ant.length ? w.ant.map((x) => relCard(x, "ant")).join("") : `<p class="muted" style="font-size:.86rem">Chưa có</p>`}
      </section>
      <section class="card branch" style="display:flex;flex-direction:column">
        ${head("04", "Luyện riêng họ từ này", `${fam.length} từ`)}
        <button class="btn primary" style="width:100%" data-act="quizForWord" data-id="${w.id}" data-type="formation">Điền dạng từ trong câu ${icon("right", "sm")}</button>
        ${hasBook && w.lesson ? `<button class="btn" style="width:100%;margin-top:8px" data-act="openLessonBook" data-n="${w.lesson}">${icon("book", "sm")} Bài tập trong sách · bài ${w.lesson}</button>` : ""}
        <div class="row" style="margin-top:10px;gap:6px 16px">
          ${Object.entries(QUIZ_TYPES).filter(([k]) => k !== "mixed" && k !== "formation").map(([k, t]) => `
            <button class="text-link" data-act="quizForWord" data-id="${w.id}" data-type="${k}">${t.label}</button>`).join("")}
        </div>
        <div class="row between" style="margin-top:auto;padding-top:16px">
          ${prevNext.prev ? `<button class="btn sm ghost" data-act="nav" data-href="#/network/${prevNext.prev.id}">${icon("left", "sm")} ${esc(prevNext.prev.word)}</button>` : "<span></span>"}
          ${prevNext.next ? `<button class="btn sm ghost" data-act="nav" data-href="#/network/${prevNext.next.id}">${esc(prevNext.next.word)} ${icon("right", "sm")}</button>`
            : S.net.lesson !== "all" && LESSON_BY_N[+S.net.lesson + 1] ? `<button class="btn sm soft" data-act="goLesson" data-where="net" data-n="${+S.net.lesson + 1}">Sang bài ${+S.net.lesson + 1} ${icon("right", "sm")}</button>` : "<span></span>"}
        </div>
      </section>
    </div>`;
}

function afterNetwork() {
  // Chỉ cuộn danh sách bên trái (không kéo cả trang theo)
  const list = $("#root-list"), active = $(".root-item.active");
  if (list && active) {
    const lr = list.getBoundingClientRect(), ar = active.getBoundingClientRect();
    if (ar.top < lr.top || ar.bottom > lr.bottom) list.scrollTop += ar.top - lr.top - lr.height / 2 + ar.height / 2;
  }
  if (S.net.focus) {
    const el = $(`.wcard[data-w="${CSS.escape(lower(S.net.focus))}"]`);
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.add("flash"); }
    S.net.focus = null;
  }
}

// =====================================================================
// TAB 3 — FLASHCARD 3D
// =====================================================================
function buildDeck() {
  const st = S.fc;
  let deck = scopeWords(st.unit, st.lesson);
  if (st.status === "unmastered") deck = deck.filter((w) => statusOf(w.id) !== "mastered");
  else if (st.status !== "all") deck = deck.filter((w) => statusOf(w.id) === st.status);
  st.deck = deck.map((w) => w.id);
  st.i = 0;
  st.flipped = false;
}
function viewFlashcards() {
  const st = S.fc;
  const w = BY_ID[st.deck[st.i]];
  const controls = `
    <div class="card filter-bar">
      <div class="row">${scopeSelects(st, "fc")}
        <label class="row" style="gap:6px"><span class="eyebrow">Trạng thái</span>
          <select class="select" data-change="fcStatus">
            ${[["all", "Tất cả"], ["unmastered", "Chưa thuộc"], ["new", "Chưa học"], ["learning", "Đang học"], ["mastered", "Đã thuộc"]]
              .map(([k, v]) => `<option value="${k}" ${st.status === k ? "selected" : ""}>${v}</option>`).join("")}
          </select></label>
      </div>
      <div class="row">
        <span class="badge b-indigo" style="font-size:.82rem;padding:6px 12px">Thẻ: ${st.deck.length ? st.i + 1 : 0} / ${st.deck.length}</span>
        <button class="btn sm" data-act="fcShuffle">${icon("shuffle", "sm")} Trộn thẻ</button>
      </div>
    </div>
    ${lessonNavHTML(st, "fc")}
    <div class="bar"><span style="width:${st.deck.length ? ((st.i + 1) / st.deck.length) * 100 : 0}%"></span></div>`;
  if (!w) return `<div class="stack">${controls}<div class="card empty"><b>Không có thẻ nào ở bộ lọc này</b>${S.fc.status === "unmastered" ? "Bạn đã thuộc hết phần này 🎉" : "Bộ lọc trạng thái đang loại hết các thẻ."}<br><button class="btn" data-act="fcAll">Hiện tất cả thẻ của phần này</button></div></div>`;
  const fam = familyOf(w).filter((f) => !same(f.w, w.word));
  const counts = POS_COLS.map((c) => [c, fam.filter((f) => f.pos === c.k).length]).filter(([, n]) => n);
  const s = statusOf(w.id);
  return `
  <div class="stack">
    ${controls}
    <div class="fc-stage">
      <div class="fc-scene">
        <div class="fc-card ${st.flipped ? "flipped" : ""}" id="fc-card" data-act="fcFlip">
          <div class="fc-face fc-front">
            <div class="row between">
              <div class="row" style="gap:6px"><span class="badge b-indigo">${esc(TOPIC_BY_ID[unitOf(w)].name)}</span><span class="badge b-slate">${esc(lessonLabel(w))}</span>${posTag(w.pos)}</div>
              <span class="badge ${s === "mastered" ? "b-emerald" : s === "learning" ? "b-amber" : "b-slate"}">${STATUS[s].emoji} ${STATUS[s].label}</span>
            </div>
            <div style="text-align:center" class="stack-sm">
              <div class="fc-word">${esc(w.word)}</div>
              ${w.ipa ? `<div class="ipa fc-ipa">${esc(w.ipa)}</div>` : ""}
              <div><button class="btn sm soft" data-act="speak" data-text="${esc(w.word)}">${icon("volume", "sm")} Nghe phát âm</button></div>
              <p class="muted" style="font-size:.86rem;margin-top:14px">Nhẩm nghĩa và các dạng từ trước khi lật thẻ:</p>
              <div class="row" style="justify-content:center;gap:6px">
                ${counts.map(([c, n]) => `<span class="badge ${c.cls}">${n} ${c.title.split(" (")[0].toLowerCase()}</span>`).join("")}
                ${w.syn.length ? `<span class="badge b-teal">${w.syn.length} đồng nghĩa</span>` : ""}
                ${w.ant.length ? `<span class="badge b-rose">${w.ant.length} trái nghĩa</span>` : ""}
              </div>
            </div>
            <div class="fc-hint">${icon("repeat", "sm")} Nhấn vào thẻ hoặc phím <kbd>Space</kbd> để lật xem Sơ đồ Trường từ</div>
          </div>
          <div class="fc-face fc-back">
            <div class="row between" style="align-items:flex-start;border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:12px">
              <div><div class="row" style="gap:8px"><h3 style="font-size:1.5rem">${esc(w.word)}</h3><span style="color:oklch(0.8 0.05 262);font-size:.9rem">${esc(w.ipa || "")}</span><span class="pp" style="font-style:italic;color:oklch(0.78 0.05 262);font-size:.85rem">(${esc(w.pos)})</span></div>
                <div class="fc-vi">${esc(w.vi)}</div>
                ${w.def ? `<div style="font-size:.78rem;color:#94a3b8;margin-top:2px">${esc(w.def)}</div>` : ""}</div>
              <button class="btn sm primary" data-act="nav" data-href="#/network/${w.id}">Xem sơ đồ lớn</button>
            </div>
            <div class="fc-list" style="margin:12px 0">
              ${fam.length ? fam.slice(0, 8).map((f) => `<div><b>${esc(f.w)}</b><span class="pp">(${esc(f.pos)})</span><span style="color:#cbd5e1;flex:1">${esc(f.vi)}</span></div>`).join("") : `<div>Không có họ từ — học kỹ nghĩa và câu ví dụ.</div>`}
            </div>
            <div class="row" style="gap:6px">
              ${w.syn.map((x) => `<span class="tag syn">≈ ${esc(x)}</span>`).join("")}
              ${w.ant.map((x) => `<span class="tag ant">≠ ${esc(x)}</span>`).join("")}
            </div>
            ${w.ex && w.ex[0] ? `<div style="font-size:.78rem;color:#94a3b8;font-style:italic;margin-top:10px">“${esc(w.ex[0])}”</div>` : ""}
          </div>
        </div>
      </div>
      <div class="rate-grid">
        <button class="rate-btn r1" data-act="fcRate" data-s="new">${icon("undo", "sm")} Chưa nhớ<small>Học lại (phím 1)</small></button>
        <button class="rate-btn r2" data-act="fcRate" data-s="learning">Đang học<small>Nhớ một phần (phím 2)</small></button>
        <button class="rate-btn r3" data-act="fcRate" data-s="mastered">${icon("check", "sm")} Đã thuộc<small>Thuộc cả họ từ (phím 3)</small></button>
      </div>
      <div class="row between" style="margin-top:12px">
        <button class="btn sm ghost" data-act="fcMove" data-d="-1">${icon("left", "sm")} Từ trước</button>
        <button class="btn sm ghost" style="color:var(--indigo)" data-act="fcFlip">${icon("repeat", "sm")} Lật thẻ</button>
        <button class="btn sm ghost" data-act="fcMove" data-d="1">Từ tiếp ${icon("right", "sm")}</button>
      </div>
    </div>
  </div>`;
}
function fcFlip() {
  S.fc.flipped = !S.fc.flipped;
  const c = $("#fc-card");
  if (c) c.classList.toggle("flipped", S.fc.flipped);
}
function fcMove(d) {
  const st = S.fc;
  if (!st.deck.length) return;
  st.i = (st.i + d + st.deck.length) % st.deck.length;
  st.flipped = false;
  render();
}
function fcRate(s) {
  const id = S.fc.deck[S.fc.i];
  if (!id) return;
  logActivity("card");
  setStatus(id, s);
  toast(`${BY_ID[id].word}: ${STATUS[s].label}`);
  fcMove(1);
}

// =====================================================================
// TAB 4 — BÀI TẬP
// =====================================================================
function findForm(sentence, form) {
  const base = lower(form);
  const variants = uniq([base, base + "s", base + "es", base + "d", base + "ed", base + "ing",
    base.replace(/e$/, "") + "ing", base.replace(/y$/, "ies"), base.replace(/y$/, "ied")]).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(^|[^A-Za-z-])(${variants.map((v) => escRe(v).replace(/ /g, "\\s+")).join("|")})(?![A-Za-z])`, "i");
  const m = re.exec(sentence);
  return m ? { index: m.index + m[1].length, text: m[2] } : null;
}
function formationQs(roots) {
  const qs = [];
  for (const w of roots) {
    const fam = familyOf(w);
    const self = fam.find((f) => same(f.w, w.word));
    const sentences = fam.filter((f) => f.ex).map((f) => ({ f, s: f.ex }));
    for (const s of w.ex || []) sentences.push({ f: self, s });
    for (const { f, s } of sentences) {
      const m = findForm(s, f.w);
      const others = fam.filter((x) => !same(x.w, f.w));
      if (!m || !others.length) continue;
      const baseEntry = !same(f.w, w.word) ? self : others.find((x) => x.parts.length === 1) || others[0];
      qs.push({ kind: "formation", root: w, f, s, m, base: baseEntry.w, others });
    }
  }
  return qs;
}
function synonymQs(roots) {
  const pool = uniq(ALL.flatMap((x) => [...x.syn, x.word]));
  return roots.filter((w) => w.syn.length || w.ant.length).map((w) => {
    const ant = w.ant.length && (!w.syn.length || Math.random() < 0.35);
    const correct = pick(ant ? w.ant : w.syn);
    const exclude = new Set([...w.syn, ...w.ant, w.word, ...w.family.map((f) => f.w)].map(lower));
    const distract = shuffle(pool).filter((x) => !exclude.has(lower(x))).slice(0, 3);
    return { kind: "synonym", root: w, ant, correct, options: shuffle([correct, ...distract]) };
  });
}
function meaningQs(roots) {
  return roots.map((w) => {
    const reverse = Math.random() < 0.4;
    const key = (x) => (reverse ? x.word : x.vi);
    const rank = (x) => (x.lesson === w.lesson ? 0 : unitOf(x) === unitOf(w) ? 1 : 2);
    const distract = uniq(shuffle(ALL.filter((x) => x !== w)).sort((a, b) => rank(a) - rank(b)), key).filter((x) => key(x) !== key(w)).slice(0, 3);
    return { kind: "meaning", root: w, reverse, options: shuffle([w, ...distract]) };
  });
}
function buildQs(roots) {
  const items = roots.flatMap((w) => familyOf(w).filter((f) => f.parts && f.parts.length >= 2).map((f) => ({ w, f })));
  return items.map(({ w, f }) => {
    const banned = new Set(f.parts);
    for (const g of AFFIX_GROUPS) if (g.some((x) => banned.has(x))) g.forEach((x) => banned.add(x));
    const pool = (type) => shuffle(Object.keys(AFFIXES).filter((k) => AFFIXES[k].type === type && !banned.has(k) && !RARE_AFFIXES.has(k)));
    const distract = [...pool("prefix").slice(0, 1), ...pool("suffix").slice(0, 2)];
    return { kind: "build", root: w, f, tiles: shuffle([...f.parts, ...distract]) };
  });
}
function startQuiz() {
  const st = S.quiz;
  const only = st.only || "all";
  const roots = st.forWord ? [BY_ID[st.forWord]] : scopeWords(st.unit, st.lesson)
    .filter((w) => only === "all" || (only === "unmastered" ? statusOf(w.id) !== "mastered" : statusOf(w.id) === only));
  const gen = { formation: formationQs, synonym: synonymQs, meaning: meaningQs, build: buildQs };
  let qs;
  if (st.type === "mixed") qs = shuffle(Object.values(gen).flatMap((g) => shuffle(g(roots)).slice(0, 4)));
  else qs = gen[st.type](roots);
  st.qs = shuffle(qs).slice(0, QUIZ_LEN);
  Object.assign(st, { i: 0, right: 0, wrong: 0, answered: false, picked: [], last: null });
}
function explainHTML(ok, entry, root, extra) {
  return `<div class="explain ${ok ? "ok" : "bad"}">
    <div style="flex:1 1 300px">
      <h4>${ok ? "✅ Chính xác!" : "❌ Chưa đúng"}</h4>
      ${entry && entry.parts && entry.parts.length > 1 ? `<div class="row" style="gap:4px;margin-top:8px">${chipsHTML(entry.parts)}<span class="plus">→</span><b>${esc(entry.w)}</b>${posTag(entry.pos)}</div>` : ""}
      <p>${extra || ""}${entry ? ` <b>${esc(entry.w)}</b> ${entry.pos ? `(${POS_LABEL[entry.pos] || entry.pos})` : ""}: ${esc(entry.vi)}.` : ""}
        ${entry && entry.note ? `<br><span class="note">${esc(entry.note)}</span>` : ""}</p>
      <p style="font-size:.78rem"><a href="#/network/${root.id}/${encodeURIComponent(entry ? entry.w : root.word)}">Xem sơ đồ trường từ “${esc(root.word)}” →</a></p>
    </div>
    <button class="btn dark" data-act="quizNext" id="quiz-next">Câu tiếp ${icon("right", "sm")}</button>
  </div>`;
}
function questionHTML(q) {
  const st = S.quiz;
  const keyed = (opts, label, isRight) => `<div class="choices">${opts.map((o, i) => {
    const cls = st.answered ? (isRight(o) ? "right" : st.last && st.last.pick === i ? "wrong" : "") : "";
    return `<button class="choice ${cls}" data-act="quizChoose" data-i="${i}" ${st.answered ? "disabled" : ""}><span class="k">${i + 1}</span>${esc(label(o))}</button>`;
  }).join("")}</div>`;
  if (q.kind === "formation") {
    const before = q.s.slice(0, q.m.index), after = q.s.slice(q.m.index + q.m.text.length);
    const filled = st.answered ? `<span class="blank">${esc(q.m.text)}</span>` : `<span class="blank">______</span>`;
    if (!q.options) q.options = shuffle(uniq([q.m.text, ...shuffle(q.others).map((o) => o.w)]).slice(0, 4));
    const typing = st.style === "typing";
    return `
      <div class="q-box">
        <div class="eyebrow">Điền dạng từ đúng của từ trong ngoặc (biến đổi từ loại / thêm tiền tố, hậu tố):</div>
        <div class="q-text">${esc(before)}${filled} <span class="base">(${esc(q.base.toUpperCase())})</span>${esc(after)}</div>
        <div class="q-hint">💡 Gợi ý: cần một <b>${POS_LABEL[q.f.pos] || q.f.pos}</b> mang nghĩa “${esc(q.f.vi)}”.</div>
      </div>
      ${typing ? `<form class="type-row" data-submit="quizType"><input class="input" id="quiz-input" autocomplete="off" spellcheck="false" placeholder="Gõ từ đã biến đổi…" ${st.answered ? "disabled" : ""}><button class="btn primary" ${st.answered ? "disabled" : ""}>Kiểm tra</button></form>`
        : keyed(q.options, (o) => o, (o) => same(o, q.m.text))}
      ${st.answered ? explainHTML(st.last.ok, q.f, q.root, st.last.ok ? "" : `Đáp án: <b>${esc(q.m.text)}</b>.`) : ""}`;
  }
  if (q.kind === "synonym") {
    return `
      <div class="q-box">
        <div class="eyebrow">Chọn từ ${q.ant ? "TRÁI NGHĨA" : "ĐỒNG NGHĨA"} với từ sau:</div>
        <div class="row" style="margin-top:8px"><span class="q-big">${esc(q.root.word)}</span>${ipaTag(q.root)}${posTag(q.root.pos)}${speakBtn(q.root.word, "")}</div>
        <div class="q-hint">Nghĩa: ${esc(q.root.vi)}</div>
      </div>
      ${keyed(q.options, (o) => o, (o) => same(o, q.correct))}
      ${st.answered ? explainHTML(st.last.ok, null, q.root, `${q.ant ? "Trái nghĩa" : "Đồng nghĩa"} của <b>${esc(q.root.word)}</b>: ${esc((q.ant ? q.root.ant : q.root.syn).join(", "))}.`) : ""}`;
  }
  if (q.kind === "meaning") {
    const w = q.root;
    return `
      <div class="q-box">
        <div class="eyebrow">${q.reverse ? "Từ nào có nghĩa là:" : "Nghĩa của từ:"}</div>
        ${q.reverse ? `<div class="q-big" style="font-size:1.5rem;margin-top:8px">${esc(w.vi)}</div>`
          : `<div class="row" style="margin-top:8px"><span class="q-big">${esc(w.word)}</span>${ipaTag(w)}${posTag(w.pos)}${speakBtn(w.word, "")}</div>`}
        ${w.def ? `<div class="q-hint">Định nghĩa (sách): ${esc(w.def)}</div>` : ""}
      </div>
      ${keyed(q.options, (o) => (q.reverse ? o.word : o.vi), (o) => o === w)}
      ${st.answered ? explainHTML(st.last.ok, familyOf(w).find((f) => same(f.w, w.word)), w) : ""}`;
  }
  // build
  const f = q.f;
  return `
    <div class="q-box" style="text-align:center">
      <div class="eyebrow">Ghép tiền tố + từ gốc + hậu tố thành từ có nghĩa:</div>
      <div class="q-big" style="font-size:1.45rem;margin-top:8px">${esc(f.vi)}</div>
      <div class="row" style="justify-content:center;margin-top:6px">${posTag(f.pos)}<span class="muted" style="font-size:.8rem">${POS_LABEL[f.pos] || ""} · họ từ “${esc(q.root.word)}” · cần ${f.parts.length} mảnh</span></div>
      <div class="slots">${st.picked.length ? st.picked.map((i) => `<button class="morph ${affixType(q.tiles[i])}" data-act="untile" data-i="${i}" ${st.answered ? "disabled" : ""}>${esc(q.tiles[i])}</button>`).join("")
        : `<span class="muted" style="font-size:.82rem">Bấm các mảnh bên dưới theo đúng thứ tự</span>`}</div>
      <div class="tiles">${q.tiles.map((t, i) => `<button class="morph ${affixType(t)} ${st.picked.includes(i) ? "used" : ""}" data-act="tile" data-i="${i}" ${st.answered ? "disabled" : ""}>${esc(t)}</button>`).join("")}</div>
      ${st.answered ? "" : `<div class="row" style="justify-content:center;margin-top:16px">
        <button class="btn" data-act="buildClear">Xoá</button>
        <button class="btn primary" data-act="buildCheck" ${st.picked.length ? "" : "disabled"}>Kiểm tra</button></div>`}
    </div>
    ${st.answered ? explainHTML(st.last.ok, f, q.root, st.last.ok ? "" : "Thứ tự đúng ở trên.") : ""}`;
}
function viewAutoQuiz() {
  const st = S.quiz;
  const header = `
    <div class="card filter-bar">
      <div class="seg">${Object.entries(QUIZ_TYPES).map(([k, t]) => `<button class="${st.type === k ? "active" : ""}" data-act="quizSetType" data-type="${k}">${icon(t.icon, "sm")} ${t.label}</button>`).join("")}</div>
      <div class="row">
        ${st.forWord ? `<span class="badge b-violet" style="padding:6px 12px">Trường từ: ${esc(BY_ID[st.forWord].word)} <button class="speak-btn" data-act="quizClearWord" title="Bỏ lọc">${icon("x", "sm")}</button></span>` : scopeSelects(st, "quiz") + `
          <label class="row" style="gap:6px"><span class="eyebrow">Ôn</span><select class="select" data-change="quizOnly">
            ${[["all", "Tất cả từ"], ["unmastered", "Từ chưa thuộc"], ["learning", "Từ đang học"]].map(([k, v]) => `<option value="${k}" ${(st.only || "all") === k ? "selected" : ""}>${v}</option>`).join("")}
          </select></label>`}
        ${st.type === "formation" ? `<select class="select" data-change="quizStyle">
          <option value="choice" ${st.style === "choice" ? "selected" : ""}>Trắc nghiệm 4 đáp án</option>
          <option value="typing" ${st.style === "typing" ? "selected" : ""}>Tự gõ từ biến đổi</option></select>` : ""}
        <button class="btn sm soft" data-act="quizRestart">${icon("repeat", "sm")} Làm đề mới</button>
      </div>
    </div>
    ${st.forWord ? "" : lessonNavHTML(st, "quiz")}`;
  if (!st.qs.length) return `<div class="stack">${header}<div class="card empty"><b>Chưa có câu hỏi dạng “${QUIZ_TYPES[st.type].label}” ở phạm vi này</b>Các từ trong phạm vi này không có dữ liệu cho dạng bài đó.<br><button class="btn" data-act="quizSetType" data-type="mixed">Làm dạng Tổng hợp</button></div></div>`;
  if (st.i >= st.qs.length) {
    const pct = Math.round((st.right / st.qs.length) * 100);
    return `<div class="stack">${header}
      <div class="card quiz-card" style="text-align:center;max-width:640px">
        <div class="topic-icon" style="margin:0 auto">${icon("award", "lg")}</div>
        <h3 style="font-size:1.5rem;margin-top:14px">Hoàn thành bài luyện tập!</h3>
        <p class="muted" style="margin-top:4px">${pct >= 80 ? "Rất tốt — bạn nắm chắc quy luật biến đổi từ." : pct >= 50 ? "Khá ổn, ôn lại sơ đồ các từ sai nhé." : "Cần ôn thêm — xem lại sơ đồ trường từ rồi làm lại."}</p>
        <div class="grid grid-2" style="margin:20px 0;background:var(--surface-2);padding:16px;border-radius:16px">
          <div><div class="muted" style="font-size:.78rem">Số câu đúng</div><div class="q-big" style="color:var(--indigo)">${st.right} / ${st.qs.length}</div></div>
          <div><div class="muted" style="font-size:.78rem">Tỷ lệ chính xác</div><div class="q-big" style="color:var(--emerald)">${pct}%</div></div>
        </div>
        <div class="row" style="justify-content:center"><button class="btn primary" data-act="quizRestart">${icon("undo", "sm")} Làm bài mới</button>
          <button class="btn" data-act="nav" data-href="#/network">${icon("network", "sm")} Xem lại Sơ đồ</button></div>
      </div></div>`;
  }
  const q = st.qs[st.i];
  const kindLabel = { formation: "Biến đổi từ loại", synonym: q.ant ? "Trái nghĩa" : "Đồng nghĩa", meaning: "Nghĩa của từ", build: "Ghép từ" }[q.kind];
  return `<div class="stack">${header}
    <div class="bar" style="max-width:820px;margin-left:auto;margin-right:auto"><span style="width:${(st.i / st.qs.length) * 100}%"></span></div>
    <div class="card quiz-card">
      <div class="row between">
        <div class="row" style="gap:6px"><span class="badge b-indigo">Câu ${st.i + 1} / ${st.qs.length}</span><span class="badge b-sky">${kindLabel}</span><span class="badge b-violet mono">Gốc: ${esc(q.root.word.toUpperCase())}</span></div>
        <div class="row"><span class="score-pill" style="color:var(--emerald)">${icon("check2", "sm")} ${st.right}</span><span class="score-pill" style="color:var(--rose)">${icon("x", "sm")} ${st.wrong}</span></div>
      </div>
      ${questionHTML(q)}
    </div></div>`;
}
function quizAnswer(ok, pickIndex) {
  const st = S.quiz;
  const q = st.qs[st.i];
  st.answered = true;
  st.last = { ok, pick: pickIndex };
  ok ? st.right++ : st.wrong++;
  recordAnswer(q.root.id, ok);
  render();
  const next = $("#quiz-next");
  if (next) next.focus({ preventScroll: true });
  // Trên màn hình nhỏ, kéo phần giải thích vào tầm nhìn
  const ex = $(".explain");
  if (ex && ex.getBoundingClientRect().bottom > window.innerHeight) ex.scrollIntoView({ block: "nearest", behavior: smooth() });
}
function quizChoose(i) {
  const st = S.quiz;
  const q = st.qs[st.i];
  if (st.answered || !q.options || i >= q.options.length) return;
  const o = q.options[i];
  const ok = q.kind === "formation" ? same(o, q.m.text) : q.kind === "synonym" ? same(o, q.correct) : o === q.root;
  quizAnswer(ok, i);
}
function quizNext() {
  const st = S.quiz;
  st.i++;
  st.answered = false;
  st.picked = [];
  st.last = null;
  render();
  const inp = $("#quiz-input");
  if (inp) inp.focus();
}

// ---------------------------------------------------------------- BÀI TẬP TRONG SÁCH
let BOOK_SCORES = {};
const BOOK = { unit: "business", lesson: "1", fills: {}, checked: {}, active: null };
const hasBook = typeof EXERCISES !== "undefined";
const unitIndex = (unit) => TOPICS.findIndex((t) => t.id === unit);
const bookKey = (sec) => (BOOK.lesson === "all" ? `R${unitIndex(BOOK.unit) + 1}` : `L${BOOK.lesson}`) + ":" + sec;
const normAns = (s) => lower(s).replace(/[’']/g, "'").replace(/\s+/g, " ").replace(/[.,!?]$/, "");

function viewQuiz() {
  const mode = S.quiz.mode || (hasBook ? "book" : "auto");
  const sw = `<div class="mode-switch" role="tablist">
    <button role="tab" aria-selected="${mode === "book"}" class="${mode === "book" ? "active" : ""}" data-act="quizMode" data-mode="book">${icon("book", "sm")} Bài tập trong sách</button>
    <button role="tab" aria-selected="${mode === "auto"}" class="${mode === "auto" ? "active" : ""}" data-act="quizMode" data-mode="auto">${icon("layers", "sm")} Tự luyện từ vựng</button>
  </div>`;
  return sw + (mode === "book" && hasBook ? viewBook() : viewAutoQuiz());
}

// Tìm họ từ chứa một từ/cụm trong phương án (vd "will cancel" → cancel)
function familyLookup(text) {
  const w = lower(text).replace(/[^a-z' -]/g, "").trim();
  const cands = [w, w.replace(/^(to|be|is|are|will|have|has|had|was|were|been|more|most|being) /, ""), w.split(" ").pop()];
  for (const c of cands) {
    const id = rootIdFor(c);
    if (id) {
      const root = BY_ID[id];
      const f = familyOf(root).find((x) => same(x.w, c)) || familyOf(root)[0];
      return { root, f };
    }
  }
  return null;
}

function bookSectionHead(kicker, title, sub, sec, total) {
  const best = BOOK_SCORES[bookKey(sec)];
  const ck = BOOK.checked[sec];
  const badge = ck
    ? `<span class="badge ${ck.right === ck.total ? "b-emerald" : ck.right / ck.total >= 0.6 ? "b-amber" : "b-rose"}">${ck.right}/${ck.total} đúng</span>`
    : best ? `<span class="badge b-slate" title="Điểm cao nhất">Cao nhất ${best.right}/${best.total}</span>` : `<span class="badge b-slate">${total} câu</span>`;
  return `<div class="ex-head">
    <div><div class="ex-kicker">${kicker}</div><h3>${title}</h3>${sub ? `<p class="section-sub">${sub}</p>` : ""}</div>
    <div class="ex-score">${badge}</div>
  </div>`;
}

function renderPassage(text, gapHTML) {
  return text.split("\n").map((line) => {
    const html = esc(line).replace(/\{\{(\d+)\}\}/g, (m, n) => gapHTML(+n));
    return line.startsWith("## ") ? `<h4 class="passage-h">${html.slice(3)}</h4>` : `<p>${html}</p>`;
  }).join("");
}

function sectionActions(sec, done, total, unit) {
  const ck = BOOK.checked[sec];
  return `<div class="ex-actions">${ck
    ? `<button class="btn" data-act="bookReset" data-sec="${sec}">${icon("undo", "sm")} Làm lại</button>`
    : `<button class="btn primary" data-act="bookCheck" data-sec="${sec}" ${done ? "" : "disabled"}>Kiểm tra</button>
       <span class="muted" style="font-size:.86rem">${done}/${total} ${unit}</span>`}</div>`;
}

// ---- Words in Context: đoạn văn + bảng từ
function wicHTML(wic) {
  const sec = "wic";
  const fills = BOOK.fills[sec] || {};
  const ck = BOOK.checked[sec];
  const total = wic.answers.length;
  const bank = wic.answers.map((alts, i) => ({ i, w: alts[0] })).sort((a, b) => a.w.localeCompare(b.w));
  const used = new Set(Object.values(fills).map((f) => f.chip));
  const active = BOOK.active || Array.from({ length: total }, (_, k) => k + 1).find((k) => !fills[k]);
  const gap = (n) => {
    const f = fills[n];
    const ok = ck && f && wic.answers[n - 1].some((a) => normAns(a) === normAns(f.w));
    const cls = ck ? (ok ? "right" : "wrong") : f ? "filled" : n === active ? "active" : "";
    const fix = ck && !ok ? `<span class="gap-fix">${esc(wic.answers[n - 1].join(" / "))}</span>` : "";
    return `<button class="gap ${cls}" data-act="wicGap" data-n="${n}" ${ck ? "disabled" : ""} aria-label="Chỗ trống ${n}${f ? ": " + esc(f.w) : ""}"><span class="gap-n">${n}</span>${f ? esc(f.w) : "&nbsp;"}</button>${fix}`;
  };
  return `<section class="card ex-section" id="sec-wic">
    ${bookSectionHead("Words in Context", "Điền từ vào đoạn văn", ck ? "" : "Chạm một từ để điền vào ô đang sáng; chạm ô đã điền để xoá.", sec, total)}
    <div class="wordbank">${bank.map((b) => `<button class="bank-chip ${used.has(b.i) ? "used" : ""}" data-act="wicChip" data-i="${b.i}" ${ck || used.has(b.i) ? "disabled" : ""}>${esc(b.w)}</button>`).join("")}</div>
    <div class="passage">${renderPassage(wic.text, gap)}</div>
    ${sectionActions(sec, Object.keys(fills).length, total, "ô đã điền")}
  </section>`;
}

// ---- Câu trắc nghiệm (Part 5, Word Review 1–10, phương án Part 6)
function mcqItemHTML(q, sec, inPassage) {
  const pick = (BOOK.fills[sec] || {})[q.n];
  const ck = BOOK.checked[sec];
  let head;
  if (inPassage) {
    head = `<p class="mcq-q"><span class="qn">${q.n}.</span> <span class="muted">Chỗ trống số ${q.n}</span></p>`;
  } else {
    const blank = pick ? `<span class="blank-inline ${ck ? (pick === q.answer ? "right" : "wrong") : "filled"}">${esc(q.options[pick])}</span>` : `<span class="blank-inline">&nbsp;</span>`;
    head = `<p class="mcq-q"><span class="qn">${q.n}.</span> ${esc(q.text).replace("___", blank)}</p>`;
  }
  let fb = "";
  if (ck) {
    const right = q.options[q.answer];
    const fam = familyLookup(right);
    fb = `<div class="mcq-fb ${pick === q.answer ? "ok" : "bad"}">${pick === q.answer ? "✓ Đúng" : pick ? "✗ Sai" : "Bỏ trống"} — đáp án <b>(${q.answer}) ${esc(right)}</b>${
      fam ? ` · <span class="muted">${esc(fam.f.vi || fam.root.vi)}</span> · <a href="#/network/${fam.root.id}/${encodeURIComponent(fam.f.w)}">họ từ “${esc(fam.root.word)}” →</a>` : ""}</div>`;
  }
  return `<li class="mcq" id="q-${sec}-${q.n}">${head}
    <div class="opt-grid">${["A", "B", "C", "D"].map((L) => {
      const cls = ck ? (L === q.answer ? "right" : L === pick ? "wrong" : "") : L === pick ? "selected" : "";
      return `<button class="opt ${cls}" data-act="bookPick" data-sec="${sec}" data-q="${q.n}" data-v="${L}" ${ck ? "disabled" : ""} aria-pressed="${L === pick}"><span class="k">${L}</span>${esc(q.options[L])}</button>`;
    }).join("")}</div>${fb}
  </li>`;
}
function mcqSectionHTML(sec, kicker, title, qs) {
  const ck = BOOK.checked[sec];
  return `<section class="card ex-section" id="sec-${sec}">
    ${bookSectionHead(kicker, title, ck ? "" : "Chọn từ đúng điền vào chỗ trống.", sec, qs.length)}
    <ol class="mcq-list">${qs.map((q) => mcqItemHTML(q, sec, false)).join("")}</ol>
    ${sectionActions(sec, Object.keys(BOOK.fills[sec] || {}).length, qs.length, "câu đã chọn")}
  </section>`;
}

// ---- Đoạn văn trắc nghiệm (Part 6, Word Review 11–19)
function clozeHTML(block, sec) {
  const fills = BOOK.fills[sec] || {};
  const ck = BOOK.checked[sec];
  const qByN = Object.fromEntries(block.questions.map((q) => [q.n, q]));
  const gap = (n) => {
    const q = qByN[n];
    if (!q) return "____";
    const pick = fills[n];
    const cls = ck ? (pick === q.answer ? "right" : "wrong") : pick ? "filled" : "";
    return `<button class="gap ${cls}" data-act="jumpQ" data-target="q-${sec}-${n}" aria-label="Chỗ trống ${n}"><span class="gap-n">${n}</span>${pick ? esc(q.options[pick]) : "&nbsp;"}</button>`;
  };
  return `<div class="passage">${renderPassage(block.text, gap)}</div>
    <ol class="mcq-list compact">${block.questions.map((q) => mcqItemHTML(q, sec, true)).join("")}</ol>`;
}
function clozeSectionHTML(sec, kicker, title, blocks) {
  const ck = BOOK.checked[sec];
  const total = blocks.reduce((s, b) => s + b.questions.length, 0);
  return `<section class="card ex-section" id="sec-${sec}">
    ${bookSectionHead(kicker, title, ck ? "" : "Đọc đoạn văn rồi chọn từ cho từng chỗ trống.", sec, total)}
    ${blocks.map((b) => clozeHTML(b, sec)).join('<hr class="ex-sep">')}
    ${sectionActions(sec, Object.keys(BOOK.fills[sec] || {}).length, total, "chỗ trống đã chọn")}
  </section>`;
}

function viewBook() {
  const st = BOOK;
  const controls = `<div class="card filter-bar">
      <div class="row">${scopeSelects(st, "book")}</div>
      <p class="muted" style="font-size:.84rem;max-width:56ch">Bài tập &amp; đáp án lấy từ sách. Phần nghe (Part 1–4) và đọc hiểu dài (Part 7) không có trên web.</p>
    </div>
    ${lessonNavHTML(st, "book")}`;
  if (st.unit === "all" || st.unit === "custom") {
    return `<div class="stack">${controls}<div class="card empty"><b>Chọn một bài hoặc một phần</b>Mỗi bài có Words in Context, Part 5 và Part 6; mỗi phần có thêm bài ôn Word Review.<br><button class="btn primary" data-act="goLesson" data-where="book" data-n="1">Bắt đầu từ bài 1</button></div></div>`;
  }
  if (st.lesson === "all") {
    const n = unitIndex(st.unit) + 1;
    const R = EXERCISES.reviews[n];
    return `<div class="stack">${controls}
      <div class="ex-title"><span class="kicker">Ôn tập phần ${n}</span><h2>Word Review #${n} · ${esc(TOPIC_BY_ID[st.unit].name)}</h2></div>
      ${R ? mcqSectionHTML("r5", "Word Review · câu 1–10", "Chọn từ đúng", R.part5) + clozeSectionHTML("r6", "Word Review · câu 11–19", "Điền từ vào đoạn văn", R.part6) : `<div class="card empty"><b>Chưa có dữ liệu</b></div>`}
    </div>`;
  }
  const L = EXERCISES.lessons[st.lesson] || {};
  const l = LESSON_BY_N[st.lesson];
  return `<div class="stack">${controls}
    <div class="ex-title"><span class="kicker">Bài ${l.n}</span><h2>${esc(l.title)} · ${esc(l.vi)}</h2>
      <button class="text-link" data-act="openLesson" data-n="${l.n}">Xem lại 12 trường từ của bài ${icon("right", "sm")}</button></div>
    ${L.wic ? wicHTML(L.wic) : ""}
    ${L.part5 && L.part5.length ? mcqSectionHTML("p5", "Part 5 · Incomplete Sentences", "Hoàn thành câu", L.part5) : ""}
    ${L.part6 ? clozeSectionHTML("p6", "Part 6 · Text Completion", "Hoàn thành đoạn văn", [L.part6]) : ""}
  </div>`;
}

function bookQuestions(sec) {
  if (BOOK.lesson === "all") {
    const R = EXERCISES.reviews[unitIndex(BOOK.unit) + 1];
    return sec === "r5" ? R.part5 : R.part6.flatMap((b) => b.questions);
  }
  const L = EXERCISES.lessons[BOOK.lesson];
  return sec === "p5" ? L.part5 : L.part6.questions;
}
function saveBookScore(sec, right, total) {
  const k = bookKey(sec);
  const prev = BOOK_SCORES[k];
  if (!prev || right / total >= prev.right / prev.total) BOOK_SCORES[k] = { right, total, at: Date.now() };
  pstore.set("vn-book", BOOK_SCORES);
}
function bookCheck(sec) {
  const fills = BOOK.fills[sec] || {};
  let right = 0, total = 0;
  if (sec === "wic") {
    EXERCISES.lessons[BOOK.lesson].wic.answers.forEach((alts, i) => {
      total++;
      const f = fills[i + 1];
      const ok = !!f && alts.some((a) => normAns(a) === normAns(f.w));
      if (ok) right++;
      const fam = familyLookup(alts[0]);
      if (fam) recordAnswer(fam.root.id, ok);
    });
  } else {
    for (const q of bookQuestions(sec)) {
      total++;
      const ok = fills[q.n] === q.answer;
      if (ok) right++;
      const fam = familyLookup(q.options[q.answer]);
      if (fam) recordAnswer(fam.root.id, ok);
    }
  }
  BOOK.checked[sec] = { right, total };
  BOOK.active = null;
  saveBookScore(sec, right, total);
  render();
  const el = $(`#sec-${sec}`);
  if (el && el.getBoundingClientRect().top < 60) el.scrollIntoView({ behavior: smooth(), block: "start" });
  toast(right === total ? `Xuất sắc! Đúng cả ${total}/${total} 🎉` : `Đúng ${right}/${total} — xem lại những chỗ đánh dấu đỏ`);
}
function resetBook() { BOOK.fills = {}; BOOK.checked = {}; BOOK.active = null; }
// Đã làm đủ các phần của một bài chưa (dùng cho dấu ✓ ở Mục lục)
function lessonBookDone(n) {
  return ["wic", "p5", "p6"].every((s) => BOOK_SCORES[`L${n}:${s}`]);
}

// =====================================================================
// TAB 5 — TIỀN TỐ / HẬU TỐ
// =====================================================================
function viewAffixes() {
  const keys = Object.keys(AFFIXES);
  const count = (k) => ALL.reduce((s, w) => s + familyOf(w).filter((f) => f.parts && f.parts.includes(k)).length, 0);
  const groups = [
    ["Tiền tố — đổi NGHĨA, thường giữ nguyên từ loại", keys.filter((k) => AFFIXES[k].type === "prefix")],
    ["Hậu tố tạo DANH TỪ", keys.filter((k) => AFFIXES[k].type === "suffix" && AFFIXES[k].makes === "n")],
    ["Hậu tố tạo TÍNH TỪ", keys.filter((k) => AFFIXES[k].type === "suffix" && /^adj/.test(AFFIXES[k].makes))],
    ["Hậu tố tạo ĐỘNG TỪ", keys.filter((k) => AFFIXES[k].makes === "v")],
    ["Hậu tố tạo TRẠNG TỪ", keys.filter((k) => AFFIXES[k].makes === "adv")],
    ["Hậu tố đa năng (danh từ / tính từ)", keys.filter((k) => AFFIXES[k].type === "suffix" && /\//.test(AFFIXES[k].makes || "") && !/^adj/.test(AFFIXES[k].makes))],
  ];
  const sel = S.affix && AFFIXES[S.affix] ? S.affix : null;
  let panel = "";
  if (sel) {
    const a = AFFIXES[sel];
    const words = ALL.flatMap((w) => familyOf(w).filter((f) => f.parts && f.parts.includes(sel)).map((f) => ({ w, f })));
    const seen = new Set();
    const list = words.filter(({ f }) => (seen.has(lower(f.w)) ? false : seen.add(lower(f.w))));
    panel = `
      <section class="card pad animate-pop" id="affix-panel">
        <div class="row between" style="align-items:flex-start">
          <div class="row" style="gap:14px">
            <span class="morph ${a.type}" style="font-size:1.3rem;padding:10px 16px">${esc(sel)}<small>${a.type === "prefix" ? "Tiền tố" : "Hậu tố"}</small></span>
            <div><h3 style="font-size:1.15rem">${esc(a.vi)}</h3><p class="muted" style="font-size:.85rem">${esc(a.fn)}</p></div>
          </div>
          <div class="row"><button class="btn sm soft" data-act="netByAffix" data-affix="${esc(sel)}">${icon("network", "sm")} Lọc trường từ theo phụ tố này</button>
          <button class="btn sm ghost" data-act="nav" data-href="#/affixes">${icon("x", "sm")} Đóng</button></div>
        </div>
        <div class="eyebrow" style="margin:18px 0 10px">${list.length} từ trong 600 từ TOEIC dùng ${a.type === "prefix" ? "tiền tố" : "hậu tố"} này</div>
        <div class="affix-words">${list.map(({ w, f }) => `
          <div class="affix-word">
            <a class="aw" href="#/network/${w.id}/${encodeURIComponent(f.w)}">${esc(f.w)}</a>${speakBtn(f.w)}${posTag(f.pos)}
            <span style="font-size:.74rem">${chipsHTML(f.parts)}</span>
            <span class="avi">${esc(f.vi)}</span>
          </div>`).join("")}</div>
      </section>`;
  }
  return `
  <div class="stack">
    <section class="page-head">
      <p class="kicker">${keys.length} tiền tố &amp; hậu tố</p>
      <h1>Nhìn đuôi từ, đoán từ loại</h1>
      <p class="lede">Kỹ năng then chốt cho TOEIC Part 5. Bấm vào một phụ tố để xem mọi từ trong sách dùng nó.</p>
    </section>
    ${panel}
    ${groups.filter(([, ks]) => ks.length).map(([title, ks]) => `
      <section><h2 class="section-title" style="margin-bottom:12px">${title}</h2>
        <div class="grid grid-4">${ks.map((k) => {
          const a = AFFIXES[k];
          return `<button class="card affix-card ${sel === k ? "active" : ""}" data-act="nav" data-href="#/affixes/${encodeURIComponent(k)}">
            <span><span class="chip ${a.type}" style="font-size:.95rem;padding:3px 10px">${esc(k)}</span></span>
            <span class="av">${esc(a.vi)}</span><span class="af">${esc(a.fn)}</span><span class="ac">${count(k)} từ</span></button>`;
        }).join("")}</div></section>`).join("")}
  </div>`;
}

// =====================================================================
// TAB 6 — TỰ THÊM / QUẢN LÝ
// =====================================================================
function viewManage() {
  const q = fold(S.mgrQ.trim());
  const list = CUSTOM.filter((w) => !q || fold(w.word).includes(q) || matchReason(w, S.mgrQ.trim()));
  const learned = Object.values(STATUS_MAP).filter((s) => s === "mastered").length;
  const answered = Object.values(STATS).reduce((s, x) => s + x.c + x.w, 0);
  return `
  <div class="stack">
    <section class="card pad">
      <div class="row between">
        <div><h2 class="section-title">Quản lý kho trường từ &amp; sao lưu</h2>
          <p class="section-sub">Tự thêm trường từ của riêng bạn (ngoài 600 từ trong sách). Dữ liệu lưu trên trình duyệt này — nhớ Xuất JSON để sao lưu.</p></div>
        <div class="row">
          <button class="btn primary" data-act="openWordModal">${icon("plus")} Thêm từ gốc &amp; trường từ</button>
          <button class="btn" data-act="exportJSON">${icon("download", "sm")} Xuất JSON</button>
          <label class="btn" style="cursor:pointer">${icon("upload", "sm")} Nhập JSON<input type="file" accept=".json,application/json" class="hidden" data-change="importJSON"></label>
        </div>
      </div>
      <div class="search-box" style="margin-top:16px">${icon("search", "sm")}<input class="input" placeholder="Tìm trong trường từ tự thêm…" value="${esc(S.mgrQ)}" data-input="mgrSearch"></div>
    </section>

    <div class="stats-line">
      <span><b>${CUSTOM.length}</b>trường từ của bạn</span>
      <span><b>${learned}</b>từ đã thuộc</span>
      <span><b>${answered}</b>câu bài tập đã làm</span>
    </div>

    <div class="row between"><p class="muted" style="font-weight:600;font-size:.85rem">Hiển thị ${list.length} trường từ tự thêm</p>
      <button class="btn sm ghost danger" data-act="resetProgress">${icon("undo", "sm")} Xoá toàn bộ tiến độ học</button></div>
    ${list.length ? `<div class="grid grid-3">${list.map((w) => `
      <div class="card custom-card">
        <div class="row between"><div class="row" style="gap:6px">${dot(w.id)}<b style="font-family:var(--font-display);font-size:1.05rem">${esc(w.word)}</b>${posTag(w.pos)}</div>
          <span class="badge b-teal">+${expandedCount(w)}</span></div>
        <div class="muted" style="font-size:.85rem">${esc(w.vi)}</div>
        <div style="font-size:.78rem" class="muted">${w.family.map((f) => esc(f.w)).join(" · ") || "Chưa có họ từ"}</div>
        <div class="row" style="margin-top:6px">
          <button class="btn sm soft" data-act="nav" data-href="#/network/${w.id}">${icon("network", "sm")} Sơ đồ</button>
          <button class="btn sm" data-act="openWordModal" data-id="${w.id}">${icon("pencil", "sm")} Sửa</button>
          <button class="btn sm ghost danger" data-act="deleteCustom" data-id="${w.id}">${icon("trash", "sm")}</button>
        </div>
      </div>`).join("")}</div>`
      : `<div class="card empty"><b>Chưa có trường từ nào của bạn</b>Thêm một từ bạn gặp ngoài sách, kèm họ từ của nó, để học chung với 600 từ.<br><button class="btn primary" data-act="openWordModal">${icon("plus", "sm")} Thêm trường từ đầu tiên</button></div>`}
  </div>`;
}

function openWordModal(id) {
  const w = id ? BY_ID[id] : null;
  const famText = w ? w.family.map((f) => [f.w, f.pos, f.parts.join("+"), f.vi, f.note || ""].join(" | ").replace(/ \| $/, "")).join("\n") : "";
  $("#modal-root").innerHTML = `
  <div class="modal-backdrop" data-act="closeModal">
    <form class="modal" data-submit="saveWord" data-id="${id || ""}">
      <div class="row between"><h3 style="font-size:1.2rem">${w ? "Sửa" : "Thêm"} trường từ</h3><button type="button" class="icon-btn" data-act="closeModal">${icon("x")}</button></div>
      <div class="grid grid-2" style="margin-top:16px;gap:12px">
        <label class="field"><span>Từ gốc *</span><input class="input" name="word" required value="${esc(w ? w.word : "")}" placeholder="vd: predict"></label>
        <label class="field"><span>Từ loại</span><select class="input" name="pos">${Object.entries(POS_LABEL).map(([k, v]) => `<option value="${k}" ${w && w.pos === k ? "selected" : ""}>${v} (${k})</option>`).join("")}</select></label>
        <label class="field"><span>Nghĩa tiếng Việt *</span><input class="input" name="vi" required value="${esc(w ? w.vi : "")}" placeholder="vd: dự đoán"></label>
        <label class="field"><span>Định nghĩa tiếng Anh</span><input class="input" name="def" value="${esc(w ? w.def : "")}"></label>
        <label class="field"><span>Đồng nghĩa (cách nhau dấu phẩy)</span><input class="input" name="syn" value="${esc(w ? w.syn.join(", ") : "")}" placeholder="foresee, forecast"></label>
        <label class="field"><span>Trái nghĩa (cách nhau dấu phẩy)</span><input class="input" name="ant" value="${esc(w ? w.ant.join(", ") : "")}"></label>
      </div>
      <label class="field" style="margin-top:12px"><span>Câu ví dụ</span><input class="input" name="ex" value="${esc(w && w.ex ? w.ex[0] || "" : "")}"></label>
      <label class="field" style="margin-top:12px"><span>Họ từ — mỗi dòng: từ | từ loại | cấu tạo (nối bằng +) | nghĩa</span>
        <textarea class="textarea" name="family" placeholder="prediction | n | predict+-ion | sự dự đoán&#10;unpredictable | adj | un-+predict+-able | khó đoán">${esc(famText)}</textarea></label>
      <p class="muted" style="font-size:.75rem;margin-top:6px">Từ loại: n, v, adj, adv, phr. Tiền tố viết <span class="chip prefix">un-</span>, hậu tố viết <span class="chip suffix">-able</span>.</p>
      <div class="row" style="justify-content:flex-end;margin-top:18px"><button type="button" class="btn" data-act="closeModal">Huỷ</button><button class="btn primary">${icon("check", "sm")} Lưu trường từ</button></div>
    </form>
  </div>`;
  $(".modal input[name=word]").focus();
}
function saveWord(form) {
  const fd = new FormData(form);
  const v = (k) => String(fd.get(k) || "").trim();
  const list = (k) => v(k).split(",").map((x) => x.trim()).filter(Boolean);
  const family = v("family").split("\n").map((l) => l.split("|").map((c) => c.trim())).filter((c) => c[0])
    .map((c) => ({ w: c[0], pos: c[1] || "n", parts: (c[2] || c[0]).split("+").map((p) => p.trim()).filter(Boolean), vi: c[3] || "", ...(c[4] ? { note: c[4] } : {}) }));
  const id = form.dataset.id || "c-" + lower(v("word")).replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
  const self = family.find((f) => same(f.w, v("word")));
  const w = { id, lesson: 0, word: v("word"), pos: v("pos"), def: v("def"), ex: v("ex") ? [v("ex")] : [], vi: v("vi"),
    syn: list("syn"), ant: list("ant"), parts: self ? self.parts : [v("word")], family };
  const i = CUSTOM.findIndex((x) => x.id === id);
  if (i >= 0) CUSTOM[i] = w; else CUSTOM.push(w);
  pstore.set("vn-custom", CUSTOM);
  rebuildIndex();
  $("#modal-root").innerHTML = "";
  toast(`Đã lưu trường từ “${w.word}”`);
  location.hash = `#/network/${id}`;
  render();
}
function exportJSON() {
  const blob = new Blob([JSON.stringify({ app: "VocaNetwork-600", version: 2, profile: profile(), custom: CUSTOM, status: STATUS_MAP, stats: STATS, book: BOOK_SCORES, log: LOG }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `vocanetwork-${lower(profile().name).replace(/[^a-z0-9]+/g, "-") || "ho-so"}-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importJSON(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  file.text().then((t) => {
    const d = JSON.parse(t);
    if (Array.isArray(d.custom)) { for (const w of d.custom) { const i = CUSTOM.findIndex((x) => x.id === w.id); i >= 0 ? (CUSTOM[i] = w) : CUSTOM.push(w); } pstore.set("vn-custom", CUSTOM); }
    if (d.status) { Object.assign(STATUS_MAP, d.status); pstore.set("vn-status", STATUS_MAP); }
    if (d.stats) { Object.assign(STATS, d.stats); pstore.set("vn-stats", STATS); }
    if (d.book) { Object.assign(BOOK_SCORES, d.book); pstore.set("vn-book", BOOK_SCORES); }
    if (d.log) { for (const [k, v] of Object.entries(d.log)) LOG[k] = LOG[k] || v; pstore.set("vn-log", LOG); }
    if (d.profile && profile() && !profile().setup) { Object.assign(profile(), { ...d.profile, id: CURRENT }); saveProfiles(); }
    rebuildIndex();
    render();
    toast("Đã nhập dữ liệu thành công");
  }).catch(() => toast("File JSON không hợp lệ"));
}

// =====================================================================
// TỔNG QUAN (DASHBOARD) — cá nhân hoá theo hồ sơ
// =====================================================================
// Lộ trình gợi ý: mục tiêu điểm TOEIC → số từ nên thuộc
const TARGETS = [[450, 300, "Nền tảng"], [600, 420, "Trung cấp"], [750, 540, "Khá"], [900, 600, "Giỏi"]];
const targetInfo = (score) => TARGETS.find((t) => t[0] === +score) || TARGETS[1];
const initials = (name) => (name || "?").trim().split(/\s+/).slice(-1)[0].slice(0, 1).toUpperCase();
function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Chào buổi sáng" : h < 14 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}
function lastDays(n) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) { out.push(LOG[dayKey(d)] || { a: 0, c: 0, f: 0, m: 0 }); d.setDate(d.getDate() - 1); }
  return out;
}
function ringHTML(pct, label, sub) {
  const r = 52, c = 2 * Math.PI * r;
  return `<div class="ring" role="img" aria-label="${label} ${sub}">
    <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" class="ring-bg"/><circle cx="60" cy="60" r="${r}" class="ring-fg ${pct >= 100 ? "done" : ""}" style="stroke-dasharray:${c};stroke-dashoffset:${c * (1 - Math.min(pct, 100) / 100)}"/></svg>
    <div class="ring-text"><b>${label}</b><span>${sub}</span></div></div>`;
}
function heatmapHTML() {
  // 12 tuần gần nhất, mỗi cột là một tuần (Thứ 2 → Chủ nhật)
  const weeks = 12;
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (weeks * 7 - 1) - ((end.getDay() + 6) % 7 ? 0 : 0));
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // lùi về Thứ 2
  const cells = [];
  const d = new Date(start);
  while (d <= end) {
    const e = LOG[dayKey(d)];
    const n = e ? e.a + e.f : 0;
    const lv = n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4;
    cells.push(`<i class="hm l${lv}" title="${d.getDate()}/${d.getMonth() + 1}: ${n ? `${e.a} câu, ${e.f} thẻ` : "chưa học"}"></i>`);
    d.setDate(d.getDate() + 1);
  }
  const active = Object.values(LOG).filter((e) => e.a + e.f > 0).length;
  return `<div class="heatmap" style="--weeks:${Math.ceil(cells.length / 7)}">${cells.join("")}</div>
    <div class="hm-legend"><span>${active} ngày đã học</span><span class="hm-scale">Ít <i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i> Nhiều</span></div>`;
}

function viewDash() {
  const p = profile();
  const today = LOG[dayKey()] || { a: 0, c: 0, f: 0, m: 0 };
  const done = today.a + today.f;
  const goal = p.goal || 20;
  const pct = Math.round((done / goal) * 100);
  const st = streak();
  const mastered = WORDS.filter((w) => statusOf(w.id) === "mastered").length;
  const learning = WORDS.filter((w) => statusOf(w.id) === "learning").length;
  const week = lastDays(7);
  const a7 = week.reduce((s, e) => s + e.a, 0), c7 = week.reduce((s, e) => s + e.c, 0);
  const acc = a7 ? Math.round((c7 / a7) * 100) : null;
  const [tScore, tWords, tLevel] = targetInfo(p.target);
  const bookDone = hasBook ? LESSONS.filter((l) => lessonBookDone(l.n)).length : 0;
  const next = resumeLesson();
  const np = lessonProgress(next.n);
  const weak = Object.entries(STATS).filter(([id, s]) => BY_ID[id] && s.w > 0 && statusOf(id) !== "mastered")
    .sort((a, b) => b[1].w - a[1].w || a[1].c - b[1].c).slice(0, 8);
  const recent = Object.entries(BOOK_SCORES).sort((a, b) => b[1].at - a[1].at).slice(0, 5);
  const secName = { wic: "Words in Context", p5: "Part 5", p6: "Part 6", r5: "Word Review 1–10", r6: "Word Review 11–19" };
  const recentLabel = (k) => {
    const [where, sec] = k.split(":");
    return where[0] === "L" ? `Bài ${where.slice(1)} · ${secName[sec] || sec}` : `Ôn tập phần ${where.slice(1)} · ${secName[sec] || sec}`;
  };
  const stat = (num, label, sub, cls = "") => `<div class="d-stat ${cls}"><b>${num}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;

  return `<div class="dash">
    <section class="d-hero">
      <div class="d-hello">
        <div class="avatar lg" style="background:${p.color}">${esc(initials(p.name))}</div>
        <div><p class="kicker">${greeting()}</p><h1>${esc(p.name)}</h1>
          <p class="muted">Mục tiêu TOEIC <b>${tScore}+</b> · ${tLevel} · ${goal} câu/thẻ mỗi ngày
          <button class="text-link" data-act="editProfile">Sửa</button></p></div>
      </div>
      <div class="d-streak ${st ? "on" : ""}" title="Số ngày học liên tiếp">${icon("flame")}<b>${st}</b><span>ngày liên tiếp</span></div>
    </section>

    ${p.setup ? "" : `<section class="card d-setup">
      <div><h3>Cá nhân hoá lộ trình của bạn</h3><p class="muted">Đặt tên, mục tiêu điểm TOEIC và số câu mỗi ngày — trang này sẽ gợi ý bài học và theo dõi tiến độ theo mục tiêu đó.</p></div>
      <button class="btn primary" data-act="editProfile">${icon("target", "sm")} Thiết lập mục tiêu</button>
    </section>`}

    <div class="d-grid">
      <section class="card d-today">
        <div class="d-card-head"><h3>Hôm nay</h3><span class="muted">${new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}</span></div>
        <div class="d-today-body">
          ${ringHTML(pct, `${done}/${goal}`, pct >= 100 ? "✓ Đạt mục tiêu" : "câu & thẻ")}
          <ul class="d-today-list">
            <li><b>${today.a}</b> câu bài tập${today.a ? ` · đúng ${Math.round((today.c / today.a) * 100)}%` : ""}</li>
            <li><b>${today.f}</b> thẻ flashcard</li>
            <li><b>${today.m}</b> từ mới thuộc</li>
          </ul>
        </div>
        <div class="d-next">
          <div class="eyebrow">${np.started ? "Học tiếp" : "Bắt đầu"}</div>
          <div class="d-next-title">Bài ${next.n} · ${esc(next.title)} <span class="muted">${esc(next.vi)}</span></div>
          <div class="row">
            <button class="btn primary" data-act="openLesson" data-n="${next.n}">Trường từ ${icon("right", "sm")}</button>
            <button class="btn" data-act="openLessonFlash" data-n="${next.n}">Flashcard</button>
            ${hasBook ? `<button class="btn" data-act="openLessonBook" data-n="${next.n}">Bài tập sách</button>` : ""}
          </div>
        </div>
      </section>

      <section class="card d-path">
        <div class="d-card-head"><h3>Lộ trình ${tScore}+</h3><span class="muted">${mastered}/${tWords} từ</span></div>
        <div class="progress big"><span style="width:${Math.min(100, (mastered / tWords) * 100)}%"></span></div>
        <p class="muted d-path-note">${mastered >= tWords ? "Bạn đã đủ vốn từ cho mục tiêu này — thử nâng mục tiêu nhé!" : `Còn <b>${tWords - mastered}</b> từ nữa. Với ${goal} câu/ngày, khoảng <b>${Math.max(1, Math.ceil(((tWords - mastered) * 3) / goal))}</b> ngày.`}</p>
        <div class="d-stats">
          ${stat(mastered, "đã thuộc", `/ ${WORDS.length} từ`)}
          ${stat(learning, "đang học")}
          ${stat(acc == null ? "—" : acc + "%", "chính xác", "7 ngày qua")}
          ${hasBook ? stat(bookDone, "bài tập sách", `/ ${LESSONS.length} bài`) : ""}
        </div>
      </section>

      <section class="card d-activity">
        <div class="d-card-head"><h3>Hoạt động 12 tuần</h3></div>
        ${heatmapHTML()}
      </section>

      <section class="card d-units">
        <div class="d-card-head"><h3>Tiến độ theo phần</h3><button class="text-link" data-act="nav" data-href="#/topics">Mục lục ${icon("right", "sm")}</button></div>
        <ul class="d-unit-list">${TOPICS.map((tp, i) => {
          const ws = WORDS.filter((w) => unitOf(w) === tp.id);
          const m = ws.filter((w) => statusOf(w.id) === "mastered").length;
          return `<li><button class="d-unit" data-act="openUnit" data-unit="${tp.id}" data-to="network">
            <span class="d-unit-n">${i + 1}</span><span class="d-unit-t">${esc(tp.name)}</span>
            <span class="progress"><span style="width:${(m / ws.length) * 100}%"></span></span><span class="d-unit-v">${m}/${ws.length}</span></button></li>`;
        }).join("")}</ul>
      </section>

      <section class="card d-weak">
        <div class="d-card-head"><h3>Từ hay làm sai</h3>${weak.length ? `<button class="text-link" data-act="reviewWeak">Ôn bằng flashcard ${icon("right", "sm")}</button>` : ""}</div>
        ${weak.length ? `<ul class="d-weak-list">${weak.map(([id, s]) => {
          const w = BY_ID[id];
          return `<li><a href="#/network/${id}"><b>${esc(w.word)}</b><span class="muted">${esc(w.vi)}</span></a><span class="badge b-rose">sai ${s.w}</span></li>`;
        }).join("")}</ul>` : `<p class="muted d-empty">Chưa có từ nào bị làm sai. Làm vài bài tập để trang này gợi ý từ cần ôn.</p>`}
      </section>

      <section class="card d-recent">
        <div class="d-card-head"><h3>Bài tập gần đây</h3></div>
        ${recent.length ? `<ul class="d-recent-list">${recent.map(([k, v]) => {
          const pc = Math.round((v.right / v.total) * 100);
          return `<li><span>${recentLabel(k)}</span><span class="badge ${pc === 100 ? "b-emerald" : pc >= 60 ? "b-amber" : "b-rose"}">${v.right}/${v.total}</span></li>`;
        }).join("")}</ul>` : `<p class="muted d-empty">Chưa làm bài tập trong sách nào.</p>`}
        ${hasBook ? `<button class="btn sm" style="margin-top:12px" data-act="openLessonBook" data-n="${next.n}">${icon("book", "sm")} Làm bài tập bài ${next.n}</button>` : ""}
      </section>
    </div>
  </div>`;
}

// =====================================================================
// MENU & BIỂU MẪU HỒ SƠ
// =====================================================================
function renderProfileChrome() {
  const p = profile();
  const btn = $("#avatar-btn");
  btn.innerHTML = `<span class="avatar" style="background:${p.color}">${esc(initials(p.name))}</span><span class="avatar-name">${esc(p.name)}</span>`;
  btn.setAttribute("aria-expanded", String(S.menuOpen));
  const menu = $("#profile-menu");
  menu.hidden = !S.menuOpen;
  if (!S.menuOpen) return;
  const pref = themePref();
  const others = PROFILES.filter((x) => x.id !== CURRENT);
  menu.innerHTML = `
    <div class="pm-head"><span class="avatar lg" style="background:${p.color}">${esc(initials(p.name))}</span>
      <div><b>${esc(p.name)}</b><span class="muted">Mục tiêu ${targetInfo(p.target)[0]}+ · ${p.goal} câu/ngày</span></div></div>
    <button class="pm-item" role="menuitem" data-act="editProfile">${icon("user", "sm")} Sửa hồ sơ &amp; mục tiêu</button>
    <button class="pm-item" role="menuitem" data-act="nav" data-href="#/manage">${icon("folder", "sm")} Từ của tôi &amp; sao lưu</button>
    ${others.length ? `<div class="pm-label">Chuyển hồ sơ</div>${others.map((o) => `<button class="pm-item" role="menuitem" data-act="switchProfile" data-id="${o.id}"><span class="avatar sm" style="background:${o.color}">${esc(initials(o.name))}</span> ${esc(o.name)}</button>`).join("")}` : ""}
    <button class="pm-item" role="menuitem" data-act="newProfile">${icon("plus", "sm")} Thêm hồ sơ mới</button>
    <div class="pm-label">Giao diện</div>
    <div class="pm-theme" role="radiogroup">${THEMES.map(([k, ic, label]) => `<button role="radio" aria-checked="${pref === k}" class="${pref === k ? "active" : ""}" data-act="setTheme" data-theme="${k}">${icon(ic, "sm")} ${label}</button>`).join("")}</div>
    <p class="pm-note">Hồ sơ lưu trên trình duyệt này. Dùng “Sao lưu” để chuyển sang máy khác.</p>`;
}
function closeMenu() {
  if (!S.menuOpen) return;
  S.menuOpen = false;
  renderProfileChrome();
}

function openProfileModal(isNew) {
  const p = isNew ? { name: "", color: PROFILE_COLORS[PROFILES.length % PROFILE_COLORS.length], goal: 20, target: 600 } : profile();
  closeMenu();
  $("#modal-root").innerHTML = `
  <div class="modal-backdrop" data-act="closeModal">
    <form class="modal" data-submit="saveProfile" data-new="${isNew ? 1 : 0}" style="width:min(560px,100%)">
      <div class="row between"><h3 style="font-size:1.25rem">${isNew ? "Thêm hồ sơ học" : "Hồ sơ & mục tiêu"}</h3><button type="button" class="icon-btn" data-act="closeModal" aria-label="Đóng">${icon("x")}</button></div>
      <label class="field" style="margin-top:16px"><span>Tên hiển thị</span><input class="input" name="name" required maxlength="40" value="${esc(p.name === "Bạn" && !p.setup ? "" : p.name)}" placeholder="vd: Minh Anh"></label>
      <div class="field" style="margin-top:14px"><span>Màu hồ sơ</span>
        <div class="color-pick">${PROFILE_COLORS.map((c) => `<label><input type="radio" name="color" value="${c}" ${c === p.color ? "checked" : ""}><i style="background:${c}"></i></label>`).join("")}</div></div>
      <div class="field" style="margin-top:14px"><span>Mục tiêu điểm TOEIC</span>
        <div class="choice-row">${TARGETS.map(([s, w, lv]) => `<label><input type="radio" name="target" value="${s}" ${+p.target === s ? "checked" : ""}><span><b>${s}+</b><small>${lv} · ${w} từ</small></span></label>`).join("")}</div></div>
      <div class="field" style="margin-top:14px"><span>Mỗi ngày học</span>
        <div class="choice-row">${[[10, "Nhẹ nhàng"], [20, "Đều đặn"], [40, "Tăng tốc"], [60, "Cấp tốc"]].map(([g, lv]) => `<label><input type="radio" name="goal" value="${g}" ${+p.goal === g ? "checked" : ""}><span><b>${g}</b><small>${lv}</small></span></label>`).join("")}</div>
        <p class="muted" style="font-size:.8rem;margin-top:6px">Tính cả câu bài tập và thẻ flashcard.</p></div>
      <div class="row between" style="margin-top:22px">
        ${!isNew && PROFILES.length > 1 ? `<button type="button" class="btn ghost danger" data-act="deleteProfile">${icon("trash", "sm")} Xoá hồ sơ</button>` : "<span></span>"}
        <div class="row"><button type="button" class="btn" data-act="closeModal">Huỷ</button><button class="btn primary">${icon("check", "sm")} ${isNew ? "Tạo hồ sơ" : "Lưu"}</button></div>
      </div>
    </form>
  </div>`;
  $(".modal input[name=name]").focus();
}
function saveProfileForm(form) {
  const fd = new FormData(form);
  const data = { name: String(fd.get("name") || "").trim() || "Bạn", color: fd.get("color") || PROFILE_COLORS[0], target: +fd.get("target") || 600, goal: +fd.get("goal") || 20, setup: true };
  if (form.dataset.new === "1") {
    const p = { id: newProfileId(), created: Date.now(), ...data };
    PROFILES.push(p);
    switchProfile(p.id, true);
    toast(`Đã tạo hồ sơ “${p.name}”`);
  } else {
    Object.assign(profile(), data);
    saveProfiles();
    toast("Đã lưu hồ sơ");
  }
  $("#modal-root").innerHTML = "";
  render();
}
function switchProfile(id, silent) {
  CURRENT = id;
  saveProfiles();
  loadProfileData();
  rebuildIndex();
  if (typeof resetBook === "function") resetBook();
  BOOK.touched = false;
  S.fc.deck = [];
  S.quiz.qs = []; S.quiz.i = 0;
  S.menuOpen = false;
  if (!silent) toast(`Đang dùng hồ sơ “${profile().name}”`);
  if (location.hash !== "#/") location.hash = "#/"; else route();
}
function deleteProfile() {
  const p = profile();
  if (PROFILES.length < 2 || !confirm(`Xoá hồ sơ “${p.name}” cùng toàn bộ tiến độ của hồ sơ này? Không thể hoàn tác.`)) return;
  for (const k of PROFILE_KEYS) { try { localStorage.removeItem(`${k}@${p.id}`); } catch (e) { /* bỏ qua */ } }
  PROFILES = PROFILES.filter((x) => x.id !== p.id);
  $("#modal-root").innerHTML = "";
  switchProfile(PROFILES[0].id);
}

// =====================================================================
// ROUTER, RENDER, EVENTS
// =====================================================================
function renderChrome() {
  $("#brand-logo").innerHTML = icon("network");
  $("#tabs").innerHTML = TAB_DEFS.map((t) => `<button class="tab ${S.tab === t.id ? "active" : ""}" data-act="nav" data-href="${t.href}" ${S.tab === t.id ? 'aria-current="page"' : ""}>${icon(t.icon, "sm")}<span class="tl">${t.label}</span><span class="ts">${t.short}</span></button>`).join("");
  $("#bottom-nav").innerHTML = TAB_DEFS.map((t) => `<button class="${S.tab === t.id ? "active" : ""}" data-act="nav" data-href="${t.href}">${icon(t.icon)}<span>${t.short}</span></button>`).join("");
  renderThemeSeg();
  renderProfileChrome();
  $("#gsearch-btn").innerHTML = icon("search");
}
let renderedTab = null;
function render() {
  const app = $("#app");
  // Giữ vị trí cuộn khi vẽ lại cùng một tab (tránh trang bị giật lên đầu)
  const keepY = renderedTab === S.tab ? window.scrollY : 0;
  if (keepY) app.style.minHeight = app.offsetHeight + "px";
  renderChrome();
  const views = { dash: viewDash, topics: viewTopics, network: viewNetwork, flashcards: viewFlashcards, quiz: viewQuiz, affixes: viewAffixes, manage: viewManage };
  app.innerHTML = views[S.tab]();
  if (renderedTab !== S.tab) {
    // Hiệu ứng chuyển trang chỉ chạy khi đổi tab
    app.classList.remove("page-enter");
    void app.offsetWidth;
    app.classList.add("page-enter");
    renderedTab = S.tab;
  } else if (keepY) {
    window.scrollTo(0, keepY);
  }
  app.style.minHeight = "";
  if (S.tab === "network") afterNetwork();
}
const prefersReducedMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const smooth = () => (prefersReducedMotion() ? "auto" : "smooth");
function route() {
  S.menuOpen = false;
  const [tab, a, b] = (location.hash.replace(/^#\/?/, "") || "").split("/").map(decodeURIComponent);
  const prevTab = renderedTab;
  S.tab = TAB_DEFS.some((t) => t.id === tab) || tab === "manage" ? tab : "dash";
  let filtersReset = false;
  if (S.tab === "network" && a && BY_ID[a]) {
    if (!networkList().some((w) => w.id === a)) { Object.assign(S.net, { unit: "all", lesson: "all", q: "", status: "all", pos: "all", affix: "all" }); filtersReset = true; }
    S.net.id = a;
    S.net.focus = b || null;
  }
  if (S.tab === "affixes") S.affix = a || null;
  if (S.tab === "flashcards" && !S.fc.deck.length) buildDeck();
  if (S.tab === "quiz" && !S.quiz.qs.length && S.quiz.i === 0) startQuiz();
  // lần đầu mở bài tập sách: chọn sẵn bài đang học dở
  if (S.tab === "quiz" && hasBook && !BOOK.touched) {
    const r = resumeLesson();
    Object.assign(BOOK, { unit: r.unit, lesson: String(r.n), touched: true });
  }

  if (S.tab === "network" && prevTab === "network" && !filtersReset && $("#root-list")) {
    // Đổi từ gốc trong cùng trang: chỉ vẽ lại vùng sơ đồ
    updateNetwork({ list: false });
    const c = $("#canvas");
    if (c && !b && c.getBoundingClientRect().top < 70) window.scrollTo({ top: window.scrollY + c.getBoundingClientRect().top - 84, behavior: smooth() });
    return;
  }
  render();
  if (S.tab !== prevTab || (S.tab === "affixes" && !a)) window.scrollTo(0, 0);
  if (S.tab === "affixes" && a) { const p = $("#affix-panel"); if (p) p.scrollIntoView({ behavior: smooth(), block: "start" }); }
  if (S.tab === "network" && a && window.innerWidth < 1024 && !b) { const c = $("#canvas"); if (c) c.scrollIntoView({ block: "start" }); }
}

const ACTIONS = {
  nav: (el) => { const h = el.dataset.href; if (location.hash === h) route(); else location.hash = h; },
  speak: (el) => speak(el.dataset.text),
  setTheme: (el) => { applyTheme(el.dataset.theme); renderProfileChrome(); toast(`Giao diện: ${THEMES.find((x) => x[0] === el.dataset.theme)[2]}`); },
  openSearch: () => { document.querySelector(".header").classList.toggle("search-open"); $("#gsearch-input").focus(); },
  gsGo: (el) => { closeSearch(true); ACTIONS.nav(el); },
  openLesson: (el) => {
    const l = LESSON_BY_N[el.dataset.n];
    Object.assign(S.net, { unit: l.unit, lesson: String(l.n), q: "", id: null });
    location.hash = "#/network";
    if (S.tab === "network") render();
  },
  netReset: () => { Object.assign(S.net, { unit: "all", lesson: "all", q: "", id: null, status: "all", pos: "all", affix: "all", sort: "book" }); render(); },
  goLesson: (el) => {
    const n = el.dataset.n, where = el.dataset.where;
    if (!n) return;
    const st = { net: S.net, fc: S.fc, quiz: S.quiz, book: BOOK }[where];
    if (n !== "all") st.unit = LESSON_BY_N[n].unit;
    st.lesson = n;
    if (where === "net") { st.id = null; st.q = ""; }
    if (where === "fc") buildDeck();
    if (where === "quiz") startQuiz();
    if (where === "book") resetBook();
    render();
    const nav = $(".lesson-nav");
    if (nav && nav.getBoundingClientRect().top < 60) window.scrollTo({ top: window.scrollY + nav.getBoundingClientRect().top - 76, behavior: smooth() });
    const active = $(".lesson-steps .step.active");
    if (active) active.scrollIntoView({ block: "nearest", inline: "center" });
  },
  profileMenu: () => { S.menuOpen = !S.menuOpen; renderProfileChrome(); },
  editProfile: () => openProfileModal(false),
  newProfile: () => openProfileModal(true),
  switchProfile: (el) => switchProfile(el.dataset.id),
  deleteProfile: () => deleteProfile(),
  reviewWeak: () => {
    // thẻ flashcard gồm các từ hay sai nhất
    const ids = Object.entries(STATS).filter(([id, s]) => BY_ID[id] && s.w > 0 && statusOf(id) !== "mastered").sort((a, b) => b[1].w - a[1].w).map(([id]) => id).slice(0, 20);
    Object.assign(S.fc, { unit: "all", lesson: "all", status: "all", deck: ids, i: 0, flipped: false });
    location.hash = "#/flashcards";
  },
  quizMode: (el) => { S.quiz.mode = el.dataset.mode; render(); },
  openLessonBook: (el) => {
    const l = LESSON_BY_N[el.dataset.n];
    Object.assign(BOOK, { unit: l.unit, lesson: String(l.n), touched: true });
    resetBook();
    S.quiz.mode = "book";
    if (location.hash === "#/quiz") render(); else location.hash = "#/quiz";
  },
  wicChip: (el) => {
    const wic = EXERCISES.lessons[BOOK.lesson].wic;
    const fills = (BOOK.fills.wic = BOOK.fills.wic || {});
    const total = wic.answers.length;
    const empty = (k) => !fills[k];
    let n = BOOK.active && empty(BOOK.active) ? BOOK.active : Array.from({ length: total }, (_, k) => k + 1).find(empty);
    if (BOOK.active && !empty(BOOK.active)) n = BOOK.active; // ô đang chọn đã có chữ: thay thế
    if (!n) return;
    fills[n] = { w: wic.answers[+el.dataset.i][0], chip: +el.dataset.i };
    // tự chuyển sang ô trống kế tiếp
    BOOK.active = Array.from({ length: total }, (_, k) => ((n + k) % total) + 1).find(empty) || null;
    render();
    const nxt = BOOK.active && $(`.gap[data-n="${BOOK.active}"]`);
    if (nxt && window.innerWidth < 760) nxt.scrollIntoView({ block: "center", behavior: smooth() });
  },
  wicGap: (el) => {
    const n = +el.dataset.n;
    const fills = (BOOK.fills.wic = BOOK.fills.wic || {});
    if (fills[n]) delete fills[n];
    BOOK.active = n;
    render();
  },
  bookPick: (el) => {
    const sec = el.dataset.sec;
    (BOOK.fills[sec] = BOOK.fills[sec] || {})[el.dataset.q] = el.dataset.v;
    render();
  },
  bookCheck: (el) => bookCheck(el.dataset.sec),
  bookReset: (el) => {
    const sec = el.dataset.sec;
    delete BOOK.fills[sec]; delete BOOK.checked[sec]; BOOK.active = null;
    render();
    const s = $(`#sec-${sec}`);
    if (s) s.scrollIntoView({ behavior: smooth(), block: "start" });
  },
  jumpQ: (el) => {
    const target = document.getElementById(el.dataset.target);
    if (!target) return;
    target.scrollIntoView({ behavior: smooth(), block: "center" });
    target.classList.remove("pulse"); void target.offsetWidth; target.classList.add("pulse");
  },
  netByAffix: (el) => { Object.assign(S.net, { unit: "all", lesson: "all", q: "", id: null, affix: el.dataset.affix }); location.hash = "#/network"; },
  netClearFilters: () => { Object.assign(S.net, { status: "all", pos: "all", affix: "all", sort: "book", id: null }); render(); },
  fcAll: () => { S.fc.status = "all"; buildDeck(); render(); },
  openLessonFlash: (el) => {
    const l = LESSON_BY_N[el.dataset.n];
    Object.assign(S.fc, { unit: l.unit, lesson: String(l.n), status: "all" });
    buildDeck();
    location.hash = "#/flashcards";
  },
  openUnit: (el) => {
    const unit = el.dataset.unit, to = el.dataset.to;
    if (to === "network") Object.assign(S.net, { unit, lesson: "all", q: "", id: null });
    if (to === "flashcards") { Object.assign(S.fc, { unit, lesson: "all" }); buildDeck(); }
    if (to === "quiz") {
      Object.assign(S.quiz, { unit, lesson: "all", forWord: null }); startQuiz();
      if (hasBook && unit !== "custom") { Object.assign(BOOK, { unit, lesson: "all", touched: true }); resetBook(); S.quiz.mode = "book"; }
    }
    location.hash = "#/" + to;
  },
  netUnit: (el) => { Object.assign(S.net, { unit: el.dataset.unit, lesson: "all", id: null }); render(); },
  fcFlip: (el, e) => { if (e.target.closest("[data-act]") !== el && e.target.closest("button")) return; fcFlip(); },
  fcMove: (el) => fcMove(+el.dataset.d),
  fcRate: (el) => fcRate(el.dataset.s),
  fcShuffle: () => { S.fc.deck = shuffle(S.fc.deck); S.fc.i = 0; S.fc.flipped = false; render(); toast("Đã trộn thẻ"); },
  quizSetType: (el) => { S.quiz.type = el.dataset.type; startQuiz(); render(); },
  quizRestart: () => { startQuiz(); render(); },
  quizClearWord: () => { S.quiz.forWord = null; startQuiz(); render(); },
  quizForWord: (el) => { Object.assign(S.quiz, { forWord: el.dataset.id, type: el.dataset.type, mode: "auto" }); startQuiz(); location.hash = "#/quiz"; },
  quizChoose: (el) => quizChoose(+el.dataset.i),
  quizNext: () => quizNext(),
  tile: (el) => { const st = S.quiz; const i = +el.dataset.i; if (!st.answered && !st.picked.includes(i)) { st.picked.push(i); render(); } },
  untile: (el) => { const st = S.quiz; st.picked = st.picked.filter((i) => i !== +el.dataset.i); render(); },
  buildClear: () => { S.quiz.picked = []; render(); },
  buildCheck: () => { const st = S.quiz; const q = st.qs[st.i]; quizAnswer(st.picked.map((i) => q.tiles[i]).join("|") === q.f.parts.join("|")); },
  openWordModal: (el) => openWordModal(el.dataset.id),
  closeModal: (el, e) => { if (e.target === el || el.tagName === "BUTTON") $("#modal-root").innerHTML = ""; },
  deleteCustom: (el) => {
    const w = BY_ID[el.dataset.id];
    if (!w || !confirm(`Xoá trường từ “${w.word}”?`)) return;
    CUSTOM = CUSTOM.filter((x) => x.id !== w.id);
    pstore.set("vn-custom", CUSTOM);
    rebuildIndex();
    render();
    toast("Đã xoá");
  },
  exportJSON: () => exportJSON(),
  resetProgress: () => {
    if (!confirm("Xoá toàn bộ trạng thái học và thống kê bài tập? (Trường từ tự thêm vẫn giữ nguyên)")) return;
    STATUS_MAP = {}; STATS = {};
    BOOK_SCORES = {}; LOG = {};
    pstore.set("vn-status", STATUS_MAP); pstore.set("vn-stats", STATS); pstore.set("vn-book", BOOK_SCORES); pstore.set("vn-log", LOG);
    render();
    toast("Đã xoá tiến độ");
  },
};
const CHANGES = {
  status: (el) => {
    setStatus(el.dataset.id, el.value);
    el.className = `status-select ${el.value}`;
    const d = $(`.root-item[data-id="${CSS.escape(el.dataset.id)}"] .dot`);
    if (d) d.className = `dot ${el.value}`;
    toast(`Đã đánh dấu: ${STATUS[el.value].label}`);
  },
  netFilter: (el) => { S.net[el.dataset.key] = el.value; S.net.id = null; render(); },
  netLesson: (el) => { S.net.lesson = el.value; S.net.id = null; updateNetwork(); },
  fcUnit: (el) => { S.fc.unit = el.value; S.fc.lesson = "all"; buildDeck(); render(); },
  fcLesson: (el) => { S.fc.lesson = el.value; buildDeck(); render(); },
  fcStatus: (el) => { S.fc.status = el.value; buildDeck(); render(); },
  quizUnit: (el) => { S.quiz.unit = el.value; S.quiz.lesson = "all"; startQuiz(); render(); },
  quizLesson: (el) => { S.quiz.lesson = el.value; startQuiz(); render(); },
  bookUnit: (el) => { BOOK.touched = true; BOOK.unit = el.value; BOOK.lesson = "all"; resetBook(); render(); },
  bookLesson: (el) => { BOOK.lesson = el.value; resetBook(); render(); },
  quizOnly: (el) => { S.quiz.only = el.value; startQuiz(); render(); },
  quizStyle: (el) => { S.quiz.style = el.value; render(); },
  importJSON: (el) => importJSON(el),
};
const INPUTS = {
  gSearch: () => { GS.sel = 0; renderSearch(); },
  netSearch: (el) => {
    // Gõ tới đâu lọc tới đó, nhưng chờ 120ms để không vẽ lại liên tục
    clearTimeout(INPUTS._t);
    INPUTS._t = setTimeout(() => {
      S.net.q = el.value;
      S.net.id = null;
      updateNetwork();
    }, 120);
  },
  mgrSearch: (el) => {
    S.mgrQ = el.value;
    const pos = el.selectionStart;
    render();
    const inp = $('[data-input="mgrSearch"]');
    inp.focus();
    inp.setSelectionRange(pos, pos);
  },
};
const SUBMITS = {
  quizType: () => {
    const st = S.quiz;
    const q = st.qs[st.i];
    const v = lower($("#quiz-input").value);
    if (!v || st.answered) return;
    quizAnswer(v === lower(q.m.text) || v === lower(q.f.w));
  },
  saveWord: (form) => saveWord(form),
  saveProfile: (form) => saveProfileForm(form),
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.dataset.act !== "fcFlip" && el.dataset.act !== "closeModal") e.preventDefault();
  if (el.dataset.act === "speak") e.stopPropagation();
  fn(el, e);
});
document.addEventListener("change", (e) => { const el = e.target.closest("[data-change]"); if (el && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el); });
document.addEventListener("input", (e) => { const el = e.target.closest("[data-input]"); if (el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el); });
document.addEventListener("submit", (e) => { const el = e.target.closest("[data-submit]"); if (el && SUBMITS[el.dataset.submit]) { e.preventDefault(); SUBMITS[el.dataset.submit](el); } });
document.addEventListener("keydown", (e) => {
  if ($("#modal-root").innerHTML) { if (e.key === "Escape") $("#modal-root").innerHTML = ""; return; }
  if (e.key === "Escape" && S.menuOpen) { closeMenu(); $("#avatar-btn").focus(); return; }
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  if (e.key === "/" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); ACTIONS.openSearch(); return; }
  if (S.tab === "flashcards") {
    if (e.key === " ") { e.preventDefault(); fcFlip(); }
    else if (e.key === "ArrowRight") fcMove(1);
    else if (e.key === "ArrowLeft") fcMove(-1);
    else if (e.key === "1") fcRate("new");
    else if (e.key === "2") fcRate("learning");
    else if (e.key === "3") fcRate("mastered");
  } else if (S.tab === "quiz" && (S.quiz.mode || (hasBook ? "book" : "auto")) === "auto") {
    const st = S.quiz;
    const n = parseInt(e.key, 10);
    const q = st.qs[st.i];
    const typing = q && q.kind === "formation" && st.style === "typing";
    if (!st.answered && !typing && n >= 1 && n <= 4) quizChoose(n - 1);
    else if (st.answered && e.key === "Enter") { e.preventDefault(); quizNext(); }
  }
});
$("#gsearch-input").addEventListener("keydown", (e) => {
  const n = GS.results.length;
  if (e.key === "ArrowDown" && n) { e.preventDefault(); GS.sel = (GS.sel + 1) % n; renderSearch(); }
  else if (e.key === "ArrowUp" && n) { e.preventDefault(); GS.sel = (GS.sel - 1 + n) % n; renderSearch(); }
  else if (e.key === "Enter" && n) { e.preventDefault(); const b = $$(".gs-item")[GS.sel]; if (b) ACTIONS.gsGo(b); }
  else if (e.key === "Escape") { closeSearch(true); }
});
$("#gsearch-input").addEventListener("focus", () => { if ($("#gsearch-input").value.trim()) renderSearch(); });
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest("#gsearch, #gsearch-btn")) closeSearch(false);
  if (!e.target.closest(".profile-wrap")) closeMenu();
});
window.addEventListener("hashchange", route);

ensureProfile();
loadProfileData();
rebuildIndex();
route();
