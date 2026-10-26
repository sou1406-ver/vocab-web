import type { ComponentType } from "react";
import type { Question } from "@/lib/quiz";
import { TypedAnswerContext, useTypedAnswer, type QuestionProps } from "./useTypedAnswer";
import { ListenChoice } from "./questions/ListenChoice";
import { Match } from "./questions/Match";
import { SynonymSentence } from "./questions/SynonymSentence";
import { FormFix } from "./questions/FormFix";
import { Choice } from "./questions/Choice";
import { Cloze } from "./questions/Cloze";
import { Hint } from "./questions/Hint";
import { Formation } from "./questions/Formation";
import { Recall } from "./questions/Recall";
import { Listening } from "./questions/Listening";
import { FormationChoice } from "./questions/FormationChoice";
import { Synonym } from "./questions/Synonym";
import { Meaning } from "./questions/Meaning";
import { Build } from "./questions/Build";

type Component = ComponentType<QuestionProps>;
const VIEWS: Record<Question["kind"], Component> = {
  "adaptive-listen-choice": ListenChoice,
  "adaptive-match": Match,
  "adaptive-synonym-sentence": SynonymSentence,
  "adaptive-form-fix": FormFix,
  "adaptive-choice": Choice,
  "adaptive-cloze": Cloze,
  "adaptive-hint": Hint,
  "adaptive-formation": Formation,
  "adaptive-recall": Recall,
  listening: Listening,
  recall: Recall,
  formation: FormationChoice,
  "adaptive-formation-choice": FormationChoice,
  synonym: Synonym,
  meaning: Meaning,
  build: Build,
};
export function QuestionView({ q, onAnswer, onNext }: QuestionProps) {
  const state = useTypedAnswer(q, onAnswer);
  const View = VIEWS[q.kind];
  return (
    <TypedAnswerContext.Provider value={state}>
      <View q={q} onAnswer={onAnswer} onNext={onNext} />
    </TypedAnswerContext.Provider>
  );
}
