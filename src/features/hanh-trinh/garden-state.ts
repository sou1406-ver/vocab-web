import { dayKey } from "../../domain/learning";
import type { AnswerEvent } from "../../domain/types";

export const healthLabels = {
  healthy: "Khỏe",
  due: "Đến giờ tưới",
  dry: "Đang khát",
  wilted: "Héo nặng",
  recovering: "Còn khát nhẹ",
} as const;

export type PlantHealth = keyof typeof healthLabels;

export function plantHealth(
  dueAt: number | undefined,
  lastCare: Pick<AnswerEvent, "at" | "correct"> | undefined,
  at: number,
  timezone?: string,
): PlantHealth {
  const today = dayKey(at, timezone);
  if (dueAt !== undefined && dueAt <= at) {
    const dueDay = dayKey(dueAt, timezone);
    const daysLate = (Date.parse(today) - Date.parse(dueDay)) / 86_400_000;
    return daysLate >= 3 ? "wilted" : daysLate >= 1 ? "dry" : "due";
  }
  return lastCare && !lastCare.correct && dayKey(lastCare.at, timezone) === today ? "recovering" : "healthy";
}

export const stageLabels = {
  mam: "Mầm",
  non: "Cây non",
  "truong-thanh": "Trưởng thành",
  "no-hoa": "Nở hoa",
} as const;

export type PlantStage = keyof typeof stageLabels;

export function plantStage(skills: readonly { recognition: number; recall: number }[]): PlantStage {
  if (skills.length === 0) return "mam";
  if (skills.every(({ recognition, recall }) => recognition >= 5 && recall >= 5)) return "no-hoa";
  if (skills.every(({ recognition, recall }) => recognition >= 3 && recall >= 3)) return "truong-thanh";
  if (skills.every(({ recognition, recall }) => Math.max(recognition, recall) >= 3)) return "non";
  return "mam";
}
