![x-verba](https://img.shields.io/badge/Structural%20Gamma-0.0%20UNGOVERNED-red?style=flat-square)

# X-Verba

X-Verba is the first static governance analyser — a tool that finds structural risk in code the way linters find bugs.

Static governance analysis is the discipline of detecting structural governance gaps in code — the boundaries, checks, and rules that determine what a system is allowed to do and what it must never do.

A free CLI that scans any codebase, finds unprotected decision points, and generates a governance contract you can actually use. Works on any repo. No account required. Built by Super Semantics.

**Requirements:** Python 3.9+ or Node.js 18+. Supports `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.java`, `.go`, `.rb`, `.cs`. Schema version 1.0.

---

## Install

```bash
pip install x-verba        # Python
npm install -g x-verba     # Node.js
```

## Quick start

```bash
x-verba scan ./my-repo
```

```
✓ Reading code structure...
✓ Detecting AI integrations (AST)...
✓ Mapping failure patterns...
✓ Analysing governance gaps...
✓ Computing Gamma score...

→ Output: .verba/governance.yaml
→ Critical findings: 3
→ High findings: 2
→ Structural Gamma (Γ): 0.0 / 1.0  ← no governed decision points detected
→ Next step: open .verba/governance.yaml and complete the policy fields
```

---

## Features at a glance

- Scans Python (AST-based) and JavaScript repos for governance gaps
- Covers a complete taxonomy of structural failure patterns
- Plain-English explanation and real-world example for every finding
- Recommends what to fix and how to fix it for each gap
- Flags wrong fixes — responses that make things worse
- Generates governance contracts in YAML, JSON, and Markdown
- Computes a transparent Structural Gamma score (Γ)
- CI/CD integration with exit codes (`x-verba qa --strict`)
- Forensics mode for post-mortem decomposition
- Governed prompt generation for AI coding tools

---

## The lifecycle

```
Codebase ──► x-verba scan ──► Governance Contract ──► verba compile ──► Runtime Enforcement
                                      ▲                                          │
                                 x-verba qa                               VERBA Ledger
                                (every commit)                          (continuous audit)
```

X-Verba is the entry point. It generates the governance contract that the rest of the VERBA stack enforces and records.

---

## Why this matters now

**AI agents write and run code autonomously.** When Copilot, Cursor, or Claude generates your integration code, that code arrives with no governance contract. Nobody asked what it must never do. Nobody defined where it must stop. Nobody specified who must approve its irreversible actions. X-Verba is the first tool that asks those questions automatically — on any code, including every line an AI assistant ever wrote.

**Autonomous pipelines execute irreversible actions.** Payments. Database writes. Notifications. Deployments. These cannot be undone. In 2012, Knight Capital lost $440 million in 45 minutes because a legacy algorithm was reactivated with no eligibility check. One missing governance boundary. One file. X-Verba finds those boundaries before they find you.

**Regulatory pressure is arriving.** The EU AI Act, ISO 42001, NIST AI RMF, and sector-specific frameworks are moving toward computable governance evidence — proof that governance was applied, not just claimed. X-Verba generates the artifacts that form the foundation of that evidence chain.

**Systems are too complex to audit manually.** Microservices, multi-agent pipelines, chained AI calls, distributed state — no human can audit these by reading the code. X-Verba reads it and surfaces what matters.

---

## How it works

**Step 1 — Read the code structure.** Not the semantics — the structure. Where do external inputs enter? Where do AI calls happen? Where do irreversible actions get triggered? Where does data flow from user input to consequential output?

**Step 2 — Identify decision points.** Every location where the system is about to commit — call an AI, write a database, send a notification, trigger an external system. These are the moments governance must fire.

```
AI model output  →  user-facing response
AI model output  →  irreversible action
External input   →  database write
Deployment flag  →  algorithm activation
API call         →  financial transaction
User input       →  AI prompt (unsanitised)
Chained AI call  →  next AI call (no validation)
```

**Step 3 — Classify the structural risk.** Every detected pattern is mapped to a structured failure pattern — a candidate risk category with a plain-English description, observable signatures, and a specific fix recommendation.

**Step 4 — Generate a governance contract.** A YAML or JSON file pre-filled from the scan. Every field explained in plain English. Policy fields left blank — only you know what your system must and must never do.

---

## The Gamma score (Γ)

```
Γ = Governed Decision Points / Total Discoverable Decision Points
```

- **Γ = 1.0** — every decision point has a governance check
- **Γ < 1.0** — ungoverned decision points exist
- **Γ = 0.0** — no governance structure detected anywhere

Default sufficiency threshold: **Γ ≥ 0.9** — `x-verba qa --strict` fails a build if Γ drops below this.

**Important:** This is a structural proxy from static analysis. It measures whether governance mechanisms are present in code structure. It is not a runtime measurement and not a compliance guarantee. Runtime Gamma requires the VERBA Runtime deployed alongside your system.

**Real-world results:** Scans of AutoGPT (177k stars), LangChain (112k stars), BabyAGI, CrewAI, AutoGen, LlamaIndex, Semantic Kernel, OpenAI Cookbook, and Khoj all produced Γ = 0.0. Not because these are poorly built. Because governance at the code level is not yet a standard practice anywhere in the AI agent ecosystem.

---

## Key concepts

**Decision point** — any location where the system is about to commit to a consequential action: an AI call, a database write, a payment, a notification, a deployment trigger. These are the moments governance must fire. X-Verba detects them automatically.

**Eligibility check** — the validation that must pass immediately before a decision point executes. The last moment the system can be stopped before it commits. If no check is present, X-Verba flags a gap.

**Policy rule** — a condition that must always hold, across every input and every state. Cannot be bypassed. If violated, the system stops and surfaces an error. X-Verba detects informal checks in your code and asks you to formalise them.

**Human approval gate** — a point where automation must pause and a named human must explicitly approve before the system continues. Automation cannot perform this step. X-Verba flags when irreversible actions can commit without one.

**Stop condition** — a state from which no automated exit is permitted. The system halts. A human must act to continue. X-Verba flags when your system has no defined stop conditions for high-consequence outcomes.

**Governance contract** — the YAML or JSON file X-Verba generates. It defines what your system is allowed to do, what it must never do, who must approve what, and what happens when something goes wrong. The contract is the source of truth. Everything else enforces it.

**Gamma (Γ)** — the governance sufficiency score. Formally: the ratio of governed decision points to total discoverable decision points. A structural proxy for how well your system's behaviour is bounded. Γ = 0.0 means no governance structure exists anywhere in the codebase.

---

## What the scan produces

For every gap found, the governance contract includes:

- **Location** — exact file and line number
- **What is missing** — plain-English description of the absent check
- **What happens without a fix** — the specific failure mode and its consequence
- **How to fix it** — a code block you can copy directly into your codebase
- **Conditions that must be true** — the eligibility rules to add before the decision point fires
- **What happens on block** — error type, logging requirement, and what not to do

---

## A real example — what X-Verba would have found

On 1 August 2012, Knight Capital Group lost $440 million in 45 minutes. A legacy algorithm was accidentally reactivated by a deployment flag. No eligibility check prevented its reactivation. No boundary stopped it from executing live trades.

X-Verba forensics on that codebase would have produced one finding:

```yaml
FINDING-001:
  location: order_routing/power_peg.py
  severity: critical

  what_is_missing: >
    An irreversible action (trade execution) is triggered here
    with no eligibility check. Once this executes, it cannot
    be undone.

  what_to_add: >
    A condition confirming all prior system deactivations are
    complete before any new activation proceeds.

  what_happens_without_it: >
    This executes automatically whenever the deployment flag is
    set. No human approval. No record. No way to stop it.

  policy: ~    # one question: what must be confirmed before activation?
```

One finding. One blank policy field. One question that needed an answer before deployment. That question, asked on 31 July 2012, would have cost nothing to answer. The cost of not asking it was $440 million in 45 minutes.

---

## Five modes

### `x-verba scan`
Scan any repo and generate a governance contract.

```bash
x-verba scan ./my-repo
x-verba scan ./my-repo --format json
x-verba scan ./my-repo --identity-key my-system-v1.0
```

Produces `.verba/governance.yaml` — every detected decision point, structural risk pattern, governance gap, Gamma score, and plain-English explanation — pre-filled from the scan with policy fields for you to complete.

---

### `x-verba qa`
Governance regression testing — designed for CI/CD.

```bash
x-verba qa . --schema .verba/governance.yaml
x-verba qa . --schema .verba/governance.yaml --strict
```

Returns exit code 1 if critical governance regressions are found. `--strict` fails the build if Γ drops by more than the configured threshold since the last approved scan.

**GitHub Actions:**
```yaml
- name: Governance check
  run: x-verba qa . --schema .verba/governance.yaml --strict
```

**GitLab CI:**
```yaml
governance:
  script: x-verba qa . --schema .verba/governance.yaml --strict
  allow_failure: false
```

---

### `x-verba forensics`
Reverse engineer failures from code or runtime traces.

```bash
x-verba forensics ./legacy-repo
x-verba forensics ./repo --identity-key my-system-v1.0
```

Maps code patterns to structural risk categories and produces a governance diagnostic. v0.3 adds log and trace ingestion — OpenTelemetry traces or JSON logs mapped to failure patterns, pointing to the exact governance contract line that was insufficient when the failure occurred.

---

### `x-verba prompt`
Generate a governance-informed prompt for AI coding tools.

```bash
x-verba prompt -d "patient triage API using GPT-4" --domain healthcare
x-verba prompt --from-repo ./partial-codebase --domain finance
```

Embeds governance requirements directly into the code generation request. Feed the output to Claude, Copilot, or Cursor. The generated code will have governance structure from the first line.

Maintains uniformity across the full lifecycle — what was fed, what was received, what was tested, what was released. The same governance vocabulary runs through all four. Forensics can trace back to the first prompt.

---

### `x-verba compile`
Compile an approved contract into an executable bundle.

```bash
x-verba compile .verba/governance.yaml
x-verba compile .verba/governance.yaml --validate-only
```

Validates completeness, checks for logical inconsistencies, compiles into a machine-executable bundle for the VERBA Runtime.

---

## Where artifacts live

```
my-repo/
  .verba/
    governance.yaml    ← fill this in — the governance contract
    governance.json    ← machine-readable version
    bundle.vsl         ← compiled bundle (after x-verba compile)
```

---

## Honest status

**Working today (v0.1):**
Scans Python repos using AST-based detection and JavaScript repos using pattern-based detection. Detects AI API calls, ungated irreversible actions, missing eligibility checks, informal policy rules, and pipeline-level governance risks. Outputs YAML, JSON, and Markdown. Computes Structural Gamma score.

**Known limitations:**
JavaScript scanner uses pattern matching and will miss some custom wrappers. Python AST scanner will miss dynamically constructed calls. Gamma score is a structural proxy, not runtime Gamma. v0.2 addresses language coverage and detection depth.

**In active development (v0.2):**
Full taint analysis across all languages. Complete runtime detection. QA engine with CI/CD exit codes. TypeScript, Java, Go, Ruby, C# support.

**v0.3 and beyond:**
Log and trace ingestion for forensics. Governed prompt generation. Governance diff viewer. Drift heatmaps. IDE integration.

**Requires the VERBA Runtime (separate):**
Runtime enforcement, continuous monitoring, the VERBA Ledger, and formally validated Gamma are separate from X-Verba. X-Verba generates the specification. The Runtime enforces it.

---

## Roadmap

**v0.1 — Now**
- `x-verba scan` — Python (AST) and JavaScript
- Complete structural risk pattern detection
- YAML, JSON, Markdown output
- Structural Gamma score
- Plain-English governance contract

**v0.2**
- Full taint analysis — all languages, custom wrapper detection
- `x-verba qa` — CI/CD integration, exit codes, `--strict` flag
- GitHub Actions and GitLab CI templates
- TypeScript, Java, Go, Ruby, C#
- Formalisation logic — reads existing schema and marks addressed gaps

**v0.3**
- `x-verba forensics` — log and trace ingestion, failure pattern decomposition from runtime events
- `x-verba prompt` — governed prompt generation
- Governance diff viewer
- Drift heatmaps

**v0.4**
- VS Code extension
- Plugin architecture — custom risk pattern definitions
- `x-verba compile` — full validation, executable bundle
- VERBA Runtime integration

**v1.0**
- Full VERBA stack
- VERBA Certificate generation
- Regulatory report export (EU AI Act, ISO 42001, NIST AI RMF)
- Verba Studio — AI-assisted governance authoring

---

## Conceptual foundations

X-Verba operationalises concepts developed through independent research into governance, drift, and stabilisation in complex systems. Four papers are published and available open access on Zenodo:

**Paper 1 — Pre-Stabilisation Dynamics** `[DOI: 10.5281/zenodo.19190422]`
Introduces the governance primitives and the Verbanatomy framework. Establishes the vocabulary for formation-layer governance — intervening before a stable state forms rather than reacting after it has.

**Paper 2 — Unified Formalism for Constraint-Driven Convergence** `[DOI: 10.5281/zenodo.19192149]`
Derives the formal Gamma criterion as a thermodynamic identity linking statistical mechanics, Lyapunov control theory, information geometry, and energy-based models. Proves four theorems for computing Gamma in real-time autonomous systems.

**Paper 3 — Pre-Stabilisation Signals** `[DOI: 10.5281/zenodo.19208565]`
An empirical measurement protocol for governance sufficiency. Proposes the Governance Effectiveness Score (GES) and provides estimation pipelines for computing Gamma from observable system behaviour.

**Paper 4 — VERBA: Verifiable Behaviour Architecture** `[DOI: 10.5281/zenodo.19292644]`
A proposed closed-loop governance architecture. Defines the compiled governance bundle, the runtime enforcement layer, the VERBA Ledger, and the complete governance lifecycle from contract authoring to runtime enforcement to forensic audit. Includes case studies applying the framework to Knight Capital, the Flash Crash, and the 2003 Northeast Blackout.

These papers make no product claims. X-Verba makes no research claims. They are distinct. The research is independent and available for scrutiny, challenge, and improvement.

---

## Contributing

X-Verba is open source under the MIT License. Issues, pull requests, and discussions are welcome.

The most valuable contribution: point X-Verba at a real-world failure — a documented post-mortem, a CVE, a public incident report — and describe what structural gap the evidence supports. Every real-world mapping strengthens the detection engine and sharpens the tool.

[github.com/4vish/x-verba](https://github.com/4vish/x-verba)

---

## About Super Semantics

Super Semantics builds governance infrastructure for software systems.

*Governance proven, not claimed.*

[supersemantics.org](https://supersemantics.org)

---

## License

X-Verba CLI is released under the MIT License.

MIT means anyone can use it, fork it, embed it, build on it, or sell products on top of it. No restrictions. The implementation is open. Read the code. Verify the logic. The openness is intentional — a governance tool that cannot be inspected is a contradiction.

The structural risk taxonomy, failure pattern definitions, and the Verbanatomy conceptual framework are the work of independent researchers, published under Creative Commons Attribution 4.0. They are not proprietary to Super Semantics. X-Verba's implementation is the work of Super Semantics.
