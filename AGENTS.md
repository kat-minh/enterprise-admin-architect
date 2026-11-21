# AGENTS.md

Guidance for AI coding agents working **on this repository** (the skill suite itself). To *use* the suite in another project, see `docs/using-with-other-ai-tools.md`.

## What this repo is

A suite of agent skills (open Agent Skills layout) that guides an AI assistant through building an enterprise-grade admin system for an existing website: discovery → information architecture & RBAC → design system → module build → QA. Skills are Markdown; two dependency-free Node scripts support them.

```
skills/<skill>/SKILL.md          entry point (frontmatter: name, description)
skills/<skill>/references/       detail loaded on demand
skills/<skill>/templates/        document templates written to docs/admin/ in a target project
skills/<skill>/scripts/          scan-project.mjs, validate-admin-docs.mjs
scripts/                         repo tooling: check-repo.mjs, bundle.mjs
tests/                           node:test suites for the scripts
examples/e-commerce/             sample docs/admin output that must pass the validator
```

## Commands

```bash
npm run verify        # check-repo + all tests + validate the example (what CI runs)
npm run check         # repository hygiene only
npm test              # node --test
```
Node >= 18, no installs.

## Rules for changes

- Skills are **English, imperative, tool-neutral**. Describe optional tool capabilities (question UI, sub-agents, browser) with a fallback; do not hard-depend on one vendor.
- `SKILL.md` stays under 500 lines and the description under 1024 characters with no `: ` sequence; move detail into `references/`.
- Template headings, table headers and enum values are machine-checked by `validate-admin-docs.mjs`; changing them requires updating the validator, the example and the tests together.
- Any change to `scan-project.mjs`, `validate-admin-docs.mjs` or `bundle.mjs` needs a test in `tests/`.
- A script under `templates/` is not released until it has been run **as a template**: copied into a project, its CONFIG filled, executed against a real app. A port of a script that ran proves nothing about the template (the first real run of `ui-audit.mjs` failed on its first page).
- Changing a skill `description` changes when it fires: re-run the trigger evals (`evals/README.md`, about 9 USD for the whole suite; `--tag paraphrase` or `--case` for a part) and keep the near-miss negatives passing.
- Never commit private data (personal e-mail addresses, local paths, secrets, real customer data). `check-repo` enforces part of this.
- Release hygiene: bump `version` in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and `package.json`, and add a `CHANGELOG.md` entry; commit messages follow Conventional Commits.
- Do not claim capabilities that are not implemented or verified, in docs or in the skills. A level in `docs/coverage-map.md` ("Proven") must cite the evidence that exists today (a test, an audit output, a measured figure); "the guidance exists" is **Guidance**, and a project that has the gate but does not meet it is not Proven (a completeness review found "request ids, runbook" rated Proven while the proving project had a static health route and an undecided runbook).
