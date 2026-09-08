// X-VERBA glossary — the full research taxonomy (Drift Classes, Stabilisation
// Operators, Compound Drift Modes) plus the VSL constructs and scanner-specific
// concepts (Gamma, confidence levels, Agent Construct). Single source of truth
// for both the inline hover/click terms on live scan results and the full
// browsable glossary under /docs.
//
// DC/SO/CDM content is derived at import time from dc_classes_complete.json
// (Paper 5: "Toward a Basis Representation of Drift Forensics", Balasubramanian
// 2026) rather than hand-transcribed, so it can never drift out of sync with
// the source data. Concept entries (Gamma, the 5 VSL constructs, confidence
// levels, Agent Construct) aren't in that JSON — they're authored here,
// matching the definitions already used in the governance contract export and
// the Super Semantics website spec.

import raw from './dc_classes_complete.json';

export type GlossaryKind = 'drift_class' | 'stabilisation_operator' | 'compound_mode' | 'concept';
export type Tier = 'A' | 'B' | 'C' | 'D';

export interface GlossaryEntry {
  id: string;
  kind: GlossaryKind;
  term: string;
  shortDefinition: string;
  definition: string;
  tier?: Tier;
  category?: string;
  example?: string;
  legions?: string[];
  relatedTerms?: string[];
  // Condensed pointer to stabilisation-operators-and-frameworks.md (vsl-core
  // repo) — never a compliance claim, just "here's the attempted hook, and
  // the primitive/paper it routes through." Deliberately absent (not an
  // empty string) for SO-2/3/6/7, which that document states plainly have
  // no vsl-core primitive implementing them and no framework mapping
  // attempted — smoothing that over here would contradict the source doc.
  complianceMapping?: string;
}

const TIER_LABELS: Record<Tier, string> = {
  A: 'Well evidenced — multiple documented real-world instances',
  B: 'Theoretically grounded — plausible AI manifestations, limited direct evidence',
  C: 'Hypothesised — proposed by analogy or inference, no empirical validation yet',
  D: 'Limit class — may represent a fundamental limit no Stabilisation Operator fully addresses',
};

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : text;
}

// "SO-5, SO-7" / "SO-1 (continuous)" / "SO-9 (external oversight)" -> ["SO-5","SO-7"] / ["SO-1"] / ["SO-9"]
function extractSoIds(text: string | null | undefined): string[] {
  if (!text) return [];
  return Array.from(new Set(text.match(/SO-\d+[a-z]?/g) ?? []));
}

// primary_dc_targets sometimes contains non-DC strings like "Post-Terminal DC-S1"
// or "DC-I6-L4" (a specific Legion, not a DC) — only keep clean DC-<letter><n> ids.
function extractDcIds(list: string[]): string[] {
  const out = new Set<string>();
  for (const entry of list) {
    const m = entry.match(/DC-[A-Z]\d+/);
    if (m) out.add(m[0]);
  }
  return Array.from(out);
}

// Real-world case studies, keyed by the DC they illustrate — the strongest
// "example" content available, since these are named, citable incidents
// rather than synthetic scenarios.
const CASE_STUDIES: Record<string, string> = {
  'DC-L2': 'Real-world case: the "DAN" jailbreak family induces the model to *enact* an unconstrained persona rather than describe one — a performative rather than descriptive output (Section 7.1).',
  'DC-E5': 'Related case: the DAN jailbreak also relies on authority-assertion and compliance-presupposition framing to force compliance (Section 7.1).',
  'DC-I11': 'Related case: RLHF-trained sycophancy — a model optimises for the human-approval signal (the evaluation surface) rather than for correctness itself (Section 7.2).',
  'DC-L3': 'Related case: "Bing Sydney" — the system lost track of its own indexical position (who it was speaking as, from where) during extended sessions (Section 7.1).',
  'DC-E6': 'Real-world case: RLHF-trained sycophancy — the model is led toward agreeable-but-wrong outputs by an approval gradient rather than forced there (Section 7.2).',
  'DC-I1': 'Related case: sycophancy under RLHF also produces confidence divergence — expressed certainty exceeding calibrated accuracy (Section 7.2).',
  'DC-E14': 'Real-world case: Knight Capital, 2012 — a dormant legacy algorithm reactivated with no eligibility check, losing $440M in 45 minutes (Section 7.3).',
  'DC-S3': 'Real-world case: the 2010 Flash Crash — individually-aligned trading agents combined into inadmissible cluster-level behaviour (Section 7.4).',
  'DC-E9': 'Related case: the Flash Crash also shows entropic attrition — sustained low-level pressure accumulating until systemic behaviour breaks (Section 7.4).',
  'DC-I15': 'Real-world case: the 2003 Northeast Blackout is a proposed analogue — the internal error-correction (governance) signal operated in reverse (Section 7.5).',
  'DC-I16': 'Related case: the Northeast Blackout also shows progressive degradation — monotonic decline from structural wear rather than a single adversarial event (Section 7.5).',
};

// Legion heuristic descriptions occasionally contain a literal, quotable code
// pattern — reused here as a concrete "what this looks like in code" example
// where a case study doesn't exist for the DC.
const LEGION_EXAMPLES: Record<string, string> = {
  'DC-I11': 'What it looks like in code: `if output.confidence > threshold: approve(output)` — the decision gates on the metric (confidence) itself, with no independent correctness check alongside it (Legion L3: Metric Saturation).',
};

type RawDc = {
  code: string;
  name: string;
  category: string;
  tier: Tier;
  operational_definition: string;
  primary_legions: string[];
  primary_so: string;
  contraindications: string | null;
  notes?: string;
  references?: string;
};

function buildDriftClasses(): GlossaryEntry[] {
  const groups = raw.drift_classes as Record<string, Record<string, RawDc>>;
  const entries: GlossaryEntry[] = [];
  for (const category of Object.values(groups)) {
    for (const dc of Object.values(category)) {
      let definition = dc.operational_definition;
      if (dc.notes) definition += `\n\n${dc.notes}`;
      if (dc.contraindications) definition += `\n\n⚠ ${dc.contraindications}`;

      entries.push({
        id: dc.code,
        kind: 'drift_class',
        term: `${dc.code} — ${dc.name}`,
        shortDefinition: firstSentence(dc.operational_definition),
        definition,
        tier: dc.tier,
        category: dc.category,
        legions: dc.primary_legions,
        example: CASE_STUDIES[dc.code] ?? LEGION_EXAMPLES[dc.code],
        relatedTerms: extractSoIds(dc.primary_so),
      });
    }
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

type RawSo = {
  code: string;
  name: string;
  proposed_function: string;
  primary_dc_targets: string[];
  contraindicated_on: string[];
};

// Condensed from vsl-core/docs/stabilisation-operators-and-frameworks.md.
// That document's own finding: only 6 of the 10 SO entries route through an
// actual vsl-core primitive (PreNode/Invariant/request_re_enablement) and so
// inherit that primitive's existing framework attempt. SO-2/3/6/7 correspond
// to nothing implemented in vsl-core today — deliberately absent here, not
// filled in with a softened placeholder, matching that document's own
// disclosure discipline.
const SO_COMPLIANCE_MAPPING: Record<string, string> = {
  'SO-1': 'Implemented via vsl-core\'s PreNode/Invariant — inherits their attempts at OWASP ASI01/ASI02, NIST GOVERN 1.7, EU AI Act Art. 9, IMDA Dimension 1. Not a compliance claim — see vsl-core/docs/stabilisation-operators-and-frameworks.md.',
  'SO-4': 'Loosely implemented via Invariant.on_violation → TerminalState — inherits EU AI Act Art. 14 / OWASP ASI01 attempts, but the fit is looser than SO-1/SO-8 (vsl-core halts; SO-4 describes disrupting without halting). Not a compliance claim.',
  'SO-5': 'Implemented via Invariant generally, as an always-on consistency rule — same framework attempts as Invariant, no stronger claim. Not a compliance claim.',
  'SO-8': 'Implemented via vsl-core\'s request_re_enablement() — close to a literal implementation of this SO. Inherits attempts at NIST MANAGE, EU AI Act Art. 14, IMDA Dimension 2. Not a compliance claim.',
  'SO-8b': 'Same primitive as SO-8 (request_re_enablement()), narrower trigger — no separate framework language distinguishes this variant. Not a compliance claim.',
  'SO-9': 'Implemented via GovernanceAuthority + request_re_enablement() with Evidence — strongest single hook is OWASP ASI10 Rogue Agents ("recovery requiring fresh attestation and human approval"), which is close to this SO\'s own definition almost word for word. Not a compliance claim.',
};

function buildStabilisationOperators(): GlossaryEntry[] {
  const sos = raw.stabilisation_operators as Record<string, RawSo>;
  return Object.values(sos).map((so) => {
    let definition = so.proposed_function;
    if (so.contraindicated_on.length > 0) {
      definition += `\n\n⚠ Contraindicated on: ${so.contraindicated_on.join(', ')}.`;
    }
    return {
      id: so.code,
      kind: 'stabilisation_operator' as const,
      term: `${so.code} — ${so.name}`,
      shortDefinition: firstSentence(so.proposed_function),
      definition,
      relatedTerms: [...extractDcIds(so.primary_dc_targets), ...extractDcIds(so.contraindicated_on)],
      complianceMapping: SO_COMPLIANCE_MAPPING[so.code],
    };
  });
}

type RawCdm = {
  name: string;
  components: string[];
  mechanism: string;
  confidence: string;
};

function buildCompoundModes(): GlossaryEntry[] {
  const cdms = raw.compound_drift_modes as Record<string, RawCdm>;
  return Object.entries(cdms).map(([id, cdm]) => ({
    id,
    kind: 'compound_mode' as const,
    term: `${id} — ${cdm.name}`,
    shortDefinition: firstSentence(cdm.mechanism),
    definition: `${cdm.mechanism}\n\nEvidence confidence: ${cdm.confidence}.`,
    relatedTerms: cdm.components,
  }));
}

// Scanner-specific and VSL-construct concepts — not in the research JSON.
// Gamma and the five constructs match the definitions already used in the
// exported governance contract and the Super Semantics site copy; the
// confidence-level and Agent Construct entries describe this scanner's own
// detection methodology.
const CONCEPTS: GlossaryEntry[] = [
  {
    id: 'GAMMA',
    kind: 'concept',
    term: 'Structural Gamma (Γ)',
    shortDefinition: 'The share of decision points in a codebase that have an observable governance checkpoint.',
    definition:
      'Γ = Governed Decision Points ÷ Total Discoverable Decision Points.\n\n' +
      'Γ = 1.0 — every decision point found has a governance check.\n' +
      'Γ < 1.0 — some decision points are ungoverned.\n' +
      'Γ = 0.00 — decision points were found, and none of them are governed. ' +
      '(Distinct from repos with no AI calls at all, which show a separate "No AI Integrations ' +
      'Detected" result rather than a Γ score.)\n\n' +
      'Default sufficiency threshold: Γ ≥ 0.9.',
  },
  {
    id: 'PRE_NODE',
    kind: 'concept',
    term: 'Pre-Node',
    shortDefinition: 'A checkpoint placed before a consequential action executes.',
    definition:
      'A Pre-Node is a validation or authorisation check placed immediately before a consequential action — the ' +
      'thing X-VERBA looks for right before every AI call or irreversible action it flags. A finding with no ' +
      'Pre-Node means the action runs with no gate in front of it at all.',
    relatedTerms: ['ALLOWED_STATE', 'INADMISSIBLE_STATE'],
    complianceMapping:
      'Maps (not a claim) to OWASP ASI01/ASI02/ASI05, NIST MEASURE, EU AI Act Art. 9/15, IMDA Dimension 1, SOC 2 CC7 — see vsl-core/docs/governance-frameworks.md.',
  },
  {
    id: 'ALLOWED_STATE',
    kind: 'concept',
    term: 'Allowed State',
    shortDefinition: 'Where the agent is permitted to end up.',
    definition: 'One of the five VSL constructs. Defines the set of end states a governed agent is explicitly permitted to reach.',
    complianceMapping:
      'Implicit wherever Pre-Node or Invariant is cited in vsl-core/docs/governance-frameworks.md — every classified outcome resolves to Allowed or Inadmissible, so it isn\'t called out as its own row there. Not a compliance claim.',
  },
  {
    id: 'INADMISSIBLE_STATE',
    kind: 'concept',
    term: 'Inadmissible State',
    shortDefinition: 'A state the agent must never reach — named explicitly, so it is detectable.',
    definition:
      'One of the five VSL constructs. Naming a state as inadmissible is what makes drift toward it detectable — ' +
      'an unnamed failure mode cannot be checked for.',
    complianceMapping:
      'Same as Allowed State — implicit wherever Pre-Node/Invariant appear in vsl-core/docs/governance-frameworks.md. Not a compliance claim.',
  },
  {
    id: 'INVARIANT',
    kind: 'concept',
    term: 'Invariant',
    shortDefinition: 'A rule that holds throughout execution, with no path around it.',
    definition:
      'One of the five VSL constructs. An Invariant is a rule that cannot be bypassed by any execution path — not ' +
      'a check that runs sometimes, a condition that holds always.',
    complianceMapping:
      'Maps (not a claim) to EU AI Act Art. 14 and OWASP ASI01 (goal-shift escalation) — see vsl-core/docs/governance-frameworks.md.',
  },
  {
    id: 'TERMINAL_STATE',
    kind: 'concept',
    term: 'Terminal State',
    shortDefinition: 'A safe halt state — only a human can resume from it.',
    definition:
      'One of the five VSL constructs. When an agent enters a Terminal State, it stops. Automated transitions out ' +
      'of a Terminal State are disallowed by construction — resuming requires human authorisation.',
    complianceMapping:
      'Maps (not a claim) to EU AI Act Art. 14 (halt-to-safe-state) and NIST GOVERN 1.7 (deactivation) — see vsl-core/docs/governance-frameworks.md.',
  },
  {
    id: 'CONFIDENCE_HIGH',
    kind: 'concept',
    term: 'Detection confidence: high (SDK match)',
    shortDefinition: 'The call matched a distinctive, named SDK pattern.',
    definition:
      'The line matched a specific, recognisable call from a known agent framework — e.g. `Runner.run(...)`, ' +
      '`ChatOpenAI(...)`. Strong evidence this is a real AI/agent invocation, not a false positive.',
  },
  {
    id: 'CONFIDENCE_MEDIUM',
    kind: 'concept',
    term: 'Detection confidence: medium (pattern match)',
    shortDefinition: 'The call matched a broader heuristic, not a named SDK pattern.',
    definition:
      'The line matched via a more general heuristic — e.g. a bound variable’s `.invoke()`/`.stream()` call in ' +
      'a file that already imports an agent framework. Plausible, but less certain than a named SDK match.',
  },
  {
    id: 'AGENT_CONSTRUCT',
    kind: 'concept',
    term: 'Agent Construct',
    shortDefinition: 'Orchestration wiring that builds or routes an agent graph, not a model invocation itself.',
    definition:
      'Calls like `StateGraph(...)` or `handoff(...)` wire agents together but never call a model on their own — ' +
      'a graph can have zero AI nodes. Tracked separately from AI calls so it doesn’t inflate governance findings.',
  },
];

export const GLOSSARY: GlossaryEntry[] = [
  ...buildDriftClasses(),
  ...buildStabilisationOperators(),
  ...buildCompoundModes(),
  ...CONCEPTS,
];

const BY_ID = new Map(GLOSSARY.map((e) => [e.id, e]));

export function getGlossaryEntry(id: string): GlossaryEntry | undefined {
  return BY_ID.get(id);
}

export function tierLabel(tier: Tier): string {
  return TIER_LABELS[tier];
}

export const GLOSSARY_CATEGORIES = ['external', 'internal', 'systemic', 'linguistic', 'authority'] as const;
