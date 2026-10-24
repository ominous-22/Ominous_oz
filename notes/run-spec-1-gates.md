Invariant: A strict mathematical firewall that prevents raw, unverified data from reaching human synthesis by measuring it against hardcoded, non-negotiable thresholds.
​The Instance: The SPEC-1 Gate Evaluation Engine (The 4-Gate Filter) and its underlying formulas.
​The Assumptions: 1. That credibility can be reliably quantified. 2. That historical baselines are robust enough that a standard deviation actually indicates a meaningful anomaly rather than a temporary spike.
​The Joint Most Likely to Fail: The Novelty gate. If the baseline is too shallow (not enough historical records), the 2\sigma formula triggers false positives on routine activity.
​Pass 2 — Cold Read
​Read against the L2 paragraph (see Pass 4).
​Exact sentence where the thread is lost: "Novelty requires the signal to register a \ge 2\sigma deviation from the entity's rolling historical baseline." (The reader immediately asks: What does the baseline measure? Count of actions? Monetary value? Text length?)
​First question asked: "If a politician just started their term, how long does it take to build a baseline before the anomaly detector works?"
​What they assume it is that it isn't: A sentiment analysis filter that drops "bad" news.
​Pass 3 — Map
​Tier 1: The Invariant (Sequential)
Receive Signal \rightarrow Evaluate Hard Thresholds (Velocity/Volume/Credibility) \rightarrow Calculate Statistical Delta (Novelty) \rightarrow Output DeskRecord or Drop
​Tier 2: The Instances (One box each)
[Gate 1: Credibility] [Gate 2: Velocity] [Gate 3: Volume] [Gate 4: Novelty]
​Tier 3: The Standalone Pieces
[Baseline Bootstrapper]
[The 2\sigma Anomaly Math]
[Confidence Weighting]
​Pass 4 — System Design Blueprint
​L1: The Core Invariant
A four-stage mathematical filter that strips noise and normalizes data, ensuring only credible, timely, and statistically unusual events make it into the final briefing.
​L2: System Architecture & Data Flow
The SPEC-1 Gate Evaluation Engine acts as the primary firewall between the chaotic ingestion layer and the structured synthesis layer. It does not read for meaning; it reads for physics. Every unstructured signal is forced through four rigid, deterministic gates. Three of these gates (Credibility, Velocity, and Volume) are hardcoded thresholds designed to eliminate spam, stale news, and untrusted sources. The fourth gate (Novelty) is a dynamic mathematical formula that measures the current signal's tempo or mass against the subject's historical baseline. If the data fails any gate, the pipeline terminates quietly. If it passes, it is bound as a validated DeskRecord and handed to the synthesis LLM.
​L3: Synthesis Logic & Mechanism (The Formulas)
​Gate 1: Credibility (C)
​Formula: C \ge 0.40
​Logic: A pre-assigned trust score based on the source's tier. Direct civic APIs (Tier 1) score highest; secondary aggregators score lower. Anything below 0.40 is dropped.
​Gate 2: Velocity (V)
​Formula: V_{now} - V_{event} \le 72 \text{ hours}
​Logic: The system enforces a strict freshness window. Stale data cannot trigger a new intelligence brief unless the record is explicitly flagged as an ongoing or developing situation.
​Gate 3: Volume (W)
​Formula: W \ge 50 \text{ words} (or equivalent data mass)
​Logic: Prevents micro-updates (e.g., minor typo corrections in a bill) from triggering the pipeline.
​Gate 4: Novelty & Anomaly (Z-score)
​Formula: Z = \frac{X - \mu}{\sigma} \ge 2.0
​Logic: X is the current event metric (e.g., funding amount, voting deviation count). \mu is the rolling mean of the subject's historical baseline. \sigma is the standard deviation of that baseline. To pass, the event must be a 2\sigma deviation (flaggable: true). Anything less is considered a routine lead, not an anomaly.
​UNKNOWNs:
​How is the rolling mean (\mu) calculated for brand-new entities entering cls_db with zero historical data? (Does it inherit a global average, or bypass Gate 4 temporarily?)
​Pass 5 — Sixty-second test
​Before any data reaches the AI that writes the final briefing, it has to survive the physics of the pipeline. We use four mathematical gates. First, is the source credible enough? Second, did this happen in the last 72 hours? Third, is there enough actual data to matter, or is it just a micro-update? If it survives those three, we hit it with the hardest test: novelty. We take the entity's entire historical baseline and run a standard deviation formula. If the new event doesn't mathematically prove it's an anomaly—a true 2-sigma deviation from the norm—it gets downgraded from a red flag to a routine note. We don't guess if an event is unusual; we do the math.
​Pass 6 — Operator Log