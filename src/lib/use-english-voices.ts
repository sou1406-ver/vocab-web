"use client";
import { useEffect, useState } from "react";
import { getEnglishVoices, subscribeEnglishVoices } from "./speech";

export function useEnglishVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const refresh = () => setVoices(getEnglishVoices());
    const stop = subscribeEnglishVoices(refresh);
    refresh();
    return stop;
  }, []);
  return voices;
}
