// Tests for skills/admin-qa-gate/scripts/validate-admin-docs.mjs
// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALIDATOR = path.join(REPO, 'skills/admin-qa-gate/scripts/validate-admin-docs.mjs');
const EXAMPLE = path.join(REPO, 'examples/e-commerce');

/** Copy the example project to a temp dir, apply { 'docs/admin/<file>': (text) => text } edits, return the dir. */
function variant(edits = {}, extraFiles = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-test-'));
  fs.cpSync(EXAMPLE, dir, { recursive: true });
  for (const [rel, fn] of Object.entries(edits)) {
    const p = path.join(dir, 'docs/admin', rel);
    const before = fs.readFileSync(p, 'utf8');
    const after = fn(before);
    assert.notEqual(after, before, `edit for ${rel} did not change the file`);
    fs.writeFileSync(p, after);
  }
  for (const [rel, content] of Object.entries(extraFiles)) {
    const p = path.join(dir, 'docs/admin', rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}
function run(dir, stage = 'build', extra = []) {
  const r = spawnSync(process.execPath, [VALIDATOR, '--root', dir, '--stage', stage, '--json', ...extra], { encoding: 'utf8' });
  const report = JSON.parse(r.stdout);
  return { status: r.status, report, errors: report.results.filter((x) => x.level === 'error').map((x) => x.msg), warnings: report.results.filter((x) => x.level === 'warn').map((x) => x.msg) };
}
const hasMsg = (list, re) => list.some((m) => re.test(m));

test('the bundled example passes every stage up to build with no errors', () => {
  for (const stage of ['discovery', 'architecture', 'design', 'build']) {
    const r = run(EXAMPLE, stage);
    assert.equal(r.status, 0, `${stage}: ${r.errors.join(' | ')}`);
  }
});

test('final stage rejects unfinished P0 modules and a missing QA report', () => {
  const r = run(EXAMPLE, 'final');
  assert.equal(r.status, 1);
  assert.ok(hasMsg(r.errors, /qa-report\.md|Missing required file/));
  assert.ok(hasMsg(r.errors, /P0 module "orders" is still "in-progress"/));
});

test('a module marked done without verification evidence is rejected', () => {
  const dir = variant({ 'module-inventory.md': (t) => t.replace(/(\| payments \|[^\n]*\| )planned( \|)/, '$1done$2') });
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.ok(hasMsg(r.errors, /"payments" is done but has no module specification/));
  assert.ok(hasMsg(r.errors, /"payments" is marked done but has no verification row/));
});

test('route, permission and matrix cross-references are enforced', () => {
  const dir = variant({
    'information-architecture.md': (t) => t.replace('| media | list | media.read', '| ghost | list | media.read').replace('Media library | media |', 'Media library | ghost |'),
    'permission-matrix.md': (t) => t.replace(/^\| reviews\.moderate \| yes[^\n]*\n/m, ''),
  });
  const r = run(dir, 'architecture');
  assert.equal(r.status, 1);
  assert.ok(hasMsg(r.errors, /unknown module "ghost"/));
  assert.ok(hasMsg(r.errors, /Module "media" has no route/));
  assert.ok(hasMsg(r.errors, /"reviews\.moderate" is in the catalog but has no row/));
});

test('a missing core module is flagged, and invalid enum values are errors', () => {
  const dir = variant({
    'module-inventory.md': (t) => t.replace(/^\| audit-log \|[^\n]*\n/m, '').replace('| domain | confirmed | P0 | Prisma `Category`', '| domain | confirmed | P9 | Prisma `Category`'),
  });
  const r = run(dir, 'discovery');
  assert.ok(hasMsg(r.warnings, /Core module "audit-log" is missing/));
  assert.ok(hasMsg(r.errors, /Priority "P9"/));
});

test('proposed modules cannot silently become planned', () => {
  const dir = variant({ 'module-inventory.md': (t) => t.replace(/(\| notifications \|[^\n]*\| )proposed( \|)\s*$/m, '$1planned$2') });
  const r = run(dir, 'discovery');
  assert.ok(hasMsg(r.warnings, /notifications: evidence is "proposed"/));
});

test('module specs must keep the required sections', () => {
  const dir = variant({ 'module-specifications/orders.md': (t) => t.replace('## Edge cases', '## Corner cases') });
  const r = run(dir);
  assert.ok(hasMsg(r.errors, /Missing section "## Edge cases"/));
});

test('FE-first: prototype modules need a spec and an API contract; done cannot use mock data', () => {
  const dir = variant({ 'module-inventory.md': (t) => t.replace(/(\| categories \|[^\n]*\| )planned( \|)/, '$1prototype$2') });
  let r = run(dir);
  assert.ok(hasMsg(r.errors, /api-contract\.md is missing/));
  assert.ok(hasMsg(r.errors, /"categories" is prototype but has no module specification/));

  const spec = fs.readFileSync(path.join(EXAMPLE, 'docs/admin/module-specifications/orders.md'), 'utf8').replace(/orders/g, 'categories');
  const fixed = variant(
    { 'module-inventory.md': (t) => t.replace(/(\| categories \|[^\n]*\| )planned( \|)/, '$1prototype$2') },
    { 'api-contract.md': '# API Contract\n\n### GET /api/admin/categories (module: categories)\n- Permission: categories.read\n\nPadding so the document is not considered trivially short by the validator.\n', 'module-specifications/categories.md': spec },
  );
  r = run(fixed);
  assert.equal(r.errors.length, 0, r.errors.join(' | '));

  const mock = variant({ 'implementation-status.md': (t) => t.replace('| auth | api |', '| auth | mock |') });
  r = run(mock);
  assert.ok(hasMsg(r.errors, /"auth" is done but its Data source is still "mock"/));

  assert.ok(hasMsg(run(fixed, 'final').errors, /P0 module "categories" is still "prototype"/));
});

test('free text may be written in another language; headings and enums stay English', () => {
  const dir = variant({ 'permission-matrix.md': (t) => t.replace('View orders', 'Xem danh sách đơn hàng') });
  assert.equal(run(dir).status, 0);
  const translatedHeader = variant({ 'module-inventory.md': (t) => t.replace('| Evidence |', '| Bằng chứng |') });
  assert.equal(run(translatedHeader, 'discovery').status, 1);
});

test('usage errors', () => {
  assert.equal(spawnSync(process.execPath, [VALIDATOR, '--stage', 'nope'], { encoding: 'utf8' }).status, 2);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-empty-'));
  assert.equal(spawnSync(process.execPath, [VALIDATOR, '--root', empty], { encoding: 'utf8' }).status, 1);
});
