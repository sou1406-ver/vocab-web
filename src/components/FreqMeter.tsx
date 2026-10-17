import { freqLevel } from "@/lib/data";

/** Three bar frequency meter shared by book vocabulary and related expressions. */
export function FreqMeter({ z }: { z: number }) {
  const { level, label } = freqLevel(z);
  return (
    <span className={`freq freq-${level}`} role="img" title={`${label} (Zipf ${z || "—"})`} aria-label={label}>
      <i />
      <i />
      <i />
    </span>
  );
}
