import Link from "next/link";
import type { Metadata } from "next";
import { coreWords, particles, prefixFamilies, roots } from "../../data/roots";
import { affixSlug } from "../../data/affix-slug";
import { RootsExplorer } from "../../components/RootsExplorer";
import { foldText, type RootsCard } from "../../data/roots-search";
import type { Particle, RootWord } from "../../domain/roots";

const wordText = (words: RootWord[]) =>
  words.flatMap((word) => [word.text, word.meaning, ...word.family.flatMap((form) => [form.text, form.meaning])]);
const senseText = (item: Particle) =>
  [item.word, item.core, ...item.senses.flatMap((sense) => [sense.example, sense.meaning])].join(" ");

const cards: RootsCard[] = [
  ...roots.map((root) => ({
    kind: "root" as const,
    key: root.id,
    title: root.forms.join(" / "),
    meaning: root.meaning,
    href: `/roots/${root.id}`,
    count: `${root.words.length} từ`,
    search: foldText([...root.forms, root.meaning, root.origin, ...wordText(root.words)].join(" ")),
  })),
  ...prefixFamilies.map((family) => ({
    kind: "prefix" as const,
    key: family.affix,
    title: family.affix,
    meaning: family.meaning,
    href: `/affixes/${affixSlug("prefix", family.affix)}`,
    count: `${family.words.length} từ`,
    search: foldText([family.affix, family.meaning, ...wordText(family.words)].join(" ")),
  })),
  ...particles.map((item) => ({
    kind: "particle" as const,
    key: item.word,
    title: item.word,
    meaning: item.core,
    href: `/particles#${item.word}`,
    count: `${item.senses.length} cách dùng`,
    search: foldText(senseText(item)),
  })),
  ...coreWords.map((item) => ({
    kind: "core" as const,
    key: item.word,
    title: item.word,
    meaning: item.core,
    href: `/core-words#${item.word}`,
    count: `${item.senses.length} cách dùng`,
    search: foldText(senseText(item)),
  })),
];

export const metadata: Metadata = { title: "Gốc từ", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <div className="page roots-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">HỌC SÂU · TIẾNG ANH</p>
          <h1 tabIndex={-1}>Gốc từ</h1>
          <p className="page-subtitle">{roots.length} gốc từ — nhìn những từ quen thuộc từ một góc khác.</p>
        </div>
      </div>
      <p className="roots-intro muted">
        Kho mở rộng để tham khảo, không tính vào tiến độ. Mỗi gốc có phần “Thử nhanh” để tự kiểm tra.
      </p>
      <Link className="text-link roots-affix-link" href="/affixes">
        Xem tiền tố & hậu tố →
      </Link>
      <RootsExplorer cards={cards} />
    </div>
  );
}
