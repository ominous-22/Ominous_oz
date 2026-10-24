export type FileId = "grain" | "charge" | "witness" | "residue";

export const FILES: { id: FileId; name: string; note: string; shadow: string }[] = [
  {
    id: "grain",
    name: "Shard",
    note: "The sentence you refuse to smooth.",
    shadow:
      "You sand the shard off before it can embarrass the map. That is why it feels finished, and slightly fake.",
  },
  {
    id: "charge",
    name: "Heat",
    note: "Conviction that showed up before the proof.",
    shadow: "You will not move on heat. The map is accurate, and late.",
  },
  {
    id: "witness",
    name: "Witness",
    note: "Someone who was not already in the room.",
    shadow:
      "You never hand it to someone who does not already know. Inside your head, it cannot be wrong.",
  },
  {
    id: "residue",
    name: "Scar",
    note: "What is left after the pitch dies.",
    shadow:
      "You throw the failure away. A map with no scar cannot tell you what you learned.",
  },
];

const FILE_INDEX: Record<FileId, number> = {
  grain: 0,
  charge: 1,
  witness: 2,
  residue: 3,
};

export type Weights = Record<FileId, number>;

export type Choice = {
  id: string;
  label: string;
  weights: Weights;
  line: string;
};

export type Question = {
  id: string;
  prompt: string;
  choices: Choice[];
};

const z = (partial: Partial<Weights>): Weights => ({
  grain: partial.grain ?? 0,
  charge: partial.charge ?? 0,
  witness: partial.witness ?? 0,
  residue: partial.residue ?? 0,
});

export const QUESTIONS: Question[] = [
  {
    id: "keep",
    prompt: "An idea arrives. What do you actually keep?",
    choices: [
      {
        id: "keep-sentence",
        label: "A sentence I can’t defend.",
        weights: z({ grain: 3, residue: 1 }),
        line: "You kept a sentence you cannot defend.",
      },
      {
        id: "keep-true",
        label: "The feeling that it is already true.",
        weights: z({ charge: 3, witness: 1 }),
        line: "You kept the feeling that it was already true.",
      },
      {
        id: "keep-person",
        label: "The person I want to tell.",
        weights: z({ witness: 3, charge: 1 }),
        line: "You kept a person, not a plan.",
      },
      {
        id: "keep-survive",
        label: "The piece that would survive a bad pitch.",
        weights: z({ residue: 3, grain: 1 }),
        line: "You kept the piece that would survive a bad pitch.",
      },
    ],
  },
  {
    id: "trust",
    prompt: "You trust it when…",
    choices: [
      {
        id: "trust-dark",
        label: "It still bothers you with the lights off.",
        weights: z({ charge: 3, grain: 1 }),
        line: "You trust what still bothers you in the dark.",
      },
      {
        id: "trust-ugly",
        label: "You can say it in one ugly line.",
        weights: z({ grain: 3, witness: 1 }),
        line: "You trust it once it fits in one ugly line.",
      },
      {
        id: "trust-wrong",
        label: "A stranger repeats it wrong, and the wrong part is useful.",
        weights: z({ witness: 3, residue: 1 }),
        line: "You trust the useful mistake in what they repeated.",
      },
      {
        id: "trust-sharper",
        label: "The clean version dies and something sharper is left.",
        weights: z({ residue: 3, charge: 1 }),
        line: "You trust the sharper thing that survived the clean version.",
      },
    ],
  },
  {
    id: "ten",
    prompt: "You have ten minutes. You…",
    choices: [
      {
        id: "ten-line",
        label: "Write the one line and stop.",
        weights: z({ grain: 3, charge: 1 }),
        line: "Given ten minutes, you write one line and stop.",
      },
      {
        id: "ten-face",
        label: "Say it to one person and watch their face.",
        weights: z({ witness: 3, grain: 1 }),
        line: "Given ten minutes, you watch one face.",
      },
      {
        id: "ten-certain",
        label: "Push until it sounds certain.",
        weights: z({ charge: 3, witness: 1 }),
        line: "Given ten minutes, you push until it sounds certain.",
      },
      {
        id: "ten-cross",
        label: "Cross out the pitch. Keep the leftover.",
        weights: z({ residue: 3, grain: 1 }),
        line: "Given ten minutes, you cross out the pitch.",
      },
    ],
  },
  {
    id: "ready",
    prompt: "What do you call “not ready”?",
    choices: [
      {
        id: "ready-shy",
        label: "The sentence is still embarrassing.",
        weights: z({ grain: 3, residue: 1 }),
        line: "You wait while the sentence is still embarrassing.",
      },
      {
        id: "ready-heat",
        label: "I don’t believe it hard enough yet.",
        weights: z({ charge: 3, grain: 1 }),
        line: "You wait until the belief is hot enough.",
      },
      {
        id: "ready-stranger",
        label: "Nobody outside the room has misunderstood it yet.",
        weights: z({ witness: 3, charge: 1 }),
        line: "You wait until a stranger misunderstands it.",
      },
      {
        id: "ready-fail",
        label: "It hasn’t failed once.",
        weights: z({ residue: 3, witness: 1 }),
        line: "You wait until it has failed once.",
      },
    ],
  },
  {
    id: "proof",
    prompt: "If it worked, the proof would be…",
    choices: [
      {
        id: "proof-short",
        label: "I can say it shorter than yesterday.",
        weights: z({ grain: 3, witness: 1 }),
        line: "Your proof is that it got shorter.",
      },
      {
        id: "proof-defend",
        label: "I will defend it before I can explain it.",
        weights: z({ charge: 3, grain: 1 }),
        line: "Your proof is that you defend it before you can explain it.",
      },
      {
        id: "proof-stranger",
        label: "A stranger can use it without me in the room.",
        weights: z({ witness: 3, residue: 1 }),
        line: "Your proof is a stranger using it without you.",
      },
      {
        id: "proof-hide",
        label: "The part I wanted to hide is the part that holds.",
        weights: z({ residue: 3, charge: 1 }),
        line: "Your proof is the part you wanted to hide.",
      },
    ],
  },
  {
    id: "waste",
    prompt: "Which of these feels like a waste of time?",
    choices: [
      {
        id: "waste-messy",
        label: "Starting from a messy sentence.",
        weights: z({ grain: -2, charge: 1 }),
        line: "You called the messy sentence a waste of time.",
      },
      {
        id: "waste-heat",
        label: "Getting hot before you have proof.",
        weights: z({ charge: -2, grain: 1 }),
        line: "You called early heat a waste of time.",
      },
      {
        id: "waste-tell",
        label: "Telling someone who doesn’t already know.",
        weights: z({ witness: -2, residue: 1 }),
        line: "You called telling a stranger a waste of time.",
      },
      {
        id: "waste-fail",
        label: "Keeping the version that failed.",
        weights: z({ residue: -2, witness: 1 }),
        line: "You called keeping the failure a waste of time.",
      },
    ],
  },
];

const PAIRS: Record<string, string> = {
  "grain|charge":
    "You keep the sentence you cannot defend, then you heat it until it sounds like a fact. The map is the burn, not the plan.",
  "grain|witness":
    "You start from a shard and look for a face to hand it to. If they do not flinch, you decide it was nothing.",
  "grain|residue":
    "You file the broken phrase and whatever survived the pitch. The finished version is what you throw away.",
  "charge|grain":
    "Conviction shows up first. Then you hunt for one ugly sentence that can carry it without embarrassing you.",
  "charge|witness":
    "You believe it in the room. The map is the order in which their face changed.",
  "charge|residue":
    "You commit. It fails where someone can see it. You keep the part that still hurts. That part is the file.",
  "witness|grain":
    "You do not know what you think until you say a small wrong version to someone who was not there.",
  "witness|charge":
    "You borrow heat from being watched. Alone, the idea cools into a maybe.",
  "witness|residue":
    "You explain it. They miss it. You store the misunderstanding. That is the map you actually use.",
  "residue|grain":
    "After the clean version dies, you go back to the phrase you were ashamed of. You trust what editing removed.",
  "residue|charge":
    "Failure does not cool you. It concentrates you. The leftover is hotter than the pitch.",
  "residue|witness":
    "You learn the idea from the wrong thing people repeat back. You file their mistake, not your speech.",
};

export type MindNode = {
  id: FileId;
  name: string;
  score: number;
  line: string;
  note: string;
  shadow: boolean;
};

export type MindMap = {
  title: string;
  center: string;
  nodes: MindNode[];
  scores: Weights;
};

export const RUBRIC =
  "score(f) = Σ  3 if you filed it first,  1 if you filed it second,  −2 if you called it a waste of time";

export function emptyScores(): Weights {
  return { grain: 0, charge: 0, witness: 0, residue: 0 };
}

export function choiceById(id: string): Choice | undefined {
  for (const question of QUESTIONS) {
    const found = question.choices.find((choice) => choice.id === id);
    if (found) return found;
  }
  return undefined;
}

export function scoreChoices(choiceIds: string[]): Weights {
  const scores = emptyScores();
  for (const id of choiceIds) {
    const choice = choiceById(id);
    if (!choice) continue;
    for (const file of FILES) {
      scores[file.id] += choice.weights[file.id];
    }
  }
  return scores;
}

function lineFor(file: FileId, choiceIds: string[]): string {
  const choices = choiceIds
    .map((id) => choiceById(id))
    .filter((choice): choice is Choice => Boolean(choice));
  const primary = choices.find((choice) => choice.weights[file] >= 3);
  if (primary) return primary.line;
  const secondary = choices.find((choice) => choice.weights[file] > 0);
  if (secondary) return secondary.line;
  const skipped = choices.find((choice) => choice.weights[file] < 0);
  if (skipped) return skipped.line;
  return "Nothing you picked touched this file.";
}

export function toMindMap(choiceIds: string[]): MindMap {
  const scores = scoreChoices(choiceIds);
  const ranked = [...FILES].sort((a, b) => {
    const delta = scores[b.id] - scores[a.id];
    if (delta !== 0) return delta;
    return FILE_INDEX[a.id] - FILE_INDEX[b.id];
  });
  const top = ranked[0]!;
  const second = ranked[1]!;
  const lowest = ranked[ranked.length - 1]!;

  const nodes: MindNode[] = ranked.map((file) => {
    const shadow = file.id === lowest.id;
    return {
      id: file.id,
      name: file.name,
      score: scores[file.id],
      line: lineFor(file.id, choiceIds),
      note: shadow ? file.shadow : file.note,
      shadow,
    };
  });

  return {
    title: `${top.name} · ${second.name}`,
    center: PAIRS[`${top.id}|${second.id}`] ?? `${top.note} ${second.note}`,
    nodes,
    scores,
  };
}

export function mapToText(map: MindMap): string {
  const branches = map.nodes
    .map((node) => {
      const tag = node.shadow ? "Left on the floor" : "Filed";
      return `${node.name} (${node.score}) — ${tag}\n${node.line}\n${node.note}`;
    })
    .join("\n\n");
  const table = FILES.map((file) => `${file.name}\t${map.scores[file.id]}`).join(
    "\n",
  );
  return `${map.title}\n\n${map.center}\n\n${branches}\n\n${RUBRIC}\n${table}`;
}
