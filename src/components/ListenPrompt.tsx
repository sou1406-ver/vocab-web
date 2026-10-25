"use client";
import { useEffect } from "react";
import Link from "next/link";
import { cancelSpeech, speak } from "../lib/speech";
import { Icon } from "../shared/ui";

export function ListenPrompt({ text, available, active }: { text: string; available: boolean; active: boolean }) {
  useEffect(() => {
    if (!available || !active) return;
    speak(text);
    return cancelSpeech;
  }, [text, available, active]);
  if (!active) return null;
  if (!available)
    return (
      <p className="muted" role="status">
        Máy này chưa có giọng tiếng Anh khả dụng.{" "}
        <Link className="text-link" href="/settings">
          Cài đặt phát âm
        </Link>
      </p>
    );
  return (
    <div className="listening-controls">
      <button className="button secondary" type="button" onClick={() => speak(text)}>
        <Icon name="sound" size={22} />
        Nghe lại
      </button>
      <p className="field-hint">Có thể nghe lại hoặc nghe chậm, không tính là có hỗ trợ.</p>
    </div>
  );
}
