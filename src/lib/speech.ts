/** Đọc từ bằng giọng tiếng Anh của trình duyệt (ưu tiên giọng tự nhiên nếu máy có) */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.92;
  const voices = speechSynthesis.getVoices().filter((v) => /^en[-_]US/i.test(v.lang));
  const voice = voices.find((v) => /natural|online|google/i.test(v.name)) ?? voices[0];
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

// nạp sẵn danh sách giọng (Chrome trả về rỗng ở lần gọi đầu)
if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.getVoices();
