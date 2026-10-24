import type { OperatorRow, Run } from "./types";

const DUMP = `ok so the thing is I have like ten projects and they all look different from the outside. the press, city hall, the legislature, a car dealership, a shop, an AI vendor. each one is a tool that checks someone you're supposed to trust. and then shows you the evidence so you don't have to trust me either.

I keep naming the ten and never naming the one. there are like twenty proper nouns for a single conviction that fits in a sentence. when someone asks what I do I reach for an instance and then I have to explain the instance and I've already lost them.

the name I'm sitting with is Tessera. roman watchword token. sentry challenges you, you answer from the tessera. tessera hospitalis was a token broken in half between two parties so a bond could be verified later — chain of custody. also mosaic: small pieces assembled into a picture. risk is prior use in software and most people hear mosaic first.

rejected: Second Opinion (clinical, passive), Show the Work, Take Nobody's Word, Open Verdict (too plain).

products would be SPEC-1, Gatepost, SPW. modules that should never leave the repo: spec1_core, pdx-1i, gate weights.

three tiers: 1 the conviction — one name one sentence, always first, to anyone. 2 products only after a second question. 3 modules never leave the repo. I keep leading at tier 3 because that's where the work happened.

outlier: the farmers-market courier doesn't fit. nothing about it involves showing anyone the work.

the sentence matters more than the name. ship them together. the name never travels alone.`;

export const SEED_RUN: Run = {
  id: "ic-1",
  createdAt: "2026-08-27T12:00:00.000Z",
  updatedAt: "2026-08-27T12:00:00.000Z",
  title: "One conviction, built ten times",
  sealed: true,
  dump: DUMP,
  viewingPass: 6,
  currentPass: 6,
  ledger: [
    {
      term: "Tessera",
      gloss: "Roman watchword token used to verify a sentry",
      source: "dump",
    },
    {
      term: "tessera hospitalis",
      gloss: "Token split in half so a later bond can be proven",
      source: "dump",
    },
    {
      term: "SPEC-1",
      gloss: "Named product; domain never stated in the dump",
      source: "dump",
    },
    {
      term: "Gatepost",
      gloss: "Named product; domain never stated in the dump",
      source: "dump",
    },
    {
      term: "SPW",
      gloss: "Named product; domain never stated in the dump",
      source: "dump",
    },
    {
      term: "spec1_core",
      gloss: "Internal module; never spoken outside the repository",
      source: "dump",
    },
    {
      term: "pdx-1i",
      gloss: "Internal module; never spoken outside the repository",
      source: "dump",
    },
    {
      term: "gate weights",
      gloss: "Internal scoring parameters; never leave the repository",
      source: "dump",
    },
  ],
  passes: {
    0: {
      questions: [
        "What does SPEC-1 actually do, in twelve words?",
        "What does Gatepost actually do, in twelve words?",
        "What does SPW stand for, and do?",
      ],
      cleanedBeforeDump: false,
      multipleIdeas: false,
      notes: "Eight invented names in one dump. Three products arrived without a domain. That is the ledger’s whole job.",
      ideas: [
        {
          label: "One conviction, ten instances",
          excerpt:
            "Tools that check the people you're supposed to trust, built ten times at different unauditable experts.",
        },
      ],
    },
    1: {
      invariant:
        "Build tools that audit the experts a person is told to trust, and publish the evidence so they do not have to trust the toolmaker either.",
      instance:
        "Ten products, each pointed at a different unauditable expert — the press, city hall, the legislature, the dealership, the shop, the AI vendor — under a candidate name, Tessera.",
      assumptions: [
        "The ten projects are in fact the same conviction, not a cluster of related ones.",
        "A single public name can cover all of them without sounding like a holding company.",
        "Showing the work is load-bearing in every domain the operator has built for.",
        "The farmers-market courier is an outlier rather than evidence that the invariant is too narrow.",
      ],
      weakestJoint:
        "The farmers-market courier does not involve showing anyone the work. If it still belongs, the invariant is wrong. If it does not belong, the operator has been counting projects that are not the conviction.",
      l1: "Tools that check the people you are supposed to trust, and show the evidence so you do not have to trust the toolmaker either — for anyone who currently has to take an institution’s word.",
      l2: "Tessera (a Roman watchword token used to verify a sentry) is the candidate name for one conviction: tools that check unauditable experts and show the evidence so you need not trust the maker either. The work currently exists as about ten instances, each pointed at a different expert — the press, city hall, the legislature, a dealership, a shop, an AI vendor. Products such as SPEC-1 (named product; domain never stated), Gatepost (named product; domain never stated), and SPW (named product; domain never stated) are spoken only after a second question. Modules such as spec1_core, pdx-1i, and gate weights never leave the repository. What goes in is a domain where an expert cannot be audited; what comes out is a tool plus an evidence trail; the decision it changes is whether you have to take anyone’s word. It is hard to copy because the load-bearing piece is the discipline of showing work, not a particular dataset or brand. The habitual failure is leading with those modules, because that is where the labor sat.",
    },
    2: {
      lostAt:
        "Products such as SPEC-1 (named product; domain never stated), Gatepost (named product; domain never stated), and SPW (named product; domain never stated) are spoken only after a second question.",
      firstQuestion: "What do these products actually do?",
      assumedItIs:
        "A branding exercise for a suite of apps that still need a one-line pitch each.",
      actuallyIsNot:
        "A speaking discipline for a single conviction that has already been built ten times. The products are instances, not the point.",
      notes:
        "Glossing the three products as “domain never stated” is honest and still unreadably empty. A cold reader stops at the first proper noun that does not earn its place. The conviction sentence before it was clear. Everything after it is a tour of the workshop.",
    },
    3: {
      tier1: [
        { title: "Name the conviction", caption: "One sentence, no jargon" },
        { title: "Pick an unauditable expert", caption: "Press, hall, vendor" },
        { title: "Build the check", caption: "A tool, not a take" },
        { title: "Show the evidence", caption: "So you need not be trusted" },
      ],
      tier2: [
        { title: "The press", caption: "Expert that cannot be audited" },
        { title: "City hall", caption: "Expert that cannot be audited" },
        { title: "Legislature", caption: "Expert that cannot be audited" },
        { title: "Dealership", caption: "Expert that cannot be audited" },
        { title: "The shop", caption: "Expert that cannot be audited" },
        { title: "AI vendor", caption: "Expert that cannot be audited" },
        { title: "Market courier", caption: "Outlier — does not fit" },
      ],
      tier3: [
        { title: "Three-tier speaking", caption: "Conviction, then product, then repo" },
        { title: "Watchword name", caption: "Travels only with the sentence" },
        { title: "Show-the-work rule", caption: "Evidence is the product" },
      ],
      prose:
        "Tier 1 is the only sequence that survives a domain swap. Tier 2 is a list of instances, not a product roadmap; the courier is on the map so it can be seen not fitting. Tier 3 are practices that could be lifted into another conviction without taking Tessera with them.",
    },
    4: {
      l1: "Tools that check the people you are supposed to trust, and show the evidence so you do not have to trust the toolmaker either — for anyone who currently has to take an institution’s word.",
      l2: "Tessera (a Roman watchword token used to verify a sentry) is the candidate public name for that conviction. Ten instances already exist, each pointed at a different unauditable expert. Products are named only after a second question; modules never leave the repository. Input is a domain where trust is currently required. Output is a tool plus the evidence trail. The decision it changes is whether the user still has to take anyone’s word, including the maker’s.",
      l3: {
        components:
          "A public name that never travels without the sentence; a three-tier speaking rule; a family of instance-products; a private module layer that is not part of the explanation.",
        dataFlow:
          "Someone asks what you do → sentence (tier 1) → if they ask again, one instance-product (tier 2) → never the modules. Evidence produced by each product is shown to the user so the maker is not a new priest.",
        constraints:
          "One conviction. One name. The name is not committed. No proper nouns in the sentence. Modules do not leave the repo. An instance that does not show work does not belong.",
        loadBearing: [
          "The conviction sentence",
          "Showing evidence so the maker need not be trusted",
          "Refusing to lead with the instance",
        ],
        incidental: [
          "The particular candidate name",
          "Roman etymology",
          "Which ten domains were built first",
        ],
      },
      unknowns: [
        "What SPEC-1, Gatepost, and SPW actually do",
        "Whether the name Tessera is taken badly enough to retire",
        "Whether the farmers-market courier is in or out",
        "How many of the ten are shipped versus sketched",
      ],
    },
    5: {
      script:
        "I build tools that check the people you’re supposed to trust, and I show the evidence so you don’t have to trust me either. I’ve built that same thing about ten times — pointed at the press, at city hall, at a dealership, at an AI vendor — and when you ask what I do, I name one of those, which is why I sound like I do ten different jobs. I don’t. The name I’m trying is Tessera, a Roman watchword: you answer from the token, or you don’t get in. The name never travels without the sentence. If you ask a second question I’ll tell you about a product. I will not tell you about the modules. One of the ten doesn’t fit, which means I still haven’t named the work cleanly.",
      estimatedSeconds: 58,
      willCompress: true,
      sendBackTo: null,
    },
    6: {
      move: "Named the ten and never named the one. Led at the module layer because that is where the work happened, which is the answer to a question nobody asked.",
      tell: "When asked what I do, I reach for an instance — and instances are unexplainable without context.",
      repeatCount: 1,
      priorNote: "First logged run. The altitude skip is the whole finding.",
      tryNext:
        "Say the sentence first. Do not name a product until a second question is asked.",
    },
  },
  replies: {},
};

export const SEED_LOG: OperatorRow = {
  runId: "ic-1",
  runTitle: "One conviction, built ten times",
  date: "2026-08-27T12:00:00.000Z",
  move: "Named the ten and never named the one. Led at the module layer because that is where the work happened.",
  tell: "When asked what I do, I reach for an instance — and instances are unexplainable without context.",
  repeatCount: 1,
  tryNext:
    "Say the sentence first. Do not name a product until a second question is asked.",
};

export const SAMPLE_DUMPS: { label: string; hint: string; dump: string }[] = [
  {
    label: "Tessera",
    hint: "The conviction dump — ten instances, no name",
    dump: DUMP,
  },
  {
    label: "The protocol itself",
    hint: "Cartographer as a prompt compiler",
    dump: `The Invariant: A translation engine that forces raw, unstructured thought through rigid altitude filters to isolate the core conviction from the technical implementation.

The Instance: The Cartographer Protocol functioning as a system prompt generator.

The Assumptions: 1. That a messy idea contains a structurally sound core. 2. That the operator is blind to their own jargon. 3. That forcing a "cold read" before writing the blueprint prevents structural collapse.

The Joint Most Likely to Fail: The transition between the Jargon Ledger and L1. If the operator uses a jargon term in the L1 sentence, the entire abstraction fails.

Pass 2 — Cold Read
Read against the L2 paragraph (see Pass 4).
Exact sentence where the thread is lost: "Before processing, it halts to isolate any proper nouns or assumed knowledge..." (The reader wonders: Does it just stop and wait? How do I give it the knowledge?)
First question asked: "Is this an LLM system prompt, a Python script, or a mental framework I do on paper?"
What they assume it is that it isn't: A fancy summarization tool or an outliner that just cleans up grammar.

Pass 3 — Map
Tier 1: The Invariant (Sequential)
Ingest Chaos → Isolate Jargon → Force Altitudes (L1/L2/L3) → Output Blueprint
Tier 2: The Instances (One box each)
[Cartographer for System Design] [Cartographer for Product Pitch] [Cartographer for LLM Prompts]
Tier 3: The Standalone Pieces
[The Jargon Ledger]
[The Cold Read Emulator]
[The L1/L2/L3 Altitude Framer]
[The Operator Log]

Pass 4 — System Design Blueprint (The Structured Prompt)
L1: A six-pass distillation loop that converts raw, unstructured thought into a rigorously mapped system design prompt by separating the core conviction from the mechanical details.
L2: The system acts as a specialized compiler for human thought. It ingests a raw, unedited brain-dump ("chaos"). Before any synthesis occurs, the engine halts to isolate all proper nouns, acronyms, and assumed knowledge into a Jargon Ledger, forcing the operator to define their terms. Once the ledger is resolved, the system runs a "cold-read" extraction, actively hunting for the exact sentence where a blind reader will lose the thread. It then maps the validated concept across three strict altitudes: a one-sentence conviction (L1), a functional operational paragraph (L2), and the deep mechanical architecture (L3). The final output is a structured, deployable prompt.
L3:
Stage 0: The Dump & Ledger. Unstructured text is parsed. Every capitalized term, acronym, or domain-specific phrase is extracted. Execution pauses until the operator provides a ≤12 word gloss for each.
Stage 1: Extraction. The system strips the narrative to find the invariant (the pattern that survives if the domain is swapped) and the instance.
Stage 2: The Cold Read. The system simulates a zero-context reader. It identifies the failure point, the first question asked, and the false assumption made by the reader.
Stage 3: The Map. A visual, tiered layout representing the invariant (Tier 1), the instances (Tier 2), and the standalone components (Tier 3).
Stage 4: The Blueprint. The structured payload. It strictly enforces the three altitudes. L1 contains zero jargon. L2 uses glossed jargon. L3 contains the technical specs.
Stage 5: Compression. The 60-second test. If it cannot be spoken aloud in one minute, the blueprint is rejected.
Stage 6: Operator Log. An immutable record tracking the operator's specific failure mode for that run (e.g., "Skipped an altitude," "Buried the point under mechanism").
UNKNOWNs:
How to handle a "chaos" dump that contains three entirely separate ideas without breaking the "one idea per run" hard rule.

Pass 5 — Sixty-second test
You have a massive, tangled idea. If you try to explain the whole thing, you instinctively start with the hardest, most technical part—the database, the pipeline, the API—and you lose everyone instantly. This system fixes that. You dump your raw, messy thoughts into it. It catches all the insider jargon you didn't realize you were using and makes you define it. Then it builds a three-tier map: one plain-English sentence for anyone, one paragraph for the operational context, and the deep mechanics strictly for the builders. It gives you back your chaos as a structured, deployable system prompt.

Pass 6 — Operator Log
(not written)`,
  },
  {
    label: "SPEC-1 gates",
    hint: "The 4-gate filter — credibility, velocity, volume, novelty",
    dump: `Invariant: A strict mathematical firewall that prevents raw, unverified data from reaching human synthesis by measuring it against hardcoded, non-negotiable thresholds.

The Instance: The SPEC-1 Gate Evaluation Engine (The 4-Gate Filter) and its underlying formulas.

The Assumptions: 1. That credibility can be reliably quantified. 2. That historical baselines are robust enough that a standard deviation actually indicates a meaningful anomaly rather than a temporary spike.

The Joint Most Likely to Fail: The Novelty gate. If the baseline is too shallow (not enough historical records), the 2σ formula triggers false positives on routine activity.

Pass 2 — Cold Read
Read against the L2 paragraph (see Pass 4).
Exact sentence where the thread is lost: "Novelty requires the signal to register a ≥ 2σ deviation from the entity's rolling historical baseline." (The reader immediately asks: What does the baseline measure? Count of actions? Monetary value? Text length?)
First question asked: "If a politician just started their term, how long does it take to build a baseline before the anomaly detector works?"
What they assume it is that it isn't: A sentiment analysis filter that drops "bad" news.

Pass 3 — Map
Tier 1: The Invariant (Sequential)
Receive Signal → Evaluate Hard Thresholds (Velocity/Volume/Credibility) → Calculate Statistical Delta (Novelty) → Output DeskRecord or Drop
Tier 2: The Instances (One box each)
[Gate 1: Credibility] [Gate 2: Velocity] [Gate 3: Volume] [Gate 4: Novelty]
Tier 3: The Standalone Pieces
[Baseline Bootstrapper]
[The 2σ Anomaly Math]
[Confidence Weighting]

Pass 4 — System Design Blueprint
L1: A four-stage mathematical filter that strips noise and normalizes data, ensuring only credible, timely, and statistically unusual events make it into the final briefing.
L2: The SPEC-1 Gate Evaluation Engine acts as the primary firewall between the chaotic ingestion layer and the structured synthesis layer. It does not read for meaning; it reads for physics. Every unstructured signal is forced through four rigid, deterministic gates. Three of these gates (Credibility, Velocity, and Volume) are hardcoded thresholds designed to eliminate spam, stale news, and untrusted sources. The fourth gate (Novelty) is a dynamic mathematical formula that measures the current signal's tempo or mass against the subject's historical baseline. If the data fails any gate, the pipeline terminates quietly. If it passes, it is bound as a validated DeskRecord and handed to the synthesis LLM.
L3: Synthesis Logic & Mechanism (The Formulas)
Gate 1: Credibility (C)
Formula: C ≥ 0.40
Logic: A pre-assigned trust score based on the source's tier. Direct civic APIs (Tier 1) score highest; secondary aggregators score lower. Anything below 0.40 is dropped.
Gate 2: Velocity (V)
Formula: V_now - V_event ≤ 72 hours
Logic: The system enforces a strict freshness window. Stale data cannot trigger a new intelligence brief unless the record is explicitly flagged as an ongoing or developing situation.
Gate 3: Volume (W)
Formula: W ≥ 50 words (or equivalent data mass)
Logic: Prevents micro-updates (e.g., minor typo corrections in a bill) from triggering the pipeline.
Gate 4: Novelty & Anomaly (Z-score)
Formula: Z = (X - μ) / σ ≥ 2.0
Logic: X is the current event metric (e.g., funding amount, voting deviation count). μ is the rolling mean of the subject's historical baseline. σ is the standard deviation of that baseline. To pass, the event must be a 2σ deviation (flaggable: true). Anything less is considered a routine lead, not an anomaly.
UNKNOWNs:
How is the rolling mean (μ) calculated for brand-new entities entering cls_db with zero historical data? (Does it inherit a global average, or bypass Gate 4 temporarily?)

Pass 5 — Sixty-second test
Before any data reaches the AI that writes the final briefing, it has to survive the physics of the pipeline. We use four mathematical gates. First, is the source credible enough? Second, did this happen in the last 72 hours? Third, is there enough actual data to matter, or is it just a micro-update? If it survives those three, we hit it with the hardest test: novelty. We take the entity's entire historical baseline and run a standard deviation formula. If the new event doesn't mathematically prove it's an anomaly—a true 2-sigma deviation from the norm—it gets downgraded from a red flag to a routine note. We don't guess if an event is unusual; we do the math.

Pass 6 — Operator Log
(not written)`,
  },
];

