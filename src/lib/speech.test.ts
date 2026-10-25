import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let speech: typeof import("./speech");
beforeEach(async () => {
  vi.resetModules();
  speech = await import("./speech");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const voice = (name: string, lang = "en-US") =>
  ({ name, lang, voiceURI: name, localService: true, default: false }) as SpeechSynthesisVoice;
function browser(voices = [voice("English")]) {
  const events = new EventTarget();
  const calls: string[] = [];
  const spoken: SpeechSynthesisUtterance[] = [];
  const storage = new Map<string, string>();
  const engine = {
    getVoices: () => voices,
    cancel: () => calls.push("cancel"),
    speak: (utterance: SpeechSynthesisUtterance) => {
      calls.push("speak");
      spoken.push(utterance);
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  class Utterance {
    text: string;
    rate = 1;
    lang = "";
    voice: SpeechSynthesisVoice | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal("window", {
    speechSynthesis: engine,
    SpeechSynthesisUtterance: Utterance,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  return { engine, events, calls, spoken, storage };
}
describe("Desktop speech", () => {
  it("is safe without browser APIs or English voices", () => {
    expect(speech.getEnglishVoices()).toEqual([]);
    expect(() => speech.speak("hello")).not.toThrow();
    expect(speech.getSpeechSettings()).toEqual({ voiceId: "", rate: 0.8 });
    const mock = browser([voice("Vietnamese", "vi-VN")]);
    speech.speak("hello");
    expect(mock.spoken).toEqual([]);
  });
  it("filters English voices and selects saved, natural, en-US then first", () => {
    const british = voice("British", "en-GB");
    const american = voice("American");
    const natural = voice("Google English", "en-GB");
    browser([voice("French", "fr-FR"), british, american, natural]);
    expect(speech.getEnglishVoices()).toEqual([british, american, natural]);
    expect(speech.chooseEnglishVoice([british, american, natural], "British")).toBe(british);
    expect(speech.chooseEnglishVoice([british, american, natural], "missing")).toBe(natural);
    expect(speech.chooseEnglishVoice([british, american], "")).toBe(american);
    expect(speech.chooseEnglishVoice([british], "")).toBe(british);
  });
  it("cancels before speaking, uses saved rate/voice, and slows every repeat within three seconds", () => {
    const mock = browser();
    speech.saveSpeechSettings({ voiceId: "English", rate: 1 });
    const now = vi.spyOn(Date, "now").mockReturnValue(10000);
    speech.speak("agreement");
    now.mockReturnValue(12000);
    speech.speak("agreement");
    now.mockReturnValue(12500);
    speech.speak("agreement");
    now.mockReturnValue(16000);
    speech.speak("agreement");
    expect(mock.spoken.map((item) => item.rate)).toEqual([1, 0.6, 0.6, 1]);
    expect(mock.spoken[0].voice?.name).toBe("English");
    expect(mock.calls).toEqual(["cancel", "speak", "cancel", "speak", "cancel", "speak", "cancel", "speak"]);
    speech.speak("agreement", { rate: 0.8 });
    expect(mock.spoken.at(-1)?.rate).toBe(0.8);
  });
  it("validates local preferences and stays usable when storage is blocked", () => {
    const mock = browser();
    mock.storage.set("vocab-speech-settings", '{"voiceId":12,"rate":42}');
    expect(speech.getSpeechSettings()).toEqual({ voiceId: "", rate: 0.8 });
    mock.storage.set("vocab-speech-settings", "broken-json");
    expect(() => speech.getSpeechSettings()).not.toThrow();
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
    expect(() => speech.saveSpeechSettings({ voiceId: "English", rate: 0.6 })).not.toThrow();
    speech.speak("inspect");
    expect(mock.spoken[0].rate).toBe(0.6);
  });
  it("subscribes and unsubscribes to delayed voice loading", () => {
    const mock = browser([]);
    const changed = vi.fn();
    const stop = speech.subscribeEnglishVoices(changed);
    mock.events.dispatchEvent(new Event("voiceschanged"));
    expect(changed).toHaveBeenCalledTimes(1);
    stop();
    mock.events.dispatchEvent(new Event("voiceschanged"));
    expect(changed).toHaveBeenCalledTimes(1);
  });
  it("uses new in-memory preferences when only storage writes fail", () => {
    const mock = browser();
    mock.storage.set("vocab-speech-settings", '{"voiceId":"English","rate":1}');
    window.localStorage.setItem = () => {
      throw new Error("quota");
    };
    speech.saveSpeechSettings({ voiceId: "English", rate: 0.6 });
    speech.speak("delivery");
    expect(mock.spoken[0].rate).toBe(0.6);
  });
});
