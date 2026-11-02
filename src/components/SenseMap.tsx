import { Lightbulb } from "lucide-react";
import type { Particle } from "../domain/roots";

/** A word explained by one core image, then each everyday use traced back to it. */
export function SenseMap({ item }: { item: Particle }) {
  return (
    <section className="panel particle" id={item.word} aria-labelledby={`particle-${item.word}`}>
      <h2 id={`particle-${item.word}`} lang="en">
        {item.word}
      </h2>
      <p className="particle-core">{item.core}</p>
      <div className="root-core-image">
        <Lightbulb aria-hidden="true" size={28} />
        <p>{item.image}</p>
      </div>
      {item.note && <p className="quiet-note">{item.note}</p>}
      <ul className="particle-senses">
        {item.senses.map((sense, index) => (
          <li key={`${sense.example}:${index}`}>
            <b lang="en">{sense.example}</b>
            <span>{sense.meaning}</span>
            <small className="muted">{sense.logic}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SenseJump({ items, label }: { items: Particle[]; label: string }) {
  return (
    <nav className="particle-jump" aria-label={label}>
      {items.map((item) => (
        <a className="particle-chip" href={`#${item.word}`} lang="en" key={item.word}>
          {item.word}
        </a>
      ))}
    </nav>
  );
}
