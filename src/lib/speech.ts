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
let memorySettings = DEFAULT_SETTINGS;
let memoryOnly = false;
let previousText = "";
let previousAt: number | null = null;

export function getSpeechSettings(): SpeechSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  if (memoryOnly) return { ...memorySettings };
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null") as Partial<SpeechSettings> | null;
    return {
      voiceId: typeof saved?.voiceId === "string" ? saved.voiceId : "",
      rate: saved?.rate === 0.6 || saved?.rate === 0.8 || saved?.rate === 1 ? saved.rate : 0.8,
    };
  } catch {
    return { ...memorySettings };
  }
}
export function saveSpeechSettings(settings: SpeechSettings) {
  if (typeof window === "undefined") return;
  memorySettings = { ...settings };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    memoryOnly = false;
  } catch {
    memoryOnly = true;
    /* Device preferences remain usable in memory. */
  }
}
export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function")
    return [];
  try {
    return window.speechSynthesis.getVoices().filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
  } catch {
    return [];
  }
}
export function speechVoiceId(voice: SpeechSynthesisVoice) {
  return voice.voiceURI || `${voice.name}|${voice.lang}`;
}
export function chooseEnglishVoice(voices: SpeechSynthesisVoice[], voiceId: string) {
  return (
    voices.find((voice) => speechVoiceId(voice) === voiceId) ??
    voices.find((voice) => /natural|online|google/i.test(voice.name)) ??
    voices.find((voice) => /^en[-_]US(?:$|-)/i.test(voice.lang)) ??
    voices[0]
  );
}
export function subscribeEnglishVoices(changed: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => {};
  const engine = window.speechSynthesis;
  engine.addEventListener("voiceschanged", changed);
  engine.getVoices();
  return () => engine.removeEventListener("voiceschanged", changed);
}
export function cancelSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}
export function speak(text: string, options: SpeakOptions = {}) {
  const voices = getEnglishVoices();
  if (!text.trim() || !voices.length) return;
  const settings = getSpeechSettings();
  const normalized = text.trim().toLowerCase();
  const now = Date.now();
  const repeated = previousAt !== null && normalized === previousText && now - previousAt <= 3000;
  previousText = normalized;
  previousAt = now;
  cancelSpeech();
  const utterance = new window.SpeechSynthesisUtterance(text);
  const voice = chooseEnglishVoice(voices, options.voiceId ?? settings.voiceId);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = options.rate ?? (repeated ? 0.6 : settings.rate);
  window.speechSynthesis.speak(utterance);
}
