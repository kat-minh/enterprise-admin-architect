# Contributing

Thanks for helping improve Enterprise Admin Architect. Issues and pull requests are welcome, especially:

- **Field reports**: what worked or failed when you ran the suite on a real project (stack, domain, which phase, what the assistant got wrong).
- **Domain playbooks** for business types not covered yet.
- **Stack adapters** (UI kits and frameworks) and corrections to version-specific details.
- **Scanner support** for more frameworks and ORMs.
- Bug fixes and clarifications in the skills.

## Setup

Node >= 18. There is nothing to install.

```bash
git clone https://github.com/kat-minh/enterprise-admin-architect.git
cd enterprise-admin-architect
npm run verify
```
`npm run verify` runs the repository checks, all tests and the example validation - the same as CI.

## Repository layout

See [`AGENTS.md`](AGENTS.md) for the layout and the rules of the repository.

## Adding a domain playbook

1. Create `skills/admin-discovery/references/domains/<domain>.md` using this structure (see existing files for depth and tone):

   ```markdown
   # <Domain>
   **Signals:** models / routes / libraries that identify the domain.
   ## Modules            (table: ID | Module | Pri | Notes)
   ## Lifecycles         (state machines with guards)
   ## Dashboard queues & KPIs
   ## Special permissions
   ## Audit-critical
   ## Edge cases & pitfalls
   ```
2. Add one row to `skills/admin-discovery/references/domains/_index.md` with the signals.
3. Prefer evidence-based, operational content (what an operator must be able to do) over feature lists. Do not add modules a site of that type would not need.

## Adding or fixing a stack adapter

Edit `skills/admin-design-system/references/stack-adapters.md`. State the version you verified against, and keep the rule that the admin reuses the project's existing UI kit.

## Changing the scripts

`scan-project.mjs`, `validate-admin-docs.mjs` and `bundle.mjs` are dependency-free Node (>= 18). Every behaviour change needs a test in `tests/` (they build fixtures in a temporary directory; do not commit fixture projects). Scanner output is a *map, not truth*: prefer reporting less over reporting wrongly.

## Writing guidelines for skills

- English, imperative voice, tool-neutral. Optional capabilities come with a fallback.
- Keep `SKILL.md` short (< 500 lines); put detail in `references/` and say when to read it.
- Explain *why* a rule exists when it is not obvious; avoid shouting in capitals.
- No claims that cannot be verified. No private data, personal e-mail addresses or local paths.
- Document templates are machine-checked: headings, table headers and enum values stay in English.

## Pull requests

- Branch from `main`; keep changes focused.
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Run `npm run verify` before opening the PR.
- For user-visible changes, add a `CHANGELOG.md` entry and bump the version consistently in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and `package.json` (SemVer: new capability = minor, fix = patch).
- Describe what you tested and on what kind of project.

By contributing you agree that your contributions are licensed under the MIT License.
