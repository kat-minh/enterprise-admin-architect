#!/usr/bin/env node
/**
 * bundle.mjs - build a single self-contained Markdown prompt for one phase of the suite,
 * for AI assistants that cannot load skill folders (chat UIs, tools without SKILL.md support).
 *
 * Usage:
 *   node scripts/bundle.mjs <phase> [--domains a,b|all] [--no-orchestrator] [--out file]
 *
 * Phases: orchestrator | discovery | ia | design | build | qa | ui-audit
 *   ui-audit is the standalone UI audit of an existing admin: it also inlines the audit script, the quality gates, the test playbook and the
 *   visual / accessibility / dashboard / front-end architecture references it points to.
 * --domains   discovery only: which domain playbooks to inline (file names without .md, or "all").
 *             The domain index and the custom-domain playbook are always included.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const PHASES = {
  orchestrator: 'enterprise-admin-architect',
  discovery: 'admin-discovery',
  ia: 'admin-information-architecture',
  design: 'admin-design-system',
  build: 'admin-module-builder',
  qa: 'admin-qa-gate',
  'ui-audit': 'admin-ui-audit',
};

// the standalone audit skill points at files that live in other skills; a chat-only assistant needs them inlined
const UI_AUDIT_FILES = [
  ['admin-qa-gate', 'templates/ui-audit.mjs'],
  ['admin-qa-gate', 'templates/perf-frontend.mjs'],
  ['admin-qa-gate', 'references/quality-gates.md'],
  ['admin-qa-gate', 'references/e2e-test-playbook.md'],
  ['admin-design-system', 'references/visual-standard.md'],
  ['admin-design-system', 'references/anti-slop-design.md'],
  ['admin-design-system', 'references/accessibility-responsive.md'],
  ['admin-design-system', 'references/dashboard-design.md'],
  ['admin-module-builder', 'references/frontend-architecture.md'],
];

const argv = process.argv.slice(2);
const usage = () => {
  console.error('Usage: node scripts/bundle.mjs <phase> [--domains a,b|all] [--no-orchestrator] [--out file]\nPhases: ' + Object.keys(PHASES).join(' | '));
  process.exit(2);
};
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const phase = argv.find((a, i) => !a.startsWith('--') && !['--domains', '--out'].includes(argv[i - 1]));
if (!phase || !PHASES[phase]) usage();
const outFile = opt('--out');
const withOrchestrator = !argv.includes('--no-orchestrator') && phase !== 'orchestrator';
const domainArg = opt('--domains');
if (domainArg === undefined && argv.includes('--domains')) usage();

const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const stripFrontmatter = (t) => t.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
const listMd = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name).sort() : []);

const version = JSON.parse(read(path.join(ROOT, '.claude-plugin/plugin.json'))).version;
const skillDir = path.join(SKILLS, PHASES[phase]);
const parts = [];
const files = [];

parts.push(`# Enterprise Admin Architect - "${phase}" bundle (v${version})

This file is a self-contained copy of the instructions for one phase of the Enterprise Admin Architect skill suite, for AI assistants that cannot load skill folders.

How to use: give this whole file to your AI assistant as context, then describe your project (stack, data model, public pages) or let it read your repository. Follow the gates: the assistant must stop and ask for approval where the instructions say so.

Notes: references to \`references/...\`, \`templates/...\` and other skills point to the "File:" sections included below or to the other phase bundles. Mentions of \`scripts/*.mjs\` are optional tooling that needs a shell with Node >= 18; if your assistant cannot run code, skip those steps and do the equivalent checks by reading the files.
`);

function addSkillBody(dir, label) {
  parts.push(`\n---\n\n# ${label}\n\n${stripFrontmatter(read(path.join(dir, 'SKILL.md')))}\n`);
  files.push(path.relative(ROOT, path.join(dir, 'SKILL.md')));
}
function addFile(dir, rel) {
  const full = path.join(dir, rel);
  parts.push(`\n---\n\n## File: ${rel.split(path.sep).join('/')}\n\n${read(full).trim()}\n`);
  files.push(path.relative(ROOT, full));
}

if (withOrchestrator) addSkillBody(path.join(SKILLS, PHASES.orchestrator), 'Orchestrator: principles, pipeline and gates');
addSkillBody(skillDir, `Phase instructions: ${PHASES[phase]}`);

for (const f of listMd(path.join(skillDir, 'templates'))) addFile(skillDir, path.join('templates', f));
for (const f of listMd(path.join(skillDir, 'references'))) addFile(skillDir, path.join('references', f));

if (phase === 'discovery') {
  const domDir = path.join(skillDir, 'references', 'domains');
  const available = listMd(domDir).map((f) => f.replace(/\.md$/, ''));
  const requested = domainArg === 'all' ? available.filter((d) => !d.startsWith('_')) : (domainArg ? domainArg.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const unknown = requested.filter((d) => !available.includes(d));
  if (unknown.length) {
    console.error(`Unknown domain(s): ${unknown.join(', ')}\nAvailable: ${available.filter((d) => !d.startsWith('_')).join(', ')}`);
    process.exit(2);
  }
  for (const d of ['_index', '_custom-domain-playbook', ...requested]) addFile(skillDir, path.join('references', 'domains', `${d}.md`));
}

if (phase === 'ui-audit') {
  for (const [skill, rel] of UI_AUDIT_FILES) addFile(path.join(SKILLS, skill), rel);
}

const text = parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
const approxTokens = Math.round(text.length / 4);
if (outFile) {
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, text);
  console.error(`Wrote ${outFile}: ${files.length} source files, ~${approxTokens.toLocaleString('en-US')} tokens`);
} else {
  process.stdout.write(text);
  console.error(`(${files.length} source files, ~${approxTokens.toLocaleString('en-US')} tokens)`);
}
