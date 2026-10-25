"use client";
import { useEffect, useState } from "react";
import {
  chooseEnglishVoice,
  getSpeechSettings,
  saveSpeechSettings,
  speak,
  speechVoiceId,
  type SpeechRate,
  type SpeechSettings,
} from "../lib/speech";
import { useEnglishVoices } from "../lib/use-english-voices";
import { Icon } from "../shared/ui";

export function SpeechPreferences() {
  const voices = useEnglishVoices();
  const [settings, setSettings] = useState<SpeechSettings>({ voiceId: "", rate: 0.8 });
  useEffect(() => setSettings(getSpeechSettings()), []);
  const update = (next: SpeechSettings) => {
    setSettings(next);
    saveSpeechSettings(next);
  };
  const selected = chooseEnglishVoice(voices, settings.voiceId);
  return (
    <section className="speech-preferences settings-form" aria-label="Phát âm">
      <h3>Phát âm</h3>
      {!voices.length ? (
        <p className="field-hint" role="status">
          Máy này chưa có giọng tiếng Anh khả dụng. Hãy kiểm tra giọng đọc của Edge/Chrome.
        </p>
      ) : (
        <>
          <label htmlFor="speech-voice">Giọng tiếng Anh</label>
          <select
            id="speech-voice"
            value={selected ? speechVoiceId(selected) : ""}
            onChange={(e) => update({ ...settings, voiceId: e.target.value })}
          >
            {voices.map((voice) => (
              <option key={speechVoiceId(voice)} value={speechVoiceId(voice)}>
                {voice.name} · {voice.lang}
              </option>
            ))}
          </select>
          <label htmlFor="speech-rate">Tốc độ đọc</label>
          <select
            id="speech-rate"
            value={settings.rate}
            onChange={(e) => update({ ...settings, rate: Number(e.target.value) as SpeechRate })}
          >
            <option value={0.6}>Chậm · 0.6×</option>
            <option value={0.8}>Vừa · 0.8×</option>
            <option value={1}>Bình thường · 1×</option>
          </select>
          <button
            className="button secondary"
            type="button"
            onClick={() => speak("A little practice every day.", { voiceId: settings.voiceId, rate: settings.rate })}
          >
            <Icon name="sound" size={18} />
            Nghe thử
          </button>
          <p className="field-hint">Tự lưu trên máy này. Bấm lại cùng từ trong 3 giây để nghe chậm.</p>
        </>
      )}
    </section>
  );
}
