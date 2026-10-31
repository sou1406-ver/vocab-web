export interface DisplayPart {
  text: string;
  role: "prefix" | "suffix" | "root" | "stem" | "word";
  meaning?: string;
}
const labels = { prefix: "Tiền tố", suffix: "Hậu tố", root: "Gốc", stem: "Thân từ", word: "Thành tố" };

export function PartChips({ parts, label }: { parts: DisplayPart[]; label: string }) {
  return (
    <ul className="part-chips" aria-label={`Các mảnh của ${label}`}>
      {parts.map((part, index) => (
        <li className={`part-chip part-chip--${part.role}`} key={`${part.text}:${index}`}>
          <small className="part-role">{labels[part.role]}</small>
          <b lang="en">{part.text}</b>
          {part.meaning && <span className="part-meaning">{part.meaning}</span>}
        </li>
      ))}
    </ul>
  );
}
