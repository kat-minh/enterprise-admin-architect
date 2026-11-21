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

test('the bundled example has no warning about the owner intake, the content inventory, the ledger or foundation triage', () => {
  const r = run(EXAMPLE, 'build');
  assert.ok(!hasMsg(r.warnings, /Owner intake|Content & configuration inventory|Owner module|Foundation modules not decided|Public-site integration/), r.warnings.join(' | '));
});

test('discovery must have an owner intake and a content & configuration inventory', () => {
  const r = run(variant({
    'product-discovery.md': (t) => t.replace(/## 12\. Owner intake[\s\S]*$/, ''),
  }), 'discovery');
  assert.equal(r.status, 0, 'these are warnings, not errors');
  assert.ok(hasMsg(r.warnings, /No "Owner intake" section/));
  assert.ok(hasMsg(r.warnings, /No "Content & configuration inventory" section/));
});

test('feature ledger: a missing column, a blank owner and an unknown owner module are flagged; "excluded: reason" is accepted', () => {
  const noColumn = run(variant({
    'product-discovery.md': (t) => t.replace(' Owner module |', '').replace(/\| products, categories \|/, '|').replace(/\| orders, refunds-returns \|/, '|').replace(/\| promotions \|/, '|').replace(/\| site-content \|/g, '|').replace(/\| excluded: [^|]+\|/, '|').replace('|---|---|---|---|---|---|---|---|---|', '|---|---|---|---|---|---|---|---|'),
  }), 'discovery');
  assert.ok(hasMsg(noColumn.warnings, /Feature Ledger has no "Owner module" column/), noColumn.warnings.join(' | '));
  const bad = run(variant({
    'product-discovery.md': (t) => t.replace('| promotions |', '| no-such-module |').replace('| products, categories |', '|  |'),
  }), 'discovery');
  assert.ok(hasMsg(bad.warnings, /owner module "no-such-module" is not in module-inventory/));
  assert.ok(hasMsg(bad.warnings, /Feature "Product catalogue" has no owner module/));
  assert.ok(!hasMsg(bad.warnings, /Nightly stock import/), 'excluded: <reason> is a valid owner');
});

test('foundation triage: an undecided foundation module is flagged once, with its name', () => {
  const r = run(variant({
    'module-inventory.md': (t) => t.replace(/^\| privacy-requests \|.*\n/m, '').replace(/^\| app-controls \|.*\n/m, ''),
  }), 'discovery');
  const w = r.warnings.find((m) => /Foundation modules not decided/.test(m));
  assert.ok(w, r.warnings.join(' | '));
  assert.match(w, /privacy-requests/);
  assert.match(w, /app-controls/);
  assert.ok(!/localization/.test(w), 'decided modules are not listed');
});

test('module specs should say how the public product reads the data (warning, not error)', () => {
  const r = run(variant({
    'module-specifications/auth.md': (t) => t.replace(/## Public-site integration[\s\S]*?(?=## List page)/, ''),
  }), 'build');
  assert.equal(r.status, 0);
  assert.ok(hasMsg(r.warnings, /auth\.md: No "## Public-site integration" section|No "## Public-site integration"/));
});

test('the template placeholder row "decide each" decides nothing and is itself flagged', () => {
  const r = run(variant({
    'module-inventory.md': (t) => t.replace('## Excluded / deferred (and why)\n', '## Excluded / deferred (and why)\n| public-users · media · localization · help · jobs-monitor · import-export · saved-views · search-command · user-messaging · privacy-requests · app-controls | decide each | <replace> |\n'),
  }), 'discovery');
  assert.ok(hasMsg(r.warnings, /still in "Excluded \/ deferred"/), r.warnings.join(' | '));
});

test('final stage: a runbook with undecided recovery sections, no RPO/RTO and no restore drill is flagged; a decided one is not', () => {
  const bad = run(variant({}, {
    'runbook.md': [
      '# Admin Runbook', '',
      '## 1. Hosting and domains', '| Part | Where |', '|---|---|', '| API | CHƯA QUYẾT |', '| Admin | <host / CDN> |', '',
      '## 5. Backup and restore', 'Nightly dump, kept 30 days. Restore procedure: see the wiki.', '',
      '## 9. Monitoring and known limits', 'Error tracker: TBD', '',
    ].join('\n'),
  }), 'final');
  assert.ok(hasMsg(bad.warnings, /Hosting and domains" is still undecided/), bad.warnings.join(' | '));
  assert.ok(hasMsg(bad.warnings, /Backup and restore" states no RPO and RTO/));
  assert.ok(hasMsg(bad.warnings, /Backup and restore" records no restore drill/));
  assert.ok(hasMsg(bad.warnings, /Monitoring and known limits" is still undecided/));
  const good = run(variant({}, {
    'runbook.md': [
      '# Admin Runbook', '',
      '## 1. Hosting and domains', '| Part | Where |', '|---|---|', '| API | Render, https://api.example.com |', '',
      '## 5. Backup and restore', 'RPO 24 h, RTO 4 h. Restore drill 2026-11-01: 38 minutes, row counts matched.', '',
      '## 9. Monitoring and known limits', 'Sentry; alerts: error rate above 2 percent to the owner.', '',
    ].join('\n'),
  }), 'final');
  assert.ok(!hasMsg(good.warnings, /undecided at final stage|states no RPO|records no restore drill/), good.warnings.join(' | '));
  const none = run(EXAMPLE, 'final');
  assert.ok(hasMsg(none.warnings, /No runbook\.md/) || none.report.results.some((r) => r.file === 'runbook.md'), 'a missing runbook is flagged at the final stage');
});

test('design stage: a design-system.md without a "Design direction" section is warned about; the example has one', () => {
  const ok = run(EXAMPLE, 'design');
  assert.ok(!hasMsg(ok.warnings, /Design direction/), ok.warnings.join(' | '));
  const bad = run(variant({ 'design-system.md': (t) => t.replace('## 0. Design direction', '## 0. Notes') }), 'design');
  assert.ok(hasMsg(bad.warnings, /No "Design direction" section/), bad.warnings.join(' | '));
});
