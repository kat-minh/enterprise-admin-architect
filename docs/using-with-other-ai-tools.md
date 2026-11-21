# Using the suite with any AI assistant

The suite is plain Markdown plus two dependency-free Node scripts. Nothing in the instructions depends on a specific vendor: where a capability is tool-specific (a question UI, sub-agents, a browser), the skills describe it as optional and give a fallback.

**Tested with:** Claude Code (primary target). The skills use the open **Agent Skills** layout (`SKILL.md` + `references/`, `templates/`, `scripts/`), which other tools also read, but those tools are not exercised in this repository's CI. Check your tool's documentation for where it loads skills from.

## Pick an integration level

| Level | Your assistant can… | Use | Effort |
|---|---|---|---|
| **1. Skills folder** | Load Agent Skills (`SKILL.md`) | Copy `skills/*` into the tool's skills directory | Lowest |
| **2. Instruction file** | Read project files and an instruction file (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, Copilot instructions…) but has no skill loader | Keep `skills/` in the repo and point the instruction file at the orchestrator | Low |
| **3. Chat only** | Only read what you paste (no repository access) | Generate per-phase bundles with `scripts/bundle.mjs` and paste them | Medium |

### Level 1 - Skills folder

Copy **every** folder from `skills/` into your tool's skills directory (project-level or user-level). They reference each other, so install them together. Then ask:

> Build the admin system for this project. Follow the `enterprise-admin-architect` skill.

(Claude Code users: install as a plugin, see the README.)

### Level 2 - Instruction file

Place the suite inside the project (for example `tools/admin-skills/`) and add this to the project's instruction file (`AGENTS.md`, or the file your tool reads):

```markdown
## Admin system

When asked to build, extend or audit the admin / back office / CMS, follow
`tools/admin-skills/skills/enterprise-admin-architect/SKILL.md` and the phase skills it names.
Do not write admin code before the module inventory is approved. Write outputs to `docs/admin/`.
Scripts: `tools/admin-skills/skills/admin-discovery/scripts/scan-project.mjs` and
`tools/admin-skills/skills/admin-qa-gate/scripts/validate-admin-docs.mjs` (Node >= 18).
```

Then prompt: "Follow the Admin system section: start with discovery."

### Level 3 - Chat only (no file access)

Generate one self-contained bundle per phase:

```bash
node scripts/bundle.mjs discovery --domains ecommerce --out bundles/1-discovery.md
node scripts/bundle.mjs ia        --out bundles/2-architecture.md
node scripts/bundle.mjs design    --out bundles/3-design.md
node scripts/bundle.mjs build     --out bundles/4-build.md
node scripts/bundle.mjs qa        --out bundles/5-qa.md
```

| Phase | Bundle | Approx. size |
|---|---|---|
| Discovery & inventory | `discovery` (+ `--domains a,b` or `all`) | 14-15k tokens (up to 24k with all domains) |
| Architecture & permissions | `ia` | 7k tokens |
| Design system | `design` | 13k tokens |
| Module build | `build` | 22k tokens |
| QA | `qa` | 11k tokens |

Workflow:
1. **One phase per conversation.** Paste the phase bundle, then give your project facts (see below).
2. **Carry results forward.** Save each phase's output as `docs/admin/*.md`; paste the relevant documents into the next phase's conversation (architecture needs the module inventory; build needs inventory + IA + permission matrix + design system).
3. **Approve at each gate** before starting the next phase.

What to give a chat assistant in place of repository access: `package.json`, the database schema/models, the list of public routes and API endpoints, how authentication works, and screenshots or a description of the public pages. The assistant will mark anything it cannot verify as an assumption.

Without a shell, skip the script steps: the scanner is replaced by the facts above, and the docs validator by reading the documents against the checklists in the QA bundle.

## Capability notes

| Optional capability | Used for | Fallback |
|---|---|---|
| Ask-the-user / choice UI | Gate approvals | A short numbered list of questions with recommended defaults |
| Sub-agents / background tasks | Parallel code reading, parallel module builds | Sequential work |
| Shell + Node >= 18 | `scan-project.mjs`, `validate-admin-docs.mjs` | Manual discovery; manual document review |
| Browser automation | Click-through QA, screenshots | Test runner (Playwright) or manual walkthrough notes |

## Model guidance

- The gates and the "never claim what you did not verify" rules are **instructions**; models that follow long instructions less reliably may skip them. Review the output at each gate, and prefer one phase per session for smaller context windows.
- Keep generated documents in English structure (headings, table headers, enum values) even when the content is written in another language; the validator checks them.
