// Tests for scripts/bundle.mjs
// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(REPO, 'scripts/bundle.mjs');
const bundle = (...args) => spawnSync(process.execPath, [BUNDLE, ...args], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

test('every phase produces a self-contained bundle without YAML frontmatter', () => {
  for (const phase of ['orchestrator', 'discovery', 'ia', 'design', 'build', 'qa', 'ui-audit']) {
    const r = bundle(phase);
    assert.equal(r.status, 0, `${phase}: ${r.stderr}`);
    assert.match(r.stdout, new RegExp(`"${phase}" bundle`));
    assert.ok(!/^name: /m.test(r.stdout) && !r.stdout.includes('\n---\nname:'), `${phase}: frontmatter leaked`);
    assert.match(r.stdout, /## File: /, `${phase}: no inlined files`);
  }
});

test('non-orchestrator bundles include the orchestrator rules; --no-orchestrator omits them', () => {
  assert.match(bundle('qa').stdout, /Prime directives/);
  assert.ok(!/Prime directives/.test(bundle('qa', '--no-orchestrator').stdout));
});

test('the standalone ui-audit bundle inlines the audit script and the references it points to from other skills', () => {
  const out = bundle('ui-audit').stdout;
  const files = [...out.matchAll(/^## File: (.+)$/gm)].map((m) => m[1]);
  for (const need of ['templates/ui-audit.mjs', 'references/quality-gates.md', 'references/dashboard-design.md', 'references/frontend-architecture.md', 'references/accessibility-responsive.md']) {
    assert.ok(files.includes(need), `ui-audit bundle lacks ${need}: ${files}`);
  }
  assert.match(out, /UX-13/);
  assert.match(out, /Admin UI Audit/);
});

test('discovery bundles inline only the requested domain playbooks', () => {
  const out = bundle('discovery', '--domains', 'ecommerce,saas').stdout;
  const domainFiles = [...out.matchAll(/^## File: references\/domains\/(.+)\.md$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(domainFiles, ['_custom-domain-playbook', '_index', 'ecommerce', 'saas']);
  const all = bundle('discovery', '--domains', 'all').stdout;
  assert.ok((all.match(/^## File: references\/domains\//gm) || []).length >= 16);
});

test('writes to --out and rejects bad input with exit code 2', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-test-')), 'nested', 'b.md');
  const r = bundle('design', '--out', out);
  assert.equal(r.status, 0);
  assert.ok(fs.statSync(out).size > 5000);
  assert.equal(bundle('nope').status, 2);
  assert.equal(bundle('discovery', '--domains', 'does-not-exist').status, 2);
});
