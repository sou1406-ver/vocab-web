import type { Particle, RootEntry } from "./roots";
import type { AnswerEvent, StudySession, Word } from "./types";

interface Sources {
  roots: readonly RootEntry[];
  coreWords: readonly Pick<Particle, "word" | "core">[];
  wordById: (id: string) => Pick<Word, "id" | "groupWordId" | "text"> | undefined;
  bookOfWord: (id: string) => { id: string } | undefined;
}

interface StudyRootFeedback {
  label?: string;
  parts?: string[];
  explanation: string;
  href: string;
}

const headword = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

function selectWordFeedback(
  word: NonNullable<ReturnType<Sources["wordById"]>>,
  seen: Set<string>,
  sources: Sources,
): StudyRootFeedback | undefined {
  const linkedId = word.groupWordId ?? word.id;
  const owner = sources.bookOfWord(word.id);
  if (owner && sources.bookOfWord(linkedId)?.id === owner.id) {
    let hasRoot = false;
    for (const root of sources.roots) {
      const entry = root.words.find((item) => item.book?.wordId === linkedId);
      if (!entry) continue;
      hasRoot = true;
      const key = `root:${root.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      return {
        label: headword(entry.text) === headword(word.text) ? undefined : entry.text,
        parts: entry.parts.map((part) => part.text),
        explanation: entry.logic,
        href: `/roots/${root.id}`,
      };
    }
    if (hasRoot) return;
  }

  const text = headword(word.text);
  const core = sources.coreWords.find((entry) => headword(entry.word) === text);
  const key = `core:${text}`;
  if (!core || seen.has(key)) return;
  seen.add(key);
  return { explanation: core.core, href: `/core-words#${encodeURIComponent(core.word)}` };
}

export function selectStudyRootFeedback(
  session: Pick<StudySession, "id" | "index" | "phase"> & {
    questions: readonly Pick<StudySession["questions"][number], "wordId" | "kind">[];
  },
  events: readonly Pick<AnswerEvent, "id">[],
  sources: Sources,
): StudyRootFeedback | undefined {
  if (session.phase !== "feedback") return;
  const answered = new Set(events.map((event) => event.id));
  const seen = new Set<string>();
  for (let index = 0; index <= session.index; index++) {
    const question = session.questions[index];
    if (!question || question.kind === "match" || !answered.has(`${session.id}:${index}`)) continue;
    const word = sources.wordById(question.wordId);
    const feedback = word && selectWordFeedback(word, seen, sources);
    if (index === session.index) return feedback;
  }
}
