// Tests for the native-scrollbar check inside skills/admin-qa-gate/templates/ui-audit.mjs (rules SCROLL-1 and SCROLL-2).
// The page-side collector needs a browser: its arithmetic is exercised here against a stubbed DOM, but it is only proven by running the template
// against a real app (AGENTS.md: a template is not released until it has been run as a template). The classification is a pure function.
// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = 'skills/admin-qa-gate/templates/ui-audit.mjs';
const src = fs.readFileSync(path.join(REPO, rel), 'utf8').replace(/\r\n/g, '\n');
const m = /\/\/ <scrollbars>([\s\S]*?)\/\/ <\/scrollbars>/.exec(src);
assert.ok(m, 'the template has a <scrollbars> block');
const { classifyScrollbars, scrollbarDescriptors } = new Function(`${m[1]}\nreturn { classifyScrollbars, scrollbarDescriptors }`)();

/** an element that scrolls inside a box with nothing to report: overflow auto, no scrollbar drawn, content fits */
const el = (over = {}) => ({
  tag: 'div', role: '', sel: 'div.panel', overflowX: 'auto', overflowY: 'auto', sbV: 0, sbH: 0,
  scrollW: 400, clientW: 400, scrollH: 300, clientH: 300, main: false, dialog: false, optOut: false, ...over,
});
const sevs = (list, re) => list.filter((x) => re.test(x.what)).map((x) => x.sev);

test('the template launches the browser with scrollbars visible unless CONFIG.hideScrollbars says otherwise', () => {
  assert.match(src, /ignoreDefaultArgs:\s*CONFIG\.hideScrollbars \? \[\] : \['--hide-scrollbars'\]/);
  assert.match(src, /hideScrollbars: false/);
  assert.match(src, /mainScrollSelectors: \['main'\]/);
});

test('phone-width states hide scrollbars (touch devices overlay them) instead of shrinking the layout', () => {
  assert.match(src, /st\.w < 600 && !CONFIG\.hideScrollbars\) await page\.addStyleTag\(\{ content: '\*\{scrollbar-width:none !important\}' \}\)/);
});

test('SCROLL-1 (must): a native scrollbar for a 1px overflow, the tab bar case', () => {
  // .ad-tabs: overflow-x:auto forces overflow-y:auto, the active-tab underline sits at bottom:-1px, so the content is 1px taller than the box
  const tabs = el({ tag: 'div', role: 'tablist', sel: 'div.ad-tabs', sbV: 21, sbH: 0, scrollH: 37, clientH: 36, scrollW: 1110, clientW: 1110 });
  const f = classifyScrollbars([tabs]);
  assert.equal(f.length, 1);
  assert.equal(f[0].sev, 'must');
  assert.match(f[0].what, /^SCROLL-1 div\.ad-tabs \[role=tablist\] shows a native vertical scrollbar for a 1px overflow/);
});

test('SCROLL-1 also covers a 2px overflow, an always-on scrollbar with nothing to scroll, and the horizontal axis', () => {
  assert.deepEqual(sevs(classifyScrollbars([el({ sbV: 15, scrollH: 302, clientH: 300 })]), /SCROLL-1/), ['must']);
  const empty = classifyScrollbars([el({ overflowY: 'scroll', sbV: 15 })]);
  assert.deepEqual(sevs(empty, /SCROLL-1 .*vertical scrollbar for a 0px overflow/), ['must']);
  assert.deepEqual(sevs(classifyScrollbars([el({ sbH: 15, scrollW: 402, clientW: 400 })]), /SCROLL-1 .*horizontal scrollbar for a 2px overflow/), ['must']);
});

test('SCROLL-2 (should): a tab bar, toolbar, navigation or menu bar with a real overflow and a visible scrollbar', () => {
  for (const role of ['tablist', 'toolbar', 'navigation', 'menubar']) {
    const f = classifyScrollbars([el({ role, sel: 'div.bar', sbH: 21, scrollW: 617, clientW: 500 })]);
    assert.equal(f.length, 1, role);
    assert.equal(f[0].sev, 'should', role);
    assert.match(f[0].what, new RegExp(`^SCROLL-2 div\\.bar \\[role=${role}\\] shows a native horizontal scrollbar \\(it overflows by 117px\\)`), role);
  }
  // a <nav> has the navigation role without saying so
  assert.deepEqual(sevs(classifyScrollbars([el({ tag: 'nav', sel: 'nav.side', sbV: 17, scrollH: 900, clientH: 500 })]), /SCROLL-2 nav\.side \[role=navigation\]/), ['should']);
});

test('a real scrolling region that is not a control strip is not flagged: a table wrapper, a long list', () => {
  assert.deepEqual(classifyScrollbars([el({ sel: 'div.table-wrap', sbH: 15, scrollW: 1400, clientW: 800 })]), []);
  assert.deepEqual(classifyScrollbars([el({ sel: 'ul.list', sbV: 15, scrollH: 2000, clientH: 400 })]), []);
});

test('both axes of one element are judged separately: a 1px vertical bar is a must, the real horizontal overflow of a tab bar a should', () => {
  const f = classifyScrollbars([el({ role: 'tablist', sel: 'div.ad-tabs', sbV: 21, sbH: 21, scrollH: 37, clientH: 36, scrollW: 617, clientW: 540 })]);
  assert.deepEqual(f.map((x) => x.sev), ['must', 'should']);
});

test('nothing is reported for the main scroll container, a dialog, data-scroll-region, a textarea, select, pre or code', () => {
  const noisy = { sbV: 15, sbH: 15, scrollH: 301, clientH: 300, scrollW: 401, clientW: 400 };
  assert.deepEqual(classifyScrollbars([el({ ...noisy, tag: 'main', sel: 'main.ad-main', main: true })]), []);
  assert.deepEqual(classifyScrollbars([el({ ...noisy, role: 'tablist', dialog: true })]), []);
  assert.deepEqual(classifyScrollbars([el({ ...noisy, role: 'tablist', optOut: true })]), []);
  for (const tag of ['textarea', 'select', 'pre', 'code']) assert.deepEqual(classifyScrollbars([el({ ...noisy, tag })]), [], tag);
});

test('overflow:auto with no visible scrollbar (hidden or overlay) is not a finding, even on a tab bar with a 1px overflow', () => {
  assert.deepEqual(classifyScrollbars([el({ role: 'tablist', sbV: 0, sbH: 0, scrollH: 37, clientH: 36, scrollW: 900, clientW: 400 })]), []);
  // a bar of 1px or less is rounding noise from fractional borders, not a scrollbar
  assert.deepEqual(classifyScrollbars([el({ role: 'tablist', sbV: 1, scrollH: 37, clientH: 36 })]), []);
});

test('findings are deduplicated (a hundred identical rows give one finding) and ordered must first', () => {
  const rows = Array.from({ length: 100 }, () => el({ sel: 'div.row', sbV: 15, scrollH: 301, clientH: 300 }));
  const tabs = el({ role: 'tablist', sel: 'div.tabs', sbH: 21, scrollW: 900, clientW: 500 });
  const f = classifyScrollbars([tabs, ...rows]);
  assert.equal(f.length, 2);
  assert.deepEqual(f.map((x) => x.sev), ['must', 'should']);
});

test('thresholds can be pinned: a project may accept a 3px overflow as accidental, or ask for a wider bar', () => {
  const d = el({ sbV: 15, scrollH: 303, clientH: 300 });
  assert.deepEqual(classifyScrollbars([d]), []);
  assert.deepEqual(classifyScrollbars([d], { accidental: 3 }).map((x) => x.sev), ['must']);
  assert.deepEqual(classifyScrollbars([el({ sbV: 8, scrollH: 301, clientH: 300 })], { minBar: 10 }), []);
});

// ---- the page-side collector, against a stubbed DOM (arithmetic and flags only: the real proof is a run against a browser)
function stubDom(elements, cssOf) {
  const makeEl = (e) => ({
    tagName: e.tag.toUpperCase(), id: e.id ?? '', className: e.cls ?? '', offsetWidth: e.offW, offsetHeight: e.offH, clientWidth: e.cliW, clientHeight: e.cliH,
    scrollWidth: e.scrW, scrollHeight: e.scrH, _e: e,
    getAttribute: (k) => (k === 'role' ? e.role ?? null : null),
    getBoundingClientRect: () => ({ width: e.hidden ? 0 : e.offW, height: e.hidden ? 0 : e.offH }),
    closest: (s) => (/details/.test(s) ? null : /dialog|modal/.test(s) ? (e.inDialog ? {} : null) : /data-scroll-region/.test(s) ? (e.region ? {} : null) : null),
    matches: (s) => s.split(',').includes(e.tag),
  });
  const list = elements.map(makeEl);
  return {
    document: { querySelectorAll: () => list },
    getComputedStyle: (node) => ({ display: node._e.display ?? 'block', visibility: 'visible', ...cssOf(node._e) }),
  };
}
const runCollector = (elements, cssOf) => {
  const dom = stubDom(elements, cssOf);
  return new Function('document', 'getComputedStyle', `${m[1]}\nreturn scrollbarDescriptors({ mainSelectors: ['main'] })`)(dom.document, dom.getComputedStyle);
};

test('collector: width / height of a scrollbar are the offset size minus the client size minus the borders; only scrolling elements are described', () => {
  const tabs = { tag: 'div', cls: 'ad-tabs', role: 'tablist', offW: 1131, offH: 36, cliW: 1110, cliH: 36, scrW: 1110, scrH: 37 };
  const boxed = { tag: 'div', cls: 'card', offW: 300, offH: 200, cliW: 298, cliH: 198, scrW: 298, scrH: 198 }; // 1px borders: no scrollbar
  const plain = { tag: 'p', offW: 100, offH: 20, cliW: 100, cliH: 20, scrW: 100, scrH: 20 };
  const out = runCollector([tabs, boxed, plain], (e) => (e.tag === 'p' ? { overflowX: 'visible', overflowY: 'visible' } : { overflowX: 'auto', overflowY: 'auto', borderLeftWidth: e.cls === 'card' ? '1px' : '0px', borderRightWidth: e.cls === 'card' ? '1px' : '0px', borderTopWidth: e.cls === 'card' ? '1px' : '0px', borderBottomWidth: e.cls === 'card' ? '1px' : '0px' }));
  assert.equal(out.length, 2);
  assert.deepEqual({ sel: out[0].sel, role: out[0].role, sbV: out[0].sbV, sbH: out[0].sbH, scrollH: out[0].scrollH, clientH: out[0].clientH }, { sel: 'div.ad-tabs', role: 'tablist', sbV: 21, sbH: 0, scrollH: 37, clientH: 36 });
  assert.deepEqual({ sbV: out[1].sbV, sbH: out[1].sbH }, { sbV: 0, sbH: 0 });
});

test('collector: hidden and zero-size elements are skipped; main, dialog and data-scroll-region are flagged for the classifier', () => {
  const base = { offW: 400, offH: 300, cliW: 385, cliH: 300, scrW: 385, scrH: 300 };
  const out = runCollector(
    [{ tag: 'main', ...base }, { tag: 'div', cls: 'in-dialog', inDialog: true, ...base }, { tag: 'div', cls: 'region', region: true, ...base }, { tag: 'div', cls: 'gone', display: 'none', ...base }, { tag: 'div', cls: 'zero', hidden: true, ...base }],
    () => ({ overflowX: 'visible', overflowY: 'auto', borderLeftWidth: '0px', borderRightWidth: '0px', borderTopWidth: '0px', borderBottomWidth: '0px' }),
  );
  assert.deepEqual(out.map((d) => [d.sel, d.main, d.dialog, d.optOut]), [['main', true, false, false], ['div.in-dialog', false, true, false], ['div.region', false, false, true]]);
  assert.equal(out[0].sbV, 15);
  assert.deepEqual(classifyScrollbars(out), []);
});
