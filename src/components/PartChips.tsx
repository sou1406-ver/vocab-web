import Link from "next/link";

export interface DisplayPart {
  text: string;
  role: "prefix" | "suffix" | "root" | "stem" | "word";
  meaning?: string;
  /** Page about this part (root or affix); the chip becomes a link when set. */
  href?: string;
}
const labels = { prefix: "Tiền tố", suffix: "Hậu tố", root: "Gốc", stem: "Thân từ", word: "Thành tố" };

export function PartChips({ parts, label }: { parts: DisplayPart[]; label: string }) {
  return (
    <ul className="part-chips" aria-label={`Các mảnh của ${label}`}>
      {parts.map((part, index) => (
        <li className={`part-chip part-chip--${part.role}`} key={`${part.text}:${index}`}>
          {part.href ? (
            <Link className="part-chip-link" href={part.href}>
              <ChipBody part={part} />
            </Link>
          ) : (
            <ChipBody part={part} />
          )}
        </li>
      ))}
    </ul>
  );
}

function ChipBody({ part }: { part: DisplayPart }) {
  return (
    <>
      <small className="part-role">{labels[part.role]}</small>
      <b lang="en">{part.text}</b>
      {part.meaning && <span className="part-meaning">{part.meaning}</span>}
    </>
  );
}
