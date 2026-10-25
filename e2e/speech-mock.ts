import type { Page } from "@playwright/test";
import type { Snapshot } from "../src/domain/types";

export async function mockSpeech(page: Page, mode: "ready" | "delayed" | "none" | "unsupported" = "ready") {
  await page.addInitScript((mode) => {
    let ready = mode === "ready";
    const english = [
      { name: "Google English Natural", lang: "en-US", voiceURI: "natural", localService: false, default: true },
      { name: "British English", lang: "en-GB", voiceURI: "british", localService: true, default: false },
    ];
    const engine = new EventTarget() as EventTarget & {
      getVoices: () => object[];
      cancel: () => void;
      speak: (utterance: { text: string; rate: number; voice: { voiceURI: string } }) => void;
    };
    const log: { text: string; rate: number; voiceId: string }[] = [];
    let cancelled = 0;
    engine.getVoices = () => [...(ready ? english : []), { name: "Vietnamese", lang: "vi-VN", voiceURI: "vi" }];
    engine.cancel = () => {
      cancelled++;
    };
    engine.speak = (utterance) =>
      log.push({ text: utterance.text, rate: utterance.rate, voiceId: utterance.voice.voiceURI });
    class Utterance {
      text: string;
      rate = 1;
      lang = "";
      voice = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: mode === "unsupported" ? undefined : engine,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: Utterance });
    Object.assign(window, {
      __speech: {
        log,
        cancelled: () => cancelled,
        load: () => {
          ready = true;
          engine.dispatchEvent(new Event("voiceschanged"));
        },
        clear: () => {
          ready = false;
          engine.dispatchEvent(new Event("voiceschanged"));
        },
      },
    });
  }, mode);
}
export function speechLog(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __speech: { log: { text: string; rate: number; voiceId: string }[] } }).__speech.log,
  );
}
export function readSnapshot(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Snapshot>((resolve, reject) => {
        const open = indexedDB.open("vocab-learn-v2", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("snapshots", "readonly");
          const read = tx.objectStore("snapshots").get("guest");
          read.onerror = () => reject(read.error);
          read.onsuccess = () => resolve(read.result);
          tx.oncomplete = () => db.close();
        };
      }),
  );
}
