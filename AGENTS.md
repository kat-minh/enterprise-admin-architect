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
- Never commit private data (personal e-mail addresses, local paths, secrets, real customer data). `check-repo` enforces part of this.
- Release hygiene: bump `version` in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and `package.json`, and add a `CHANGELOG.md` entry; commit messages follow Conventional Commits.
- Do not claim capabilities that are not implemented or verified, in docs or in the skills.
