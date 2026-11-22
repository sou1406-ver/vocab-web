import sheet10 from "./web/10.webp";
import sheet20 from "./web/20.webp";
import sheet30 from "./web/30.webp";
import sheet35 from "./web/35.webp";
import sheet45 from "./web/45.webp";
import sheet55 from "./web/55.webp";
import type { PlantStage } from "../garden-state";

const columns = 5;
const sheets = [
  { image: sheet10, rows: 2 },
  { image: sheet20, rows: 2 },
  { image: sheet30, rows: 2 },
  { image: sheet35, rows: 1 },
  { image: sheet45, rows: 2 },
  { image: sheet55, rows: 2 },
];

// Each sheet is read left to right, then top to bottom. Append new sheets to preserve plant order.
// The browser fetches each background only when a rendered plant uses it.
const plantSprites = sheets.flatMap(({ image, rows }) =>
  Array.from({ length: rows * columns }, (_, index) => ({
    backgroundImage: `url(${image.src})`,
    aspectRatio: `${image.width / columns} / ${image.height / rows}`,
    backgroundSize: `${columns * 100}% ${rows * 100}%`,
    backgroundPosition: `${((index % columns) * 100) / (columns - 1)}% ${rows > 1 ? (Math.floor(index / columns) * 100) / (rows - 1) : 0}%`,
  })),
);

// Stage variants use the same position as the mature sprite and can be added one at a time.
const stages: Partial<Record<PlantStage, Partial<Record<number, (typeof plantSprites)[number]>>>> = {};

export function plantSprite(index: number, stage?: PlantStage) {
  const position = index % plantSprites.length;
  return (stage && stages[stage]?.[position]) || plantSprites[position];
}
