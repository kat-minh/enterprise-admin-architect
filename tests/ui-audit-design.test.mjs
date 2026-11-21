// Tests for the design-consistency scoring inside skills/admin-qa-gate/templates/ui-audit.mjs.
// The page-side collector (designMetrics) needs a browser and is verified by running the template against a real app (AGENTS.md);
// the scoring and merging are pure functions and are tested here.
// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(REPO, 'skills/admin-qa-gate/templates/ui-audit.mjs'), 'utf8').replace(/\r\n/g, '\n');
const m = /\/\/ <design-metrics>([\s\S]*?)\/\/ <\/design-metrics>/.exec(src);
assert.ok(m, 'the template has a <design-metrics> block');
const { scoreDesign, mergeDesign, emptyDesign, DESIGN_DEFAULTS } = new Function(`${m[1]}\nreturn { scoreDesign, mergeDesign, emptyDesign, DESIGN_DEFAULTS }`)();

/** numbers of a calm page state: nothing to report */
const clean = (over = {}) => ({
  texts: 120, fonts: { Inter: 100 }, mono: {}, sizes: { 13: 50, 14: 40, 20: 5 }, weights: { 400: 90, 600: 10 }, funcMin: 13, funcMinAt: '', h1: 22, body: 14,
  kickers: [], monoChars: 0, chars: 2000, radii: { 6: 10 }, bigRadius: [], shadows: {}, inflowShadow: [], glow: [], gradients: 0, gradientHue: [], gradText: [], blur: [],
  stripes: [], infinite: [], transAll: 0, bounce: 0, hues: { 210: 3 }, statusColors: {}, spacing: { 8: 100, 16: 50 }, spaceTotal: 150, spaceOff: 0,
  numAlignBad: [], ellipsisNoTitle: [], hiddenRowActions: 0, iconSizes: { 16: 10 }, iconStrokes: { 2: 10 }, iconOutline: 10, iconFilled: 0, emoji: [], iconTiles: [],
  cardDepth: 1, cardDepthAt: '', tileRows: 0, tileMax: 0, centred: 2, centredTd: 0, firstTableTop: 220, placeholders: [], greeting: [], raw: [], generic: [], emptyNoAction: [],
  deltas: {}, inputs: 4, inputBad: [], ...over,
});
const sev = (list, re) => list.find((x) => re.test(x.what))?.sev;

test('a calm page state has no findings', () => {
  assert.deepEqual(scoreDesign(clean()), []);
});

test('source-backed bans are MUST: gradient text, glow, purple gradient, emoji icons, raw keys, placeholder text, a row of 7 tiles', () => {
  const f = scoreDesign(clean({ gradText: ['h1'], glow: ['div.card 0 0 20px rgba(99,102,241,.5)'], gradientHue: ['header'], emoji: ['button "🚀"'], raw: ['ORDER_STATUS_PENDING'], placeholders: ['lorem ipsum'], tileMax: 7 }));
  for (const re of [/M6 gradient text/, /M4 coloured or glowing/, /M6 purple\/blue/, /M9 emoji/, /M11 raw key/, /M11 placeholder/, /M10 a row of 7/]) assert.equal(sev(f, re), 'must', String(re));
});

test('consistency drift is SHOULD, not MUST: small text, kickers, shadows on cards, stripes, hover-only actions, centred cells', () => {
  const f = scoreDesign(clean({ funcMin: 11.5, funcMinAt: 'a 11.5px', kickers: ['span "OVERVIEW"'], inflowShadow: ['a', 'b', 'c'], stripes: ['div.alert'], hiddenRowActions: 3, centredTd: 2, firstTableTop: 600, greeting: ['Welcome back'] }));
  for (const re of [/M2 functional text under 12/, /M2 small tracked all-caps/, /M4 3 in-flow/, /M6 coloured stripe/, /M8 3 row action/, /M10 2 centred table/, /M10 the first table starts 600/, /M11 greeting/]) assert.equal(sev(f, re), 'should', String(re));
  assert.equal(scoreDesign(clean({ funcMin: 10 })).find((x) => /functional text/.test(x.what)).sev, 'must');
});

test('a flat type hierarchy and a loud title are flagged; a normal one is not', () => {
  assert.ok(sev(scoreDesign(clean({ h1: 15, body: 14 })), /flat hierarchy/));
  assert.ok(sev(scoreDesign(clean({ h1: 40 })), /20-24px/));
  assert.equal(scoreDesign(clean({ h1: 24, body: 14 })).length, 0);
});

test('the 4px grid share is only judged on enough samples', () => {
  assert.equal(scoreDesign(clean({ spaceTotal: 20, spaceOff: 20 })).length, 0);
  assert.ok(sev(scoreDesign(clean({ spaceTotal: 200, spaceOff: 40 })), /4px grid/));
});

test('stat tile rows: one is fine, two are a should, more than six per row is a must', () => {
  assert.equal(scoreDesign(clean({ tileRows: 1, tileMax: 4 })).length, 0);
  assert.equal(sev(scoreDesign(clean({ tileRows: 2, tileMax: 4 })), /rows of identical stat tiles/), 'should');
  assert.equal(sev(scoreDesign(clean({ tileRows: 1, tileMax: 7 })), /a row of 7/), 'must');
});

test('app scope: too many fonts, sizes, radii, shadows, hues, spacing values and icon sizes; one status in two colours is a must', () => {
  const app = emptyDesign();
  app.fonts = { Inter: 1, Georgia: 1, Roboto: 1 };
  app.sizes = Object.fromEntries([11, 12, 13, 14, 15, 16, 18, 20, 24].map((n) => [n, 1]));
  app.weights = { 400: 1, 500: 1, 600: 1, 700: 1 };
  app.radii = { 2: 1, 4: 1, 6: 1, 8: 1, 12: 1 };
  app.shadows = { a: 1, b: 1, c: 1, d: 1 };
  app.hues = Object.fromEntries([0, 30, 60, 120, 180, 210, 270, 300].map((h) => [h, 1]));
  app.spacing = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i * 4 + 4, 1]));
  app.iconSizes = { 14: 1, 16: 1, 18: 1, 24: 1 };
  app.iconStrokes = { 1.5: 1, 2: 1 };
  app.statusColors = { paid: { '22,163,74': 1, '37,99,235': 1 }, pending: { '217,119,6': 1 } };
  const f = scoreDesign(app, {}, 'app');
  for (const re of [/M1 3 text font families/, /M2 9 distinct font sizes/, /M2 4 distinct font weights/, /M3 5 distinct border radii/, /M4 4 distinct box shadows/, /M7 16 distinct spacing/, /M9 4 icon sizes/]) assert.equal(sev(f, re), 'should', String(re));
  assert.equal(sev(f, /M5 8 hue families/), 'must');
  assert.equal(sev(f, /M5 status "paid"/), 'must');
  assert.equal(f.some((x) => /status "pending"/.test(x.what)), false);
});

test('the declared font list is enforced only when it is given', () => {
  const app = emptyDesign();
  app.fonts = { 'Be Vietnam Pro': 5, Arial: 1 };
  assert.equal(scoreDesign(app, {}, 'app').some((x) => /declared/.test(x.what)), false);
  const f = scoreDesign(app, { fonts: ['Be Vietnam Pro'] }, 'app');
  assert.ok(f.some((x) => /font "Arial" is not in the declared/.test(x.what)));
});

test('thresholds can be pinned per project', () => {
  const app = emptyDesign();
  app.radii = { 2: 1, 4: 1, 6: 1, 8: 1, 12: 1 };
  assert.ok(scoreDesign(app, {}, 'app').length > 0);
  assert.equal(scoreDesign(app, { radii: 6 }, 'app').length, 0);
  assert.ok(DESIGN_DEFAULTS.radii === 4 && DESIGN_DEFAULTS.sizes === 8);
});

test('mergeDesign sums the maps and unions the status colours across pages', () => {
  const acc = emptyDesign();
  mergeDesign(acc, clean({ fonts: { Inter: 3 }, statusColors: { paid: { '1,2,3': 1 } } }));
  mergeDesign(acc, clean({ fonts: { Inter: 2, Mono: 1 }, statusColors: { paid: { '4,5,6': 1 } } }));
  assert.deepEqual(acc.fonts, { Inter: 5, Mono: 1 });
  assert.deepEqual(Object.keys(acc.statusColors.paid).sort(), ['1,2,3', '4,5,6']);
});
