#!/usr/bin/env node
/**
 * check-repo.mjs - repository hygiene checks (run in CI and before every commit).
 *
 *  - every skills/<name>/SKILL.md has valid frontmatter (name == folder, description <= 1024 chars,
 *    no YAML-breaking characters) and stays under 500 lines
 *  - Markdown code fences are balanced
 *  - backticked references to references/templates/scripts files and relative Markdown links resolve
 *  - plugin and marketplace manifests parse, agree on name/version, and match the CHANGELOG
 *  - no private data (e-mail addresses outside an allow-list, local user paths)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const all = walk(ROOT);
const markdown = all.filter((f) => f.endsWith('.md'));

// ---- skills
const skillsDir = path.join(ROOT, 'skills');
const skillNames = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
for (const name of skillNames) {
  const file = path.join(skillsDir, name, 'SKILL.md');
  if (!fs.existsSync(file)) { fail(`skills/${name}`, 'missing SKILL.md'); continue; }
  const text = read(file);
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) { fail(rel(file), 'missing YAML frontmatter'); continue; }
  const fmName = (fm[1].match(/^name:\s*(.+)$/m) || [])[1];
  const desc = (fm[1].match(/^description:\s*(.+)$/m) || [])[1] || '';
  if (fmName !== name) fail(rel(file), `frontmatter name "${fmName}" must equal the folder name "${name}"`);
  if (!desc) fail(rel(file), 'missing description');
  if (desc.length > 1024) fail(rel(file), `description is ${desc.length} chars (max 1024)`);
  if (/: /.test(desc) || / #/.test(desc)) fail(rel(file), 'description contains ": " or " #", which can break YAML plain scalars');
  if (text.split('\n').length > 500) fail(rel(file), 'SKILL.md exceeds 500 lines; move detail into references/');
}

// ---- markdown: fences, references, links
for (const file of markdown) {
  const text = read(file);
  if ((text.match(/^\s*```/gm) || []).length % 2) fail(rel(file), 'unbalanced code fence');

  const inSkill = rel(file).startsWith('skills/') ? path.join(skillsDir, rel(file).split('/')[1]) : null;
  const refRe = /`((?:\.\.\/)?(?:[a-z-]+\/)?(?:references|templates|scripts)\/[A-Za-z0-9_\-\/.]+\.(?:md|mjs))`/g;
  for (const m of text.matchAll(refRe)) {
    const ref = m[1].replace(/^\.\.\//, '');
    const candidates = [inSkill && path.join(inSkill, ref), path.join(skillsDir, ref), path.join(ROOT, ref)].filter(Boolean);
    if (!candidates.some((c) => fs.existsSync(c))) fail(rel(file), `unresolved reference \`${m[1]}\``);
  }
  for (const m of text.matchAll(/\]\((?!https?:|mailto:|#)([^)#\s]+)(?:#[^)]*)?\)/g)) {
    if (!fs.existsSync(path.resolve(path.dirname(file), m[1]))) fail(rel(file), `broken link (${m[1]})`);
  }
}

// ---- manifests and changelog
let plugin, market;
try {
  plugin = JSON.parse(read(path.join(ROOT, '.claude-plugin/plugin.json')));
  market = JSON.parse(read(path.join(ROOT, '.claude-plugin/marketplace.json')));
} catch (e) { fail('.claude-plugin', `manifest does not parse: ${e.message}`); }
if (plugin && market) {
  const entry = (market.plugins || [])[0] || {};
  if (entry.name !== plugin.name) fail('.claude-plugin', `marketplace plugin name "${entry.name}" != plugin.json name "${plugin.name}"`);
  if (entry.version !== plugin.version) fail('.claude-plugin', `marketplace version "${entry.version}" != plugin.json version "${plugin.version}"`);
  const top = (read(path.join(ROOT, 'CHANGELOG.md')).match(/^## (\d+\.\d+\.\d+)/m) || [])[1];
  if (top !== plugin.version) fail('CHANGELOG.md', `latest entry "${top}" != plugin version "${plugin.version}"`);
}

// ---- public hygiene
const EMAIL_ALLOW = [/@users\.noreply\.github\.com$/, /^noreply@anthropic\.com$/, /@test\.local$/, /@example\.(com|org)$/];
for (const file of all.filter((f) => /\.(md|json|mjs|yml|yaml|txt)$/.test(f))) {
  const text = read(file);
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g)) {
    if (!EMAIL_ALLOW.some((re) => re.test(m[0]))) fail(rel(file), `e-mail address "${m[0]}" (add to the allow-list only if intentional)`);
  }
  if (/[A-Za-z]:\\Users\\|\/Users\/[A-Za-z0-9._-]+\/|\/home\/[A-Za-z0-9._-]+\//.test(text)) fail(rel(file), 'contains a local user path');
}

if (problems.length) {
  console.error(`check-repo: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`check-repo: OK (${skillNames.length} skills, ${markdown.length} Markdown files)`);
