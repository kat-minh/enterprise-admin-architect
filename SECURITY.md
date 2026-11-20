# Security Policy

## Supported versions

Security fixes are applied to the latest release.

## Reporting a vulnerability

Please report privately through GitHub: **Security → Report a vulnerability** on this repository. Do not open a public issue for an undisclosed vulnerability. Include what you found, how to reproduce it, and the impact. Reports are handled on a best-effort basis.

## Scope

- **Scripts** (`scan-project.mjs`, `validate-admin-docs.mjs`, `bundle.mjs`, `check-repo.mjs`): they run locally, make no network requests and have no dependencies. `scan-project.mjs` reads project files only to describe them; it reads environment variable **names** from `.env.example`-style files and never reads `.env` files or reports secret values. Report any case where a script executes project code, leaks values, writes outside the requested output path, or can be made to do so by crafted input.
- **Guidance** (skills and references): if guidance would lead an assistant to build an insecure admin (for example a flawed authorization or upload recommendation in the security baseline), report it as a security issue.

## Out of scope

Vulnerabilities in the projects you build with the suite, in third-party libraries mentioned in the references, or in the AI assistant you use to run it.
