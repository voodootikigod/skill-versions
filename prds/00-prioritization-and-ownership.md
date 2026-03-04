# Agent Skills Ecosystem: Prioritization Matrix & Ownership Map

## How to Read This Document

Each missing capability is scored on two axes:

- **Novelty** — How unique is this to agent skills? High novelty means the concept doesn't have a clean analog in existing package ecosystems and requires genuine invention. Low novelty means it's a known pattern that can be ported with adaptation.
- **Impact** — How much would this move the needle for the ecosystem right now? High impact means it addresses an active pain point, unlocks adoption, or closes a security gap. Low impact means it's valuable but can wait.

## Ownership Assessment

Each item is tagged with where it most naturally lives:

- **🔧 skillsafe** — Fits as an extension of skillsafe.sh. These are tools that *analyze, verify, and maintain* skills. They're about the health and currency of skill content. This is your project.
- **📦 skills.sh / npx skills** — Fits as part of the registry/CLI infrastructure. These are capabilities that affect *installation, discovery, distribution, and loading* of skills. This is where you'd propose to the skills.sh maintainer.
- **📐 Agent Skills Spec** — Requires a change to the agentskills.io specification itself. These are conventions that every tool in the ecosystem needs to agree on. Proposals go to the spec repo.
- **🤝 Joint** — Needs coordinated work across multiple layers.

---

## Priority Quadrants

### 🔴 Quadrant 1: High Novelty + High Impact (Build These First)

These are the competitive differentiators. They solve problems unique to agent skills that no existing ecosystem has addressed well, and they address urgent needs.

| # | Capability | Novelty | Impact | Owner | Rationale |
|---|-----------|---------|--------|-------|-----------|
| 1 | **Security Audit & Hallucination Detection** | ★★★★★ | ★★★★★ | 🔧 skillsafe | Active threat vector (Aikido research). LLM hallucination of package names is a novel attack surface. No existing tool addresses this. |
| 2 | **Feature Flags / Optional Capabilities** | ★★★★★ | ★★★★★ | 📐 Spec + 📦 skills.sh | Solves context window economics — a problem that only exists for skills. Enables granular loading. Changes how skills are authored and consumed. |
| 3 | **Skill Testing / Eval Integration** | ★★★★☆ | ★★★★★ | 🤝 Joint (spec + skillsafe + skills.sh) | Building blocks exist (OpenAI evals, Vercel agent-eval, Anthropic methodology) but nobody has connected them to the skill format. Integration is the opportunity. |
| 4 | **Context Budget Analysis** | ★★★★★ | ★★★★☆ | 🔧 skillsafe | Completely novel. No equivalent in any package ecosystem. Token cost of skills + transitive dependencies is a real constraint that only matters for LLM-loaded artifacts. |
| 5 | **Semver for Knowledge / Version Verification** | ★★★★☆ | ★★★★☆ | 🔧 skillsafe | Extends your existing product-version work. Automated verification that skill content changes match the claimed version bump. cargo semver-checks adapted for knowledge artifacts. |

### 🟡 Quadrant 2: Lower Novelty + High Impact (Port These Next)

These are known patterns from Cargo/npm/Python that can be adapted with moderate effort and would significantly improve the ecosystem.

| # | Capability | Novelty | Impact | Owner | Rationale |
|---|-----------|---------|--------|-------|-----------|
| 6 | **Lockfiles** | ★★☆☆☆ | ★★★★★ | 📦 skills.sh | Well-understood pattern. Critical for team reproducibility. Directly enables CI integration. Should be a `skills.lock` or extension of existing npm lockfile. |
| 7 | **Policy Enforcement (cargo deny for skills)** | ★★★☆☆ | ★★★★☆ | 🔧 skillsafe | Adapted from cargo deny. Enterprise gate-keeper: enforce trust policies, ban sources, require metadata. Blocks adoption without it. |
| 8 | **Deprecation & Yanking** | ★★☆☆☆ | ★★★★☆ | 📦 skills.sh | Ecosystem hygiene. Prevents installation of known-bad skills. Cargo's yank model is the right template (preserve for existing lockfiles, block new installs). |
| 9 | **Dependency Groups / Contextual Loading** | ★★★☆☆ | ★★★★☆ | 📐 Spec + 📦 skills.sh | Poetry's groups adapted for skills. "Load debug skills only when debugging." Natural fit for progressive disclosure. Reduces context waste. |
| 10 | **Mandatory Metadata on Publish** | ★★☆☆☆ | ★★★★☆ | 📦 skills.sh + 📐 Spec | Raises the quality floor. Require license, author, product-version, agent compatibility before publishing. Low effort, high ecosystem benefit. |

### 🟢 Quadrant 3: High Novelty + Lower Impact (Invest Strategically)

These are genuinely novel but can wait because the ecosystem isn't yet mature enough to fully benefit.

| # | Capability | Novelty | Impact | Owner | Rationale |
|---|-----------|---------|--------|-------|-----------|
| 11 | **Template / Parameterized Skills** | ★★★★☆ | ★★★☆☆ | 📦 skills.sh | Enterprise need for skills customized per-team (naming conventions, internal APIs). Important but enterprise adoption isn't there yet. |
| 12 | **Spec Editions** | ★★★★☆ | ★★★☆☆ | 📐 Spec | Enables spec evolution without breaking existing skills. Becomes critical once multiple new fields are proposed, but premature if only product-version is in flight. |
| 13 | **Structured Taxonomy / Classifiers** | ★★★☆☆ | ★★★☆☆ | 📦 skills.sh + 📐 Spec | PyPI classifiers for skills. Powerful for discovery at scale. Impact grows with ecosystem size — moderate now, high later. |

### ⚪ Quadrant 4: Lower Novelty + Lower Impact (Build When Needed)

Known patterns that are important for a mature ecosystem but aren't urgent blockers today.

| # | Capability | Novelty | Impact | Owner | Rationale |
|---|-----------|---------|--------|-------|-----------|
| 14 | **Private / Enterprise Registries** | ★☆☆☆☆ | ★★★☆☆ | 📦 skills.sh | Important for enterprise but can leverage existing npm private registries if skills are npm-native. Build when enterprise demand materializes. |
| 15 | **Supply Chain Provenance** | ★★☆☆☆ | ★★★☆☆ | 📦 skills.sh | Sigstore/cargo-vet for skills. Important but depends on registry maturity. Build after lockfiles and security audit exist. |
| 16 | **Environment Isolation** | ★★☆☆☆ | ★★☆☆☆ | 📦 skills.sh | Python venv for skills. Current project-vs-global distinction is mostly adequate. Build when multi-project workflows become common. |
| 17 | **Runtime / Agent Version Management** | ★★☆☆☆ | ★★☆☆☆ | 📦 skills.sh | pyenv/nvm for agent skill loaders. Edge case today. Build when agents start shipping breaking changes to skill loading. |

---

## Recommended Build Order

### Phase 1: Foundation & Security (Weeks 1-4)
1. Security Audit & Hallucination Detection → **skillsafe**
2. Context Budget Analysis → **skillsafe**
3. Semver for Knowledge / Version Verification → **skillsafe**
4. Propose Feature Flags to the Spec → **agentskills.io discussion**
5. Propose Skill Testing convention to the Spec → **agentskills.io discussion**

### Phase 2: Ecosystem Quality (Weeks 5-8)
6. Policy Enforcement → **skillsafe**
7. Mandatory Metadata validation → **skillsafe** (lint/check) + **skills.sh** (enforce on publish)
8. Lockfiles → **propose to skills.sh**
9. Deprecation & Yanking → **propose to skills.sh**

### Phase 3: Advanced Capabilities (Weeks 9-12)
10. Dependency Groups → **propose to Spec + skills.sh**
11. Skill Testing CLI integration → **skillsafe** (for regression after refresh)
12. Template / Parameterized Skills → **propose to skills.sh**
13. Structured Taxonomy → **propose to Spec + skills.sh**

### Phase 4: Maturity (Ongoing)
14. Spec Editions → **propose to Spec**
15. Private Registries → **skills.sh** or leverage npm
16. Supply Chain Provenance → **skills.sh**
17. Environment Isolation → **skills.sh**
18. Runtime Version Management → **skills.sh**

---

## What Lives in skillsafe vs. skills.sh

The skills.sh maintainer is a colleague/co-worker. skillsafe should **leverage and complement** skills.sh, never duplicate or compete with it. PRDs tagged as "propose to skills.sh" are written proposals or PRs to bring to that maintainer — not features to build in skillsafe.

### skillsafe: "The Quality & Integrity Layer"

skillsafe answers: **"Are my skills correct, safe, current, and efficient?"**

Build in skillsafe:
- ✅ Version checking (shipped)
- ✅ AI-assisted refresh (shipped)
- ✅ Security audit & hallucination detection (shipped)
- Context budget analysis
- Semver verification / knowledge diff analysis
- Policy enforcement (organizational rules)
- Mandatory metadata linting/validation (local lint side)
- Skill testing integration (run evals after refresh)

### skills.sh: "The Distribution & Lifecycle Layer"

skills.sh answers: **"How do I find, install, update, and manage skills?"**

Propose to skills.sh (don't build in skillsafe):
- Lockfiles
- Deprecation & yanking
- Feature flag resolution at install/load time
- Dependency group resolution
- Private registries
- Mandatory metadata enforcement on publish
- Template skill instantiation
- Environment isolation
- Supply chain provenance
- Structured taxonomy & discovery

### The Spec Governs: "The Contract"

Propose to the Agent Skills spec (agentskills.io):
- Feature flags declaration format
- Skill testing convention (where tests live)
- Dependency group declaration
- Structured classifier vocabulary
- Spec edition field
- product-version field (proposed)
- Mandatory vs optional metadata fields

### Integration, Not Duplication

This three-layer split (spec defines the contract, skillsafe verifies compliance, skills.sh handles distribution) mirrors how Rust works: the language spec defines features, `cargo` handles distribution, and tools like `clippy`/`cargo-deny`/`cargo-semver-checks` handle quality verification.

Where skillsafe connects to skills.sh:
- skillsafe reads skills.sh's installed skill directories (don't maintain a parallel inventory)
- skillsafe could run as a pre-install hook or post-install check in skills.sh
- skillsafe's `check` output could feed into `npx skills status`
- skillsafe's `policy` source rules reference skills.sh registry sources
- skills.sh lifecycle data (deprecation, yank status) feeds into skillsafe's health reports
