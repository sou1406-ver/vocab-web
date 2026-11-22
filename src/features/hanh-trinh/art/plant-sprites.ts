import type { StaticImageData } from "next/image";
import sheet10 from "./web/10.webp";
import sheet20 from "./web/20.webp";
import sheet30 from "./web/30.webp";
import sheet35 from "./web/35.webp";
import sheet45 from "./web/45.webp";
import sheet55 from "./web/55.webp";
import sprout from "./web/sprout.webp";
import type { PlantStage } from "../garden-state";

const columns = 5;
const sheets = [
  { id: 10, image: sheet10, rows: 2 },
  { id: 20, image: sheet20, rows: 2 },
  { id: 30, image: sheet30, rows: 2 },
  { id: 35, image: sheet35, rows: 1 },
  { id: 45, image: sheet45, rows: 2 },
  { id: 55, image: sheet55, rows: 2 },
] as const;

// Each sheet is read left to right, then top to bottom. Append new sheets to preserve plant order.
// The browser fetches each background only when a rendered plant uses it.
const plantCells = sheets.flatMap((sheet) =>
  Array.from({ length: sheet.rows * columns }, (_, cell) => ({ ...sheet, cell })),
);

// Register generated files such as 10-mam.webp under stages.mam[10].
// A stage sheet shares the original atlas dimensions, rows, and cell order.
const stages: Partial<Record<PlantStage, Partial<Record<(typeof sheets)[number]["id"], StaticImageData>>>> = {};

export function plantSprite(index: number, stage?: PlantStage) {
  const { id, image, rows, cell } = plantCells[index % plantCells.length];
  const variant = stage ? stages[stage]?.[id] : undefined;
  const aspectRatio = `${image.width / columns} / ${image.height / rows}`;
  if (stage === "mam" && !variant) {
    return {
      aspectRatio,
      backgroundImage: `url(${sprout.src})`,
      backgroundSize: "100% auto",
      backgroundPosition: "center bottom",
    };
  }
  return {
    aspectRatio,
    backgroundImage: `url(${(variant ?? image).src})`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${((cell % columns) * 100) / (columns - 1)}% ${rows > 1 ? (Math.floor(cell / columns) * 100) / (rows - 1) : 0}%`,
  };
}
