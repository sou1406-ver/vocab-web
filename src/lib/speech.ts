export type SpeechRate = 0.6 | 0.8 | 1;

export interface SpeechSettings {
  voiceId: string;
  rate: SpeechRate;
}

export interface SpeakOptions {
  voiceId?: string;
  rate?: SpeechRate;
}

const SETTINGS_KEY = "vocab-speech-settings";
const DEFAULT_SETTINGS: SpeechSettings = { voiceId: "", rate: 0.8 };
let previousText = "";
let previousAt = 0;

export function getSpeechSettings(): SpeechSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<SpeechSettings> | null;
    return {
      voiceId: typeof saved?.voiceId === "string" ? saved.voiceId : DEFAULT_SETTINGS.voiceId,
      rate: saved?.rate === 0.6 || saved?.rate === 0.8 || saved?.rate === 1 ? saved.rate : DEFAULT_SETTINGS.rate,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSpeechSettings(settings: SpeechSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Keep speech usable even when browser storage is unavailable (for example, private mode).
  }
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices().filter((voice) => /^en(?:-|_)/i.test(voice.lang));
}

export function speechVoiceId(voice: SpeechSynthesisVoice) {
  return voice.voiceURI || `${voice.name}|${voice.lang}`;
}

function chooseVoice(voices: SpeechSynthesisVoice[], voiceId: string) {
  return (
    voices.find((voice) => speechVoiceId(voice) === voiceId) ??
    voices.find((voice) => /natural|online|google/i.test(voice.name)) ??
    voices.find((voice) => /^en[-_]US/i.test(voice.lang)) ??
    voices[0]
  );
}

/** Đọc bằng giọng tiếng Anh đã chọn; bấm lại cùng từ trong 3 giây sẽ đọc chậm. */
export function speak(text: string, options: SpeakOptions = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  const settings = getSpeechSettings();
  const repeated = !options.rate && !options.voiceId && text === previousText && Date.now() - previousAt <= 3000;
  const rate = options.rate ?? (repeated ? 0.6 : settings.rate);
  previousText = repeated ? "" : text;
  previousAt = repeated ? 0 : Date.now();

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  const voices = getEnglishVoices();
  const voice = chooseVoice(voices, options.voiceId ?? settings.voiceId);
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

// Nạp sẵn danh sách giọng (Chrome đôi khi trả về rỗng ở lần gọi đầu).
if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.getVoices();
