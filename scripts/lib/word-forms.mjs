export const normalizeForm = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");
const irregular = {
  be: ["am", "is", "are", "was", "were", "been", "being"],
  build: ["built"],
  forget: ["forgot", "forgotten"],
  get: ["got", "gotten"],
  make: ["made"],
  take: ["took", "taken"],
  give: ["gave", "given"],
  write: ["wrote", "written"],
  choose: ["chose", "chosen"],
  begin: ["began", "begun"],
  buy: ["bought"],
  bring: ["brought"],
  seek: ["sought"],
  find: ["found"],
  pay: ["paid"],
  say: ["said"],
  sell: ["sold"],
  send: ["sent"],
  meet: ["met"],
  keep: ["kept"],
  leave: ["left"],
  lead: ["led"],
  rise: ["rose", "risen"],
  fall: ["fell", "fallen"],
  run: ["ran"],
  know: ["knew", "known"],
  grow: ["grew", "grown"],
  do: ["does", "did", "done"],
  have: ["has", "had"],
  hold: ["held"],
  set: ["set"],
  put: ["put"],
  cut: ["cut"],
  cost: ["cost"],
  read: ["read"],
  think: ["thought"],
  teach: ["taught"],
  catch: ["caught"],
  feel: ["felt"],
  lose: ["lost"],
  win: ["won"],
  mistake: ["mistook", "mistaken"],
};
const doubleFinal = new Set([
  "admit",
  "submit",
  "occur",
  "recur",
  "refer",
  "prefer",
  "confer",
  "transfer",
  "permit",
  "commit",
  "omit",
  "regret",
  "control",
  "repel",
  "compel",
  "begin",
  "equip",
]);
// Non-productive spelling changes cannot be inferred from a common string prefix.
// These lexical families supplement classification only, never answer linking.
const relatedFamilies = [
  ["oblige", "obligate", "obligation", "obligatory"],
  ["character", "characteristic", "characterize"],
  ["imply", "implicit", "implicate", "implication"],
  ["attend", "attention", "attendance"],
  ["register", "registration", "registrar"],
  ["technical", "technique", "technicality"],
  ["hesitant", "hesitate", "hesitation"],
  ["produce", "product", "production", "productive"],
  ["expand", "expansion", "expanse"],
  ["explore", "exploratory", "explorer", "exploration"],
  ["aggressive", "aggression", "aggressor"],
  ["scrutinize", "scrutiny", "scrutable"],
  ["responsible", "responsibility", "response"],
  ["expect", "expectancy", "expectation"],
  ["intent", "intention", "intend"],
  ["continue", "continuity", "continuation"],
  ["experience", "experiential"],
  ["comprehend", "comprehension", "comprehensive"],
  ["favor", "favoritism", "favorable"],
  ["evident", "evidence", "evidential"],
  ["irritate", "irritable", "irritation", "irritability"],
  ["regular", "regulate"],
  ["permit", "permissive", "permission", "permissible"],
  ["potential", "potency"],
  ["voluntary", "volunteer", "volunteerism"],
];

function inflections(base, pos) {
  const forms = new Set([base]);
  const noun = pos === "n" || pos.includes("noun");
  const verb = pos === "v" || pos.includes("verb");
  const plural = /[^aeiou]y$/.test(base)
    ? base.slice(0, -1) + "ies"
    : /(?:s|x|z|ch|sh)$/.test(base)
      ? base + "es"
      : base + "s";
  if ((noun || verb) && base !== "be" && base !== "have" && base !== "do") forms.add(plural);
  if (verb) {
    for (const form of irregular[base] ?? []) forms.add(form);
    if (!irregular[base]) {
      if (/[^aeiou]y$/.test(base)) forms.add(base.slice(0, -1) + "ied");
      else forms.add(base + (base.endsWith("e") ? "d" : "ed"));
    }
    const doubled = doubleFinal.has(base) || /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(base);
    if (doubled) {
      if (!irregular[base]) forms.add(base + base.at(-1) + "ed");
      forms.add(base + base.at(-1) + "ing");
    }
    forms.add(
      base.endsWith("ie")
        ? base.slice(0, -2) + "ying"
        : /[^eoy]e$/.test(base)
          ? base.slice(0, -1) + "ing"
          : base + "ing",
    );
  }
  return forms;
}

/** Forward inflections of actual lemmas/family entries; no fuzzy-prefix choice of a wordId. */
export function familyForms(word) {
  const forms = new Set();
  for (const entry of [{ text: word.text, pos: word.pos }, ...word.family]) {
    const text = normalizeForm(entry.text);
    const pos = normalizeForm(entry.pos).replace(/\./g, "");
    for (const form of inflections(text, pos)) forms.add(form);
    if (pos === "adj" && text.startsWith("un") && text.length > 4) forms.add(text.slice(2));
    if (pos === "v" && text.includes(" ")) {
      const [head, ...tail] = text.split(" ");
      for (const form of inflections(head, pos)) {
        forms.add(`${form} ${tail.join(" ")}`);
        // A phrasal verb's attested head is also a member of its lexical family.
        forms.add(form);
      }
      forms.add(text.replaceAll(" ", ""));
    }
  }
  return forms;
}

// Classification may recognize productive derivations; answer-to-word linking stays
// on the narrower lemma/inflection set above, so a speculative suffix cannot pick an ID.
export function classificationForms(word) {
  const forms = familyForms(word);
  let entries = [{ text: word.text, pos: word.pos }, ...word.family];
  for (const group of relatedFamilies) {
    if (group.some((value) => forms.has(value))) {
      for (const value of group) {
        forms.add(value);
        entries.push({ text: value, pos: "v" }, { text: value, pos: "adj" }, { text: value, pos: "n" });
      }
    }
  }
  const visited = new Set();
  for (let round = 0; round < 3; round++) {
    const next = [];
    for (const entry of entries) {
      const base = normalizeForm(entry.text);
      const pos = normalizeForm(entry.pos).replace(/\./g, "");
      const key = `${base}:${pos}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const add = (text, part) => {
        forms.add(text);
        next.push({ text, pos: part });
      };
      // Nouns/adjectives can be used as verbs in the authored distractors.
      for (const form of inflections(base, "v")) {
        forms.add(form);
        if (form.endsWith("ed") || form.endsWith("ing")) next.push({ text: form, pos: "adj" });
      }
      if (base.includes(" ")) continue;
      if (pos === "v") {
        add(`will ${base}`, "phr");
        add(base.replace(/e$/, "") + "er", "n");
        add(base + "or", "n");
        add(base + "ive", "adj");
        add(base + "ible", "adj");
        add(base + "ress", "n");
        if (base.endsWith("t")) add(base + "ion", "n");
        add(base + "ation", "n");
        add(base + "ative", "adj");
        add(base.replace(/y$/, "i").replace(/e$/, "") + "able", "adj");
        if (base.endsWith("ate")) {
          add(base.slice(0, -3) + "ation", "n");
          add(base.slice(0, -3) + "ator", "n");
          add(base.slice(0, -3) + "ative", "adj");
        }
        if (base.endsWith("ize")) add(base.slice(0, -1) + "ation", "n");
      }
      if (pos === "adj") {
        add(
          base.endsWith("y") ? base.slice(0, -1) + "ily" : base.endsWith("le") ? base.slice(0, -1) + "y" : base + "ly",
          "adv",
        );
        if (base.endsWith("ic")) add(base + "ally", "adv");
        add(base.endsWith("y") ? base.slice(0, -1) + "iness" : base + "ness", "n");
        if (base.endsWith("able") || base.endsWith("ible")) add(base.slice(0, -2) + "ility", "n");
        if (base.endsWith("al")) {
          add(base + "ity", "n");
          add(base + "ism", "n");
          add(base + "ize", "v");
          add(base + "ist", "n");
        }
        if (base.endsWith("ant") || base.endsWith("ent")) {
          add(base.slice(0, -1) + "ce", "n");
          add(base.slice(0, -1) + "cy", "n");
        }
        if (base.endsWith("ate")) add(base.slice(0, -3) + "ation", "n");
        if (base.endsWith("y")) {
          forms.add(base.slice(0, -1) + "ier");
          forms.add(base.slice(0, -1) + "iest");
        } else {
          forms.add(base + (base.endsWith("e") ? "r" : "er"));
          forms.add(base + (base.endsWith("e") ? "st" : "est"));
        }
      }
      if (pos === "n" && base.endsWith("y")) add(base.slice(0, -1) + "ist", "n");
      if (pos === "n") {
        add(base + "less", "adj");
        add(base + "or", "n");
        add(base + "ive", "adj");
        if (base.endsWith("t")) add(base + "ion", "n");
        if (base.endsWith("le")) add(base.slice(0, -1) + "y", "adj");
        if (base.endsWith("ic")) add(base + "ian", "n");
        if (base.endsWith("sion")) add(base.slice(0, -4) + "sive", "adj");
        if (base.endsWith("ation")) add(base + "al", "adj");
      }
    }
    entries = next;
  }
  return forms;
}
