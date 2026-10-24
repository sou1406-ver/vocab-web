# ETS question data

Put optional question sets in this directory as `*.json` files. Each file must
contain a JSON array of questions with this shape:

```json
[
  {
    "id": "ets-001",
    "source": "ETS practice set",
    "question": "The company will ___ the new policy next month.",
    "options": {
      "A": "implement",
      "B": "implementation",
      "C": "implemented",
      "D": "implementing"
    },
    "answer": "A",
    "type": "word_form",
    "wordIds": ["implement-1"]
  }
]
```

`type` must be `vocab` or `word_form`; `answer` is one of `A`, `B`, `C`, or
`D`. `wordIds` refers to stable headword IDs from the 600-word catalog. Running
`npm run data` checks those IDs and writes the combined question array to
`src/data/ets.json`. The app does not display these questions yet.
