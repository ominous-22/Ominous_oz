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
