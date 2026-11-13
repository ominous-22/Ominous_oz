export type PassId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Gloss = {
  term: string;
  gloss: string;
  source: "dump" | "operator";
};

export type MapBox = {
  title: string;
  caption: string;
};

export type IdeaSlice = {
  label: string;
  excerpt: string;
};

export type Pass0 = {
  questions: string[];
  cleanedBeforeDump: boolean;
  multipleIdeas: boolean;
  notes: string;
  ideas: IdeaSlice[];
};

export type Pass1 = {
  invariant: string;
  instance: string;
  assumptions: string[];
  weakestJoint: string;
  l1: string;
  l2: string;
};

export type Pass2 = {
  lostAt: string;
  firstQuestion: string;
  assumedItIs: string;
  actuallyIsNot: string;
  notes: string;
};

export type Pass3 = {
  tier1: MapBox[];
  tier2: MapBox[];
  tier3: MapBox[];
  prose: string;
};

export type Pass4 = {
  l1: string;
  l2: string;
  l3: {
    components: string;
    dataFlow: string;
    constraints: string;
    loadBearing: string[];
    incidental: string[];
  };
  unknowns: string[];
};

export type Pass5 = {
  script: string;
  estimatedSeconds: number;
  willCompress: boolean;
  sendBackTo: string | null;
};

export type Pass6 = {
  move: string;
  tell: string;
  repeatCount: number;
  priorNote: string;
  tryNext: string;
};

export type PassPayload = {
  0?: Pass0;
  1?: Pass1;
  2?: Pass2;
  3?: Pass3;
  4?: Pass4;
  5?: Pass5;
  6?: Pass6;
};

/**
 * Survey — the drift check run after a seal. Compares the Pass 4 blueprint to a
 * repo digest. Not a pass: re-running a pass wipes later passes, and surveys
 * must outlive that, so they live in their own append-only list on the run.
 */
export type SurveyStatus = "built" | "partial" | "missing" | "contradicted" | "unverified";

export type SurveyItem = {
  /** A Pass 4 load-bearing line, verbatim. */
  claim: string;
  status: SurveyStatus;
  /** Repo paths, each one listed in the digest the survey was run against. */
  evidence: string[];
  note: string;
};

export type SurveyUnknown = {
  /** A Pass 4 UNKNOWN, verbatim. */
  unknown: string;
  /** What the code decided, or null if still open. Only set with evidence. */
  resolvedAs: string | null;
  evidence: string[];
};

export type SurveyUnmappedKind = "scope creep" | "incidental hardened" | "missing from map";

export type SurveyUnmapped = {
  /** Something the code has that the blueprint never mentions. */
  thing: string;
  kind: SurveyUnmappedKind;
  evidence: string[];
};

export type Survey = {
  id: string;
  at: string;
  /** From the digest header, never from the model. */
  commit: string;
  loadBearing: SurveyItem[];
  unknowns: SurveyUnknown[];
  unmapped: SurveyUnmapped[];
  /** A finding about the operator, not a verdict on the code. */
  finding: string;
};

export type Run = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  sealed: boolean;
  dump: string;
  focus?: string;
  ledger: Gloss[];
  currentPass: PassId;
  viewingPass: PassId;
  passes: PassPayload;
  replies: Partial<Record<PassId, string>>;
  /** Drift checks against the code, oldest first. Survives pass re-runs. */
  surveys?: Survey[];
};

export type OperatorRow = {
  runId: string;
  runTitle: string;
  date: string;
  move: string;
  tell: string;
  repeatCount: number;
  tryNext: string;
};

export type CartographerRequest = {
  pass: PassId;
  dump: string;
  ledger: Gloss[];
  passes: PassPayload;
  reply?: string;
  focus?: string;
  priorOperatorMoves?: string[];
};

export type CartographerSuccess = {
  ok: true;
  pass: PassId;
  title?: string;
  ledger?: Gloss[];
  payload: Pass0 | Pass1 | Pass2 | Pass3 | Pass4 | Pass5 | Pass6;
};

export type CartographerFailure = {
  ok: false;
  error: string;
};

export type CartographerResult = CartographerSuccess | CartographerFailure;
