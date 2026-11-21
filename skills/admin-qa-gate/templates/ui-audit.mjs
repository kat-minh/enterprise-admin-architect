/**
 * Automated UI audit of an admin: every page x every role x phone / tablet / desktop x light / dark.
 * COPY this file into the project under test (e.g. tools/ui-audit.mjs), fill in the CONFIG block, run it.
 *
 *   npm i -D playwright axe-core        (in the project under test; this is not a dependency of the skill)
 *   node tools/ui-audit.mjs [role ...]
 *
 * What it checks (what a person sees at a glance, which a data or permission test never looks at):
 *   - the document itself scrolls horizontally, or vertically while a region inside it also scrolls (a second scrollbar; an app whose
 *     whole page scrolls and has no inner scroll region is fine)
 *   - text clipped without an ellipsis, content spilling out of its card / panel / dialog
 *   - touch targets under 28 px at phone width
 *   - axe-core (WCAG 2.1 A + AA + best practice): contrast, accessible names and labels, landmarks, headings, ARIA,
 *     scrollable regions that keyboard users cannot reach
 *   - NATIVE SCROLLBARS (SCROLL-1, SCROLL-2): the browser is launched with its scrollbars visible, as on a desktop OS (a headless browser hides them by
 *     default, so no scrollbar was ever rendered or measured). An element that shows one for a 1-2px accidental overflow is a must; a tab bar, toolbar,
 *     navigation or menu bar that shows one is a should (hide the scrollbar and fade the edge, or collapse the items). Phone-width states (under 600px)
 *     hide scrollbars, as touch devices overlay them, and are not checked. Mark a scroll area whose scrollbar is intended with data-scroll-region.
 *   - console errors, uncaught exceptions, failed API calls
 *   - DESIGN CONSISTENCY (M1-M12, CONFIG.design): font families, type sizes and weights, radii, shadows, hue count, gradients and other decoration, spacing grid,
 *     numeric columns, icons and emoji, card nesting and identical stat tiles, placeholder text and raw keys, input boundaries. They prove consistency, not
 *     good design: score the human rubric of admin-design-system/references/anti-slop-design.md §5 as well. Thresholds are uncalibrated starting values.
 *   - OVERLAYS (CONFIG.overlays): command menu, bell and filter popovers, dialogs, drawers are opened and audited like pages, plus their
 *     geometry (inside the viewport, not squeezed). Pages alone miss them: a popover whose class name collided with older CSS was
 *     squeezed into columns while every page-level check passed.
 * It writes a full-height screenshot per state and a JSON report, and prints findings grouped by kind.
 *
 * The audit does not replace LOOKING. After it is clean, open the screenshots (all pages, phone and desktop, both themes)
 * and write down what a picky owner would say: hierarchy, density, empty areas, wording, a number that means nothing.
 * Record the review notes in qa-report.md. Findings of kind "must" block the gate (quality-gates.md UX-13).
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

// ------------------------------------------------------------------------------------------------ CONFIG
const CONFIG = {
  appUrl: 'http://localhost:5174',
  apiUrl: 'http://localhost:7863', // only used to report failed API calls
  outDir: 'audit-output',
  /** true launches the browser as a headless run does by default: scrollbars hidden, so no scrollbar can be seen or checked. Leave false. */
  hideScrollbars: false,
  /** the app's own scroll container(s) (the area below the header): a scrollbar there is by design. The document itself is never checked. */
  mainScrollSelectors: ['main'],
  // one entry per role: the account to sign in with and the pages that role can open. ':name' parts are filled from `ids`.
  roles: {
    admin: { account: 'admin@example.com', pages: ['/dashboard', '/users', '/users/:user', '/settings'] },
    // support: { account: 'support@example.com', pages: ['/dashboard', '/users'] },
  },
  /** sign in `page` as `account`; resolve when the app shell is visible */
  async login(page, account) {
    await page.goto(`${CONFIG.appUrl}/login`)
    await page.getByLabel('Email').fill(account)
    await page.getByLabel(/^(password|mật khẩu)/i).first().fill(process.env.AUDIT_PASSWORD ?? '')
    await page.getByRole('button', { name: /sign in|đăng nhập/i }).click()
    await page.locator('nav, aside').first().waitFor({ timeout: 15000 })
  },
  /** values for the ':name' parts of the page paths, e.g. the id of the first user. Return {} when you have none. */
  async ids(page, roleName) {
    return {}
  },
  /** true when the page has finished loading its data (no skeletons / spinners) */
  loaded: () => document.querySelectorAll('[aria-busy="true"], .skeleton, .ad-skel').length === 0,
  /** elements whose clipping is intentional (screen-reader-only text) */
  ignoreClipped: '.sr-only, .ad-sr, [class*="sr-only"], [class*="visually-hidden"]',
  /**
   * Overlays to audit. `route` is the page to load, `when(role)` says which roles have the overlay, `open(page)` opens it and resolves when it is
   * visible, `selector` is the overlay itself, `minWidth` the narrowest it may be before it counts as squeezed, `skip(state)` (optional) leaves out
   * the states where the overlay does not exist (a control hidden on phones). Add one entry per overlay.
   */
  overlays: [
    // {
    //   name: 'command-menu', route: '/dashboard', when: () => true, selector: '[role="dialog"]', minWidth: 300,
    //   async open(page) { await page.keyboard.press('Control+K'); await page.getByRole('combobox').waitFor() },
    // },
  ],
  /**
   * Design-consistency checks (M1-M12). `fonts`: the families design-system.md allows (empty = do not check the list); `thresholds`: overrides of DESIGN_DEFAULTS
   * below, pinned after a first run on two admins the owner likes; `off`: metric ids to leave out, each with a reason in qa-report.md. `enabled: false` skips all.
   */
  design: { enabled: true, fonts: [], thresholds: {}, off: [] },
  states: [
    { w: 1440, h: 900, scheme: 'light' },
    { w: 1440, h: 900, scheme: 'dark' },
    { w: 1024, h: 768, scheme: 'light' },
    { w: 390, h: 844, scheme: 'light' },
    { w: 390, h: 844, scheme: 'dark' },
  ],
}
// ------------------------------------------------------------------------------------------------ end of CONFIG
CONFIG.design = { enabled: true, fonts: [], thresholds: {}, off: [], ...CONFIG.design } // a CONFIG filled from an older copy of this template has no `design` key
CONFIG.hideScrollbars ??= false // nor the two scrollbar keys
CONFIG.mainScrollSelectors ??= ['main']

const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('playwright')
const AXE = require.resolve('axe-core/axe.min.js')
fs.mkdirSync(CONFIG.outDir, { recursive: true })

// runs in the page: Playwright hands it exactly one argument, so the two values travel as an object
function measure({ isPhone, ignoreSelector }) {
  const sel = (el) => {
    const id = el.id ? `#${el.id}` : ''
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
    return `${el.tagName.toLowerCase()}${id}${cls}`
  }
  const visible = (el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false
    // the content of a closed <details> has a layout box but nobody sees it
    if (el.closest('details:not([open])') && !el.closest('summary')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const doc = document.scrollingElement
  const out = { docV: doc.scrollHeight - doc.clientHeight, docH: doc.scrollWidth - doc.clientWidth, innerV: 0, clipped: [], spill: [], small: [] }
  // a "second scrollbar" is the document scrolling WHILE a large region inside it scrolls too; a page that scrolls as a whole is a design, not a defect
  for (const el of document.querySelectorAll('body *')) {
    // the list inside an open dialog, menu or listbox scrolls on its own by design: it is not a second page scrollbar
    if (el === document.body || !visible(el) || el.closest('[role="dialog"], [role="alertdialog"], [aria-modal="true"], [role="menu"], [role="listbox"]')) continue
    const cs = getComputedStyle(el)
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.clientHeight >= 200 && el.scrollHeight > el.clientHeight + 1) out.innerV++
  }
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') || (ignoreSelector && el.closest(ignoreSelector)) || !visible(el)) continue
    const cs = getComputedStyle(el)
    if (el.children.length === 0 && el.textContent.trim() && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis') {
      out.clipped.push(`${sel(el)} "${el.textContent.trim().slice(0, 40)}" (${el.scrollWidth}>${el.clientWidth})`)
    }
  }
  // content that leaves its own box: any element that looks like a card / panel / dialog (border or shadow, overflow visible)
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || (ignoreSelector && el.closest(ignoreSelector))) continue
    const cs = getComputedStyle(el)
    if (cs.overflowX !== 'visible' || (cs.boxShadow === 'none' && cs.borderTopWidth === '0px' && cs.borderLeftWidth === '0px')) continue
    const r = el.getBoundingClientRect()
    if (r.width < 80) continue
    for (const c of el.querySelectorAll('*')) {
      if (c.closest('svg') || !visible(c) || (ignoreSelector && c.closest(ignoreSelector))) continue
      let clipped = false
      for (let a = c.parentElement; a && a !== el; a = a.parentElement) if (getComputedStyle(a).overflowX !== 'visible') { clipped = true; break }
      if (clipped) continue
      const cr = c.getBoundingClientRect()
      if (cr.right > r.right + 2 || cr.left < r.left - 2) {
        out.spill.push(`${sel(c)} leaves ${sel(el)} by ${Math.round(Math.max(cr.right - r.right, r.left - cr.left))}px`)
        break
      }
    }
  }
  if (isPhone) {
    for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem], summary')) {
      if (!visible(el) || (ignoreSelector && el.closest(ignoreSelector))) continue
      // a link inside a sentence is exempt (WCAG 2.5.8, inline exception): inline box, and the parent has other text of its own
      if (el.matches('a') && getComputedStyle(el).display === 'inline' && el.parentElement && (el.parentElement.textContent || '').replace(el.textContent || '', '').trim().length >= 12) continue
      const r = el.getBoundingClientRect()
      if (r.height < 28 || r.width < 28) out.small.push(`${sel(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"`)
    }
  }
  return out
}

// <scrollbars>
// ------------------------------------------------------------------------------------------------ native scrollbars (SCROLL-1, SCROLL-2)
/**
 * Runs in the page; Playwright hands it exactly one argument. Describes every displayed element that can scroll, with the width / height its native
 * scrollbars take (0 when they overlay or are hidden). The document itself (html, body) is not described: its scrollbar is the page's.
 */
function scrollbarDescriptors({ mainSelectors }) {
  const out = []
  const px = (v) => parseFloat(v) || 0
  const main = (mainSelectors || []).join(',')
  for (const el of document.querySelectorAll('body *')) {
    if (out.length >= 300) break
    const cs = getComputedStyle(el)
    const scrollsX = cs.overflowX === 'auto' || cs.overflowX === 'scroll'
    const scrollsY = cs.overflowY === 'auto' || cs.overflowY === 'scroll'
    if (!scrollsX && !scrollsY) continue
    if (cs.display === 'none' || cs.visibility === 'hidden' || (el.closest('details:not([open])') && !el.closest('summary'))) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const id = el.id ? `#${el.id}` : ''
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
    let isMain = false
    try { isMain = !!main && el.matches(main) } catch { /* a selector this browser cannot parse: nothing is exempt */ }
    out.push({
      tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', sel: `${el.tagName.toLowerCase()}${id}${cls}`,
      overflowX: cs.overflowX, overflowY: cs.overflowY,
      sbV: Math.round(el.offsetWidth - el.clientWidth - px(cs.borderLeftWidth) - px(cs.borderRightWidth)), // width a vertical scrollbar takes
      sbH: Math.round(el.offsetHeight - el.clientHeight - px(cs.borderTopWidth) - px(cs.borderBottomWidth)), // height a horizontal scrollbar takes
      scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight,
      main: isMain,
      dialog: !!el.closest('[role="dialog"], [role="alertdialog"], [aria-modal="true"]'),
      optOut: !!el.closest('[data-scroll-region]'),
    })
  }
  return out
}

const SCROLL_ROLES = new Set(['tablist', 'toolbar', 'navigation', 'menubar'])
const SCROLL_EXEMPT_TAGS = new Set(['textarea', 'select', 'pre', 'code']) // scroll by nature

/**
 * Pure: turns the descriptors into findings [{ sev, what }]. Tested without a browser.
 *   SCROLL-1 (must)   a native scrollbar shown for an overflow of `accidental` px or less on that axis: something pokes out by a pixel or two (an underline with a
 *                     negative offset, a border, a focus ring) and the overflow setting turns it into a scrollbar. Also an always-on scrollbar with nothing to scroll.
 *   SCROLL-2 (should) a native scrollbar on a tab bar, toolbar, navigation or menu bar: an overflowing control strip scrolls without it (hidden scrollbar plus an edge
 *                     fade), or collapses its items into a menu.
 * Never flagged: the configured main scroll container, anything inside a dialog, anything marked data-scroll-region, a textarea, select, pre or code,
 * and elements whose scrollbar overlays or is hidden (the bar takes no room: `minBar` px or less).
 */
function classifyScrollbars(list, over = {}) {
  const th = { minBar: 2, accidental: 2, ...over }
  const found = new Map()
  for (const d of list || []) {
    if (d.main || d.dialog || d.optOut || SCROLL_EXEMPT_TAGS.has(d.tag)) continue
    const role = d.role || (d.tag === 'nav' ? 'navigation' : '')
    const label = role ? `${d.sel} [role=${role}]` : d.sel
    for (const a of [{ axis: 'vertical', bar: d.sbV, range: d.scrollH - d.clientH }, { axis: 'horizontal', bar: d.sbH, range: d.scrollW - d.clientW }]) {
      if (!(a.bar >= th.minBar)) continue
      if (a.range <= th.accidental) {
        const what = `SCROLL-1 ${label} shows a native ${a.axis} scrollbar for a ${Math.max(a.range, 0)}px overflow: something pokes out by a pixel or two (an underline, a border, a focus ring) or the overflow is always on; remove the overflow, or mark the element data-scroll-region if the scrollbar is intended`
        found.set(what, { sev: 'must', what })
      } else if (SCROLL_ROLES.has(role)) {
        const what = `SCROLL-2 ${label} shows a native ${a.axis} scrollbar (it overflows by ${a.range}px): hide the scrollbar and fade the edge, or collapse the items into a menu; mark it data-scroll-region if the scrollbar is intended`
        found.set(what, { sev: 'should', what })
      }
    }
  }
  return [...found.values()].sort((x, y) => (x.sev === 'must' ? 0 : 1) - (y.sev === 'must' ? 0 : 1))
}
// </scrollbars>

// <design-metrics>
// ------------------------------------------------------------------------------------------------ design consistency (M1-M12)
// Counts the things that make an admin look generated or inconsistent (anti-slop-design.md §2, §4). It proves CONSISTENCY, not good design:
// a clean run still needs the human rubric. Thresholds are starting values that nobody calibrated on real admins: pin yours in CONFIG.design.thresholds.

/** runs in the page; Playwright hands it exactly one argument; everything it needs is defined inside it */
function designMetrics({ ignoreSelector }) {
  const S = (el) => getComputedStyle(el)
  const sel = (el) => {
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}`
  }
  const visible = (el) => {
    const cs = S(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false
    if (el.closest('details:not([open])') && !el.closest('summary')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const cv = document.createElement('canvas')
  cv.width = cv.height = 1
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  const memo = new Map()
  const rgba = (c) => {
    if (memo.has(c)) return memo.get(c)
    let v = [0, 0, 0, 0]
    try {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = c
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      v = [d[0], d[1], d[2], d[3] / 255]
    } catch { /* an unparseable colour counts as transparent */ }
    memo.set(c, v)
    return v
  }
  const hsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
    if (!d) return { h: 0, s: 0, l }
    const s = d / (1 - Math.abs(2 * l - 1))
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
    return { h, s, l }
  }
  // a colour counts as a HUE only when it is clearly coloured: tinted neutrals (warm paper, soft status tints) have low chroma
  const chroma = (c) => (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])) / 255
  const hueBin = (c) => String(Math.floor(((hsl(c).h + 15) % 360) / 30) * 30)
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const bgOf = (el) => {
    for (let a = el; a; a = a.parentElement) { const c = rgba(S(a).backgroundColor); if (c[3] >= 0.99) return c }
    return [255, 255, 255, 1]
  }
  const inc = (m, k, n = 1) => { m[k] = (m[k] || 0) + n }
  const push = (a, v, max = 4) => { if (a.length < max) a.push(v) }
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
  const inOverlay = (el) => !!el.closest('[role=dialog],[role=alertdialog],[role=menu],[role=listbox],[role=tooltip],[popover],dialog,[data-overlay]')
  // [data-design-sample]: a specimen of a design token (a colour swatch, a shadow or radius preview, a font sample, an embedded preview frame). It is DISPLAYING a
  // style, not using one, so the metrics skip it; everything else on the page is measured
  const notIgnored = (el) => !(ignoreSelector && el.closest(ignoreSelector)) && !el.closest('svg, script, style, [data-chart], canvas, [data-design-sample]')

  const o = {
    texts: 0, fonts: {}, mono: {}, sizes: {}, weights: {}, funcMin: 999, funcMinAt: '', h1: 0, body: px(S(document.body).fontSize), kickers: [], monoChars: 0, chars: 0,
    radii: {}, bigRadius: [], shadows: {}, inflowShadow: [], glow: [],
    gradients: 0, gradientHue: [], gradText: [], blur: [], stripes: [], infinite: [], transAll: 0, bounce: 0,
    hues: {}, statusColors: {},
    spacing: {}, spaceTotal: 0, spaceOff: 0,
    numAlignBad: [], ellipsisNoTitle: [], hiddenRowActions: 0,
    iconSizes: {}, iconStrokes: {}, iconOutline: 0, iconFilled: 0, emoji: [], iconTiles: [],
    cardDepth: 0, cardDepthAt: '', tileRows: 0, tileMax: 0, centred: 0, centredTd: 0, firstTableTop: -1,
    placeholders: [], greeting: [], raw: [], generic: [], emptyNoAction: [], deltas: {},
    inputs: 0, inputBad: [],
  }

  // ---- text-based: M1 fonts, M2 type, M5 colour hues
  const monoRe = /mono|consolas|menlo|courier|ui-monospace/i
  const textEls = []
  for (const el of document.body.querySelectorAll('*')) {
    if (!notIgnored(el) || !visible(el)) continue
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    textEls.push(el)
    const cs = S(el)
    const fam = cs.fontFamily.split(',')[0].trim().replace(/["']/g, '')
    const mono = monoRe.test(cs.fontFamily.split(',')[0]) || /^monospace$/i.test(fam)
    const size = Math.round(px(cs.fontSize) * 2) / 2
    const len = el.textContent.trim().length
    o.texts++
    o.chars += len
    inc(mono ? o.mono : o.fonts, fam)
    inc(o.sizes, size)
    inc(o.weights, cs.fontWeight)
    if (mono) { if (!el.closest('code, pre, kbd, [data-id]')) o.monoChars += len }
    if (el.matches('button, a, label, th, td, input') && size < o.funcMin) { o.funcMin = size; o.funcMinAt = `${sel(el)} ${size}px "${el.textContent.trim().slice(0, 20)}"` }
    if (el.matches('h1') && !o.h1) o.h1 = px(cs.fontSize)
    const next = el.nextElementSibling
    const caps = cs.textTransform === 'uppercase' || (len >= 3 && /[A-ZÀ-Ỹ]/.test(el.textContent) && el.textContent === el.textContent.toUpperCase())
    if (caps && !el.matches('th, label') && px(cs.fontSize) <= 12 && px(cs.letterSpacing) >= px(cs.fontSize) * 0.05 && next && /^H[1-3]$/.test(next.tagName)) push(o.kickers, `${sel(el)} "${el.textContent.trim().slice(0, 24)}"`)
    const c = rgba(cs.color)
    // avatars and charts colour people and series on purpose: they are identity, not semantic hue (anti-slop-design.md M5)
    if (c[3] >= 0.5 && chroma(c) >= 0.15 && !el.closest("[class*=avatar], [data-avatar]")) inc(o.hues, hueBin(c))
    // M3/M5: centred text outside controls
    if (cs.textAlign === 'center' && !el.closest('button, [role=tab], [class*=badge], [class*=chip], [class*=pill], [class*=empty], [class*=spinner], dialog, [role=dialog], th')) { o.centred++; if (el.matches('td') || el.closest('td')) o.centredTd++ }
  }

  // ---- box-based: M3 radius, M4 elevation, M5 backgrounds, M6 decoration, M7 spacing, M9 tiles, M10 cards
  const cards = []
  const grid = []
  const main = document.querySelector('main') || document.body
  const vw = innerWidth, vh = innerHeight
  for (const el of document.body.querySelectorAll('*')) {
    if (!notIgnored(el) || !visible(el)) continue
    const cs = S(el)
    const r = el.getBoundingClientRect()
    const bg = rgba(cs.backgroundColor)
    const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px)
    const radius = Math.max(...[cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((v) => (String(v).includes('%') ? 9999 : px(v))))
    const overlay = inOverlay(el)
    const hasBox = bg[3] > 0 || bw.some((w) => w > 0)
    if (hasBox && radius > 0 && radius < Math.min(r.width, r.height) / 2 - 0.5) {
      inc(o.radii, String(Math.round(radius)))
      if (radius > 16 && r.width >= 200) push(o.bigRadius, `${sel(el)} ${Math.round(radius)}px`)
    }
    if (bg[3] >= 0.5 && !el.matches('html, body') && r.width * r.height > 400 && chroma(bg) >= 0.15 && !el.closest("[class*=avatar], [data-avatar]")) inc(o.hues, hueBin(bg))
    // M4
    if (cs.boxShadow !== 'none') {
      inc(o.shadows, cs.boxShadow.replace(/\s+/g, ' ').slice(0, 80))
      if (!overlay) {
        const col = (cs.boxShadow.match(/rgba?\([^)]*\)|color\([^)]*\)/) || [])[0]
        const nums = cs.boxShadow.replace(/rgba?\([^)]*\)|color\([^)]*\)/g, '').match(/-?\d+(\.\d+)?/g)?.map(Number) || []
        const [x = 0, y = 0, blur = 0] = nums
        // a card or panel lifted by a shadow is the tell; a ring (offset 0, blur 0: a selection outline) or the thumb of a segmented control is not
        const ring = x === 0 && y === 0 && blur === 0
        if (!(cs.position === 'sticky' || cs.position === 'fixed') && r.width >= 120 && r.height >= 48 && !ring) push(o.inflowShadow, sel(el), 6)
        const cc = col ? rgba(col) : [0, 0, 0, 0]
        const shadowChroma = (Math.max(cc[0], cc[1], cc[2]) - Math.min(cc[0], cc[1], cc[2])) / 255
        // a coloured shadow with no blur is a ring, not a glow
        if ((shadowChroma > 0.1 && cc[3] > 0.05 && blur > 0) || (x === 0 && y === 0 && blur >= 8 && cc[3] > 0.05 && shadowChroma > 0.05)) push(o.glow, `${sel(el)} ${cs.boxShadow.slice(0, 50)}`)
      }
    }
    // M6
    const bi = cs.backgroundImage
    if (bi.includes('gradient(') && !el.closest('[class*=skel], [aria-busy=true]')) {
      o.gradients++
      const hs = [...bi.matchAll(/rgba?\([^)]*\)/g)].map((m) => rgba(m[0])).filter((c) => c[3] > 0.2).map(hsl).filter((h) => h.s > 0.2).map((h) => h.h)
      if (hs.some((h) => (h >= 250 && h <= 320) || (h >= 170 && h <= 200))) push(o.gradientHue, sel(el))
    }
    if ((cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') && (rgba(cs.webkitTextFillColor)[3] === 0 || rgba(cs.color)[3] === 0)) push(o.gradText, sel(el))
    if (((cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none')) && !overlay && !(r.width >= vw * 0.9 && r.height >= vh * 0.9)) push(o.blur, sel(el))
    const wide = bw.filter((w) => w >= 3).length
    if (wide === 1 && bw.filter((w) => w === 0).length === 3 && radius >= 4 && r.width >= 120 && r.height >= 32) push(o.stripes, sel(el))
    if (cs.animationName !== 'none' && cs.animationIterationCount.includes('infinite') && !/spin|loader|skel|progress|busy|load/i.test(`${el.className} ${cs.animationName}`)) push(o.infinite, `${sel(el)} ${cs.animationName}`)
    if (cs.transitionProperty === 'all' && cs.transitionDuration !== '0s') o.transAll++
    for (const tf of [cs.transitionTimingFunction, cs.animationTimingFunction]) {
      for (const m of tf.matchAll(/cubic-bezier\(([^)]*)\)/g)) { const p = m[1].split(',').map(Number); if (p[1] > 1 || p[1] < 0 || p[3] > 1 || p[3] < 0) { o.bounce++; break } }
    }
    // M10 cards
    const cardLike = hasBox && radius > 0 && r.width >= 120 && r.height >= 48 && !el.matches('table, thead, tbody, tr, td, th, input, button, select, textarea, nav, aside, header, dialog, a') && !overlay &&
      (bw.some((w) => w > 0) || cs.boxShadow !== 'none' || (el.parentElement && rgba(S(el.parentElement).backgroundColor).join() !== bg.join()))
    if (cardLike) cards.push(el)
    // M9 icon tile
    if (r.width >= 28 && r.width <= 64 && Math.abs(r.width - r.height) <= 2 && radius >= 6 && bg[3] > 0 && !overlay && !el.closest('button, a, [role=tab], [role=menuitem], nav')) {
      const kid = el.firstElementChild
      const only = el.childElementCount === 1 && kid && kid.tagName.toLowerCase() === 'svg'
      const emoji = el.childElementCount === 0 && /^\p{Extended_Pictographic}$/u.test(el.textContent.trim())
      const nx = el.nextElementSibling || el.parentElement?.nextElementSibling
      if ((only || emoji) && nx && /^(H[1-6]|STRONG|B)$/.test(nx.tagName)) push(o.iconTiles, sel(el), 8)
    }
    // M7 spacing inside the working area
    if (el.closest('main, aside, header') && o.spaceTotal < 4000 && !el.matches('svg *')) {
      const vals = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft, cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft]
      if (/flex|grid/.test(cs.display)) vals.push(cs.rowGap, cs.columnGap)
      for (const v of vals) {
        const n = parseFloat(v)
        if (!Number.isFinite(n) || n <= 0 || n > 64 || /%|auto|normal/.test(v)) continue
        const k = Math.round(n)
        inc(o.spacing, String(k))
        o.spaceTotal++
        if (!(k % 4 === 0 || k === 1 || k === 2 || k === 6)) o.spaceOff++
      }
    }
  }

  // ---- M10 depth and tile rows
  for (const el of cards) {
    let d = 1
    for (let a = el.parentElement; a && a !== main; a = a.parentElement) if (cards.includes(a)) d++
    if (d > o.cardDepth) { o.cardDepth = d; o.cardDepthAt = sel(el) }
  }
  const cardSet = new Set(cards)
  const parents = new Set(cards.map((c) => c.parentElement).filter(Boolean))
  for (const p of parents) {
    const groups = {}
    for (const k of p.children) if (cardSet.has(k)) { const r = k.getBoundingClientRect(); (groups[`${Math.round(r.width / 3)}x${Math.round(r.height / 3)}`] ||= []).push(k) }
    for (const g of Object.values(groups)) {
      if (g.length < 3) continue
      const stat = g.filter((k) => [...k.querySelectorAll('*')].some((n) => /\d/.test(n.textContent) && n.children.length === 0 && px(S(n).fontSize) >= 24))
      if (stat.length >= 3) { o.tileRows++; o.tileMax = Math.max(o.tileMax, stat.length) }
    }
  }

  // ---- M8 tables
  for (const t of document.querySelectorAll('table, [role=grid]')) {
    if (!visible(t) || !notIgnored(t)) continue
    const rows = [...t.querySelectorAll('tbody tr, [role=row]')].filter((r) => r.querySelector('td, [role=gridcell]'))
    if (rows.length >= 8 && o.firstTableTop < 0) o.firstTableTop = Math.round(t.getBoundingClientRect().top + scrollY)
    if (rows.length < 5) continue
    const cols = Math.max(...rows.map((r) => r.querySelectorAll('td, [role=gridcell]').length))
    for (let c = 0; c < cols; c++) {
      const cells = rows.map((r) => r.querySelectorAll('td, [role=gridcell]')[c]).filter(Boolean)
      const num = cells.filter((x) => /^[\s\d.,%+\-−$€£₫đ]+$/.test(x.textContent) && /\d/.test(x.textContent))
      if (num.length >= cells.length * 0.8 && num.length >= 4) {
        const cs = S(num[0])
        if (cs.display !== 'table-cell') continue // a table drawn as stacked cards on a phone has no columns to align
        if (!/^(right|end)$/.test(cs.textAlign) || !cs.fontVariantNumeric.includes('tabular-nums')) push(o.numAlignBad, `column ${c + 1} of ${sel(t)}: align ${cs.textAlign}, ${cs.fontVariantNumeric}`)
      }
    }
    for (const x of t.querySelectorAll('button, a[href], [role=button]')) if (Number(S(x).opacity) < 0.05 && !x.disabled) o.hiddenRowActions++
  }
  for (const el of document.body.querySelectorAll('*')) {
    if (!notIgnored(el) || !visible(el)) continue
    const cs = S(el)
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && !el.closest('[title], [aria-label], [aria-describedby]') && !el.hasAttribute('data-tooltip')) push(o.ellipsisNoTitle, `${sel(el)} "${el.textContent.trim().slice(0, 24)}"`)
  }

  // ---- M9 icons and emoji
  for (const svg of document.querySelectorAll('button svg, a svg, [role=menuitem] svg, [role=tab] svg, nav svg, th svg, summary svg')) {
    if (!notIgnored(svg.parentElement || svg) || !visible(svg)) continue
    const r = svg.getBoundingClientRect()
    if (r.width > 40) continue
    const cs = S(svg)
    inc(o.iconSizes, String(Math.round(r.width)))
    if (cs.fill === 'none') { inc(o.iconStrokes, String(Math.round(px(cs.strokeWidth) * 2) / 2)); o.iconOutline++ } else o.iconFilled++
  }
  for (const el of document.querySelectorAll('nav *, button, th, [role=tab], h1, h2, h3, [class*=badge], [class*=chip], [class*=empty] *')) {
    if (!visible(el) || el.children.length > 0 && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('')
    if (/\p{Extended_Pictographic}/u.test(own) && !/^[\s©®™]+$/.test(own)) push(o.emoji, `${sel(el)} "${own.trim().slice(0, 12)}"`)
  }

  // ---- M5 status colours: one label, one colour
  for (const el of document.querySelectorAll('[class*=badge], [class*=chip], [class*=status], [class*=pill], [role=status]')) {
    if (!visible(el) || !notIgnored(el) || el.children.length > 2) continue
    const label = el.textContent.trim().toLowerCase()
    if (!label || label.length > 24) continue
    const c = rgba(S(el).backgroundColor).slice(0, 3).join(',')
    ;(o.statusColors[label] ||= {})[c] = 1
  }

  // ---- M11 content honesty
  const body = document.body.innerText || ''
  const ph = body.match(/lorem ipsum|dolor sit amet|john doe|jane doe|foo bar|test user|\bTODO\b|\bTBD\b/i)
  if (ph) push(o.placeholders, ph[0])
  for (const el of document.querySelectorAll('h1, h2, [class*=greeting], [class*=welcome]')) {
    if (visible(el) && /^(welcome back|hello|hi|chào mừng trở lại|xin chào)\b/i.test(el.textContent.trim())) push(o.greeting, el.textContent.trim().slice(0, 30))
  }
  const rawRe = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$|^[a-z]+(_[a-z0-9]+)+$|^[a-z]+(\.[a-z0-9_-]+){2,}$/
  for (const el of document.querySelectorAll('td, [class*=badge], [class*=chip], [class*=status]')) {
    if (visible(el) && el.children.length === 0 && rawRe.test(el.textContent.trim())) push(o.raw, el.textContent.trim().slice(0, 30))
  }
  for (const el of document.querySelectorAll('button, [role=button]')) {
    if (visible(el) && /^(ok|okay|submit|yes|no|click here|continue)$/i.test(el.textContent.trim())) push(o.generic, el.textContent.trim())
  }
  if (/something went wrong/i.test(body)) push(o.generic, 'Something went wrong')
  for (const el of document.querySelectorAll('[data-empty], [class*=empty]')) {
    if (visible(el) && el.textContent.trim() && !el.querySelector('a, button')) push(o.emptyNoAction, sel(el))
  }
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length === 0 && visible(el)) { const t = el.textContent.trim(); if (/^[▲▼↑↓+\-−]\s*\d+([.,]\d+)?\s*%$/.test(t)) inc(o.deltas, t) }
  }

  // ---- M12 boundaries
  for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file]):not([type=submit]):not([type=button]), select, textarea, [role=combobox]')) {
    if (!visible(el) || !notIgnored(el) || el.getBoundingClientRect().width < 60) continue
    const cs = S(el)
    const own = px(cs.borderTopWidth) > 0 ? rgba(cs.borderTopColor) : rgba(cs.backgroundColor)
    const parent = bgOf(el.parentElement || document.body)
    o.inputs++
    if (own[3] < 0.05 || ratio(own.slice(0, 3), parent) < 3) push(o.inputBad, sel(el))
  }
  return o
}

const DESIGN_DEFAULTS = {
  textFamilies: 2, monoFamilies: 1, sizes: 8, weights: 3, funcMinShould: 12, funcMinMust: 11, titleBody: 1.25, h1Max: 32, monoShare: 0.1,
  radii: 4, hueBins: 5, hueBinsMust: 6, shadows: 3, inflowShadow: 2, onGrid: 0.92, spacingValues: 14,
  iconSizes: 3, iconStrokes: 2, iconTiles: 3, cardDepth: 3, tileMax: 6, centreShare: 0.1, firstTableTop: 405,
}

/** Pure: turns the numbers of one page state ('state') or of all states merged ('app') into findings [{ sev, what }]. Tested without a browser. */
function scoreDesign(d, over = {}, scope = 'state') {
  const th = { ...DESIGN_DEFAULTS, ...over }
  const f = []
  const must = (what) => f.push({ sev: 'must', what })
  const should = (what) => f.push({ sev: 'should', what })
  const keys = (m) => Object.keys(m || {})
  const list = (a) => (a || []).slice(0, 3).join(' | ')
  if (scope === 'app') {
    const fams = keys(d.fonts)
    if (fams.length > th.textFamilies) should(`M1 ${fams.length} text font families across the app (${fams.join(', ')}); the direction allows ${th.textFamilies}`)
    if (keys(d.mono).length > th.monoFamilies) should(`M1 ${keys(d.mono).length} monospace families (${keys(d.mono).join(', ')})`)
    if (th.fonts?.length) for (const fam of fams) if (!th.fonts.some((x) => x.toLowerCase() === fam.toLowerCase())) should(`M1 font "${fam}" is not in the declared design-system fonts (${th.fonts.join(', ')})`)
    if (keys(d.sizes).length > th.sizes) should(`M2 ${keys(d.sizes).length} distinct font sizes across the app (${keys(d.sizes).sort((a, b) => a - b).join(', ')}); a scale has about ${th.sizes}`)
    if (keys(d.weights).length > th.weights) should(`M2 ${keys(d.weights).length} distinct font weights (${keys(d.weights).join(', ')}); use ${th.weights}`)
    if (keys(d.radii).length > th.radii) should(`M3 ${keys(d.radii).length} distinct border radii (${keys(d.radii).sort((a, b) => a - b).join(', ')}); use a 3-step scale`)
    if (keys(d.shadows).length > th.shadows) should(`M4 ${keys(d.shadows).length} distinct box shadows; elevation has about 3 levels`)
    const hueList = keys(d.hues).sort((a, b) => a - b).map((h) => `${h}°`).join(' ')
    if (keys(d.hues).length > th.hueBinsMust) must(`M5 ${keys(d.hues).length} hue families in use (${hueList}); one accent plus four status hues is about ${th.hueBins}`)
    else if (keys(d.hues).length > th.hueBins) should(`M5 ${keys(d.hues).length} hue families in use (${hueList}); one accent plus four status hues is about ${th.hueBins}`)
    if (keys(d.spacing).length > th.spacingValues) should(`M7 ${keys(d.spacing).length} distinct spacing values across the app; a scale has about ${th.spacingValues}`)
    if (keys(d.iconSizes).length > th.iconSizes) should(`M9 ${keys(d.iconSizes).length} icon sizes (${keys(d.iconSizes).join(', ')}); use 2-3`)
    if (keys(d.iconStrokes).length > th.iconStrokes) should(`M9 ${keys(d.iconStrokes).length} icon stroke widths (${keys(d.iconStrokes).join(', ')}); use one`)
    for (const [label, colours] of Object.entries(d.statusColors || {})) if (keys(colours).length > 1) must(`M5 status "${label}" is drawn in ${keys(colours).length} different colours`)
    return f
  }
  // ---- per page state
  if (d.funcMin < th.funcMinMust) must(`M2 functional text under ${th.funcMinMust}px: ${d.funcMinAt}`)
  else if (d.funcMin < th.funcMinShould) should(`M2 functional text under ${th.funcMinShould}px: ${d.funcMinAt}`)
  if (d.h1 && d.body && d.h1 / d.body < th.titleBody) should(`M2 page title ${d.h1}px is under ${th.titleBody}x the body ${d.body}px (flat hierarchy)`)
  if (d.h1 > th.h1Max) should(`M2 page title is ${d.h1}px; admin titles are 20-24px`)
  if (d.kickers.length) should(`M2 small tracked all-caps eyebrow above a heading: ${list(d.kickers)}`)
  if (d.chars > 200 && d.monoChars / d.chars > th.monoShare) should(`M2 monospace is ${Math.round((d.monoChars / d.chars) * 100)}% of the text outside ids and code`)
  if (d.bigRadius.length) should(`M3 radius above 16px on a wide box: ${list(d.bigRadius)}`)
  if (d.inflowShadow.length > th.inflowShadow) should(`M4 ${d.inflowShadow.length} in-flow boxes carry a shadow (borders structure, shadows lift overlays): ${list(d.inflowShadow)}`)
  if (d.glow.length) must(`M4 coloured or glowing shadow: ${list(d.glow)}`)
  if (d.gradText.length) must(`M6 gradient text: ${list(d.gradText)}`)
  if (d.gradientHue.length) must(`M6 purple/blue or cyan gradient: ${list(d.gradientHue)}`)
  else if (d.gradients) should(`M6 ${d.gradients} gradient background(s) outside charts`)
  if (d.blur.length > 1) should(`M6 backdrop blur on ${d.blur.length} non-overlay elements: ${list(d.blur)}`)
  if (d.stripes.length) should(`M6 coloured stripe down one side of a box (side-tab): ${list(d.stripes)}`)
  if (d.infinite.length) should(`M6 infinite decorative animation: ${list(d.infinite)}`)
  if (d.transAll) should(`M6 ${d.transAll} element(s) use "transition: all"`)
  if (d.bounce) should(`M6 ${d.bounce} bounce/overshoot easing(s)`)
  if (d.spaceTotal >= 50 && 1 - d.spaceOff / d.spaceTotal < th.onGrid) should(`M7 only ${Math.round((1 - d.spaceOff / d.spaceTotal) * 100)}% of spacing values sit on the 4px grid (${th.onGrid * 100}% expected)`)
  for (const m of d.numAlignBad.slice(0, 3)) should(`M8 numeric column not right-aligned with tabular figures: ${m}`)
  if (d.ellipsisNoTitle.length) should(`M8 truncated text with no way to read it (no title or label): ${list(d.ellipsisNoTitle)}`)
  if (d.hiddenRowActions) should(`M8 ${d.hiddenRowActions} row action(s) invisible at rest (hover-only; absent on touch)`)
  if (d.emoji.length) must(`M9 emoji used as an icon or label marker: ${list(d.emoji)}`)
  if (d.iconTiles.length >= th.iconTiles) should(`M9 ${d.iconTiles.length} icons in tinted tiles above headings: ${list(d.iconTiles)}`)
  const minority = Math.min(d.iconOutline, d.iconFilled)
  if (d.iconOutline + d.iconFilled >= 10 && minority / (d.iconOutline + d.iconFilled) >= 0.1) should(`M9 icons mix outline (${d.iconOutline}) and filled (${d.iconFilled}) styles`)
  if (d.cardDepth >= th.cardDepth) should(`M10 cards nested ${d.cardDepth} deep (${d.cardDepthAt}); one container level is enough`)
  if (d.tileMax > th.tileMax) must(`M10 a row of ${d.tileMax} identical stat tiles`)
  else if (d.tileRows >= 2) should(`M10 ${d.tileRows} rows of identical stat tiles; one lead figure plus a ranked list reads better`)
  if (d.texts >= 30 && d.centred / d.texts > th.centreShare) should(`M10 ${Math.round((d.centred / d.texts) * 100)}% of the text is centre-aligned`)
  if (d.centredTd) should(`M10 ${d.centredTd} centred table cell(s)`)
  if (d.firstTableTop > th.firstTableTop) should(`M10 the first table starts ${d.firstTableTop}px down: data is below the fold`)
  if (d.placeholders.length) must(`M11 placeholder text on screen: ${list(d.placeholders)}`)
  if (d.greeting.length) should(`M11 greeting banner: ${list(d.greeting)}`)
  if (d.raw.length) must(`M11 raw key or enum shown to a person: ${list(d.raw)}`)
  if (d.generic.length) should(`M11 generic label or error: ${list(d.generic)}`)
  if (d.emptyNoAction.length) should(`M11 empty state with no next action: ${list(d.emptyNoAction)}`)
  const dup = Object.entries(d.deltas || {}).find(([, n]) => n >= 3)
  if (dup) should(`M11 the same delta "${dup[0]}" appears ${dup[1]} times (real data rarely does)`)
  if (d.inputBad.length) should(`M12 ${d.inputBad.length} of ${d.inputs} form control(s) have a boundary under 3:1 against their surface: ${list(d.inputBad)}`)
  return f
}

/** Adds the numbers of one page state into the app-wide accumulator (maps are summed, status colours are unioned). */
function mergeDesign(acc, d) {
  for (const k of ['fonts', 'mono', 'sizes', 'weights', 'radii', 'shadows', 'hues', 'spacing', 'iconSizes', 'iconStrokes']) for (const [key, n] of Object.entries(d[k] || {})) acc[k][key] = (acc[k][key] || 0) + n
  for (const [label, colours] of Object.entries(d.statusColors || {})) Object.assign((acc.statusColors[label] ||= {}), colours)
  return acc
}
const emptyDesign = () => ({ fonts: {}, mono: {}, sizes: {}, weights: {}, radii: {}, shadows: {}, hues: {}, spacing: {}, iconSizes: {}, iconStrokes: {}, statusColors: {} })
// </design-metrics>

const wanted = process.argv.slice(2)
const roleNames = wanted.length ? wanted : Object.keys(CONFIG.roles)
// a headless Chromium is started with --hide-scrollbars by default: drop it, or no scrollbar is ever rendered and none can be measured
const browser = await chromium.launch({ headless: true, ignoreDefaultArgs: CONFIG.hideScrollbars ? [] : ['--hide-scrollbars'] })
const report = []
const appDesign = { light: emptyDesign(), dark: emptyDesign() }
const designOff = (w) => CONFIG.design.off.some((id) => w.startsWith(id + ' '))

for (const roleName of roleNames) {
  const role = CONFIG.roles[roleName]
  if (!role) throw new Error(`unknown role "${roleName}" (configured: ${Object.keys(CONFIG.roles).join(', ')})`)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const problems = { console: [], api: [] }
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && problems.console.push(m.text().slice(0, 160)))
  page.on('pageerror', (e) => problems.console.push('pageerror: ' + e.message.slice(0, 160)))
  page.on('response', (r) => r.url().startsWith(CONFIG.apiUrl) && r.status() >= 400 && problems.api.push(`${r.status()} ${r.request().method()} ${r.url().replace(CONFIG.apiUrl, '').slice(0, 80)}`))
  try {
    await CONFIG.login(page, role.account)
  } catch (e) {
    console.log(`!! ${roleName}: sign-in failed (${e.message.split('\n')[0]}). A login rate limiter may be blocking: restart the server and retry.`)
    await context.close()
    continue
  }
  const ids = await CONFIG.ids(page, roleName)
  const items = [...role.pages.map((route) => ({ route })), ...CONFIG.overlays.filter((o) => o.when(role)).map((o) => ({ route: o.route, overlay: o }))]
  for (const item of items) {
    const route = item.route
    const ov = item.overlay
    const url = route.replace(/:(\w+)/g, (_, k) => ids[k] ?? k)
    for (const st of CONFIG.states) {
      if (ov && ov.skip && ov.skip(st)) continue
      const label = `${roleName} ${route}${ov ? ` [${ov.name}]` : ''} ${st.w}${st.scheme === 'dark' ? ' dark' : ''}`
      problems.console.length = 0
      problems.api.length = 0
      await page.setViewportSize({ width: st.w, height: st.h })
      await page.emulateMedia({ colorScheme: st.scheme })
      await page.goto(CONFIG.appUrl + url)
      try { await page.waitForFunction(CONFIG.loaded, null, { timeout: 15000 }) } catch { /* the page never settled: visible in the screenshot */ }
      await page.waitForTimeout(600)
      // touch devices overlay their scrollbars: a classic one would shrink the 390px layout by 15-21px, which no phone does (and would show false overflow)
      if (st.w < 600 && !CONFIG.hideScrollbars) await page.addStyleTag({ content: '*{scrollbar-width:none !important}' })
      let openError = null
      if (ov) {
        try {
          await ov.open(page)
        } catch (e) {
          openError = String(e.message).split('\n')[0]
        }
        // an overlay still fading in is blended with what is behind it: axe would report contrast failures that are not real.
        // Wait for every animation to finish even when `open` threw (the overlay may be half open)
        await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
        await page.waitForTimeout(150)
      }
      const m = await page.evaluate(measure, { isPhone: st.w < 600, ignoreSelector: CONFIG.ignoreClipped })
      const sb = await page.evaluate(scrollbarDescriptors, { mainSelectors: CONFIG.mainScrollSelectors })
      // design metrics are read on pages only: an overlay on top of a page would count the page twice
      const dm = CONFIG.design.enabled && !ov ? await page.evaluate(designMetrics, { ignoreSelector: CONFIG.ignoreClipped }) : null
      if (dm) mergeDesign(appDesign[st.scheme], dm)
      await page.addScriptTag({ path: AXE })
      const axe = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } })
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, target: v.nodes[0]?.target?.join(' ').slice(0, 90) }))
      })
      let box = null
      if (ov && !openError) box = await page.locator(ov.selector).first().boundingBox()
      // full-height screenshot of a page: grow the viewport to the content so an inner scroll region is fully visible (an overlay is shot as it is on screen)
      if (!ov) {
        const full = await page.evaluate(() => {
          const main = document.querySelector('main')
          return main ? main.scrollHeight + (main.getBoundingClientRect().top || 0) : document.scrollingElement.scrollHeight
        })
        await page.setViewportSize({ width: st.w, height: Math.min(Math.max(st.h, full + 8), 3200) })
        await page.waitForTimeout(250)
      }
      const file = `${roleName}__${route.replace(/[/:?=&]/g, '_').replace(/^_/, '')}${ov ? `__${ov.name}` : ''}__${st.w}-${st.scheme}.png`
      await page.screenshot({ path: path.join(CONFIG.outDir, file) })
      const findings = []
      if (ov) {
        if (openError) findings.push({ sev: 'must', what: `overlay "${ov.name}" could not be opened: ${openError}` })
        else if (!box) findings.push({ sev: 'must', what: `overlay "${ov.name}" is not visible` })
        else {
          if (box.x < -1 || box.x + box.width > st.w + 1) findings.push({ sev: 'must', what: `overlay "${ov.name}" leaves the screen (x ${Math.round(box.x)}, width ${Math.round(box.width)}, viewport ${st.w})` })
          if (box.width < Math.min(ov.minWidth ?? 0, st.w - 32)) findings.push({ sev: 'must', what: `overlay "${ov.name}" is squeezed to ${Math.round(box.width)}px` })
        }
      }
      if (m.docV > 1 && m.innerV > 0) findings.push({ sev: 'must', what: `document scrolls vertically by ${m.docV}px while ${m.innerV} region(s) inside it also scroll (a second scrollbar)` })
      if (m.docH > 1) findings.push({ sev: 'must', what: `document scrolls horizontally by ${m.docH}px` })
      for (const c of m.clipped.slice(0, 5)) findings.push({ sev: 'must', what: `clipped text: ${c}` })
      for (const s of m.spill.slice(0, 5)) findings.push({ sev: 'must', what: `spill: ${s}` })
      if (m.small.length) findings.push({ sev: 'should', what: `${m.small.length} touch target(s) under 28px, e.g. ${m.small.slice(0, 3).join(' | ')}` })
      for (const x of classifyScrollbars(sb).slice(0, 5)) findings.push(x)
      for (const v of axe) findings.push({ sev: v.impact === 'critical' || v.impact === 'serious' ? 'must' : 'should', what: `axe ${v.id} (${v.impact}) x${v.n}: ${v.help} - ${v.target ?? ''}` })
      if (dm) for (const x of scoreDesign(dm, { ...CONFIG.design.thresholds, fonts: CONFIG.design.fonts }, 'state')) if (!designOff(x.what)) findings.push(x)
      for (const c of problems.console.slice(0, 3)) findings.push({ sev: 'must', what: `console: ${c}` })
      for (const a of problems.api.slice(0, 3)) findings.push({ sev: 'must', what: `api: ${a}` })
      report.push({ state: label, file, findings })
      process.stdout.write(findings.some((f) => f.sev === 'must') ? 'x' : findings.length ? '~' : '.')
    }
  }
  process.stdout.write(`  ${roleName} done\n`)
  await context.close()
}
await browser.close()

// app-wide design drift: distinct fonts, sizes, radii, shadows, hues, spacing values, icon sizes, one status in two colours (per theme: dark may differ)
const appFindings = []
if (CONFIG.design.enabled) {
  const seen = new Set()
  for (const scheme of ['light', 'dark']) {
    for (const x of scoreDesign(appDesign[scheme], { ...CONFIG.design.thresholds, fonts: CONFIG.design.fonts }, 'app')) {
      if (designOff(x.what) || seen.has(x.what)) continue
      seen.add(x.what)
      appFindings.push({ ...x, theme: scheme })
    }
  }
}
fs.writeFileSync(path.join(CONFIG.outDir, 'ui-audit-report.json'), JSON.stringify({ at: new Date().toISOString(), states: report.length, report, designApp: appFindings, designMaps: appDesign }, null, 2))
const groups = new Map()
for (const r of report) for (const f of r.findings) {
  const key = `${f.sev === 'must' ? 'MUST  ' : 'should'} ${f.what.replace(/\d+px/g, 'Npx').replace(/x\d+:/, ':').replace(/"[^"]*"/g, '"…"').slice(0, 150)}`
  const g = groups.get(key) ?? { n: 0, where: [] }
  g.n++
  if (g.where.length < 3) g.where.push(r.state)
  groups.set(key, g)
}
const must = report.filter((r) => r.findings.some((f) => f.sev === 'must')).length + (appFindings.some((f) => f.sev === 'must') ? 1 : 0)
console.log(`\n${report.length} states audited; ${must} with MUST-fix findings; ${report.filter((r) => r.findings.length === 0).length} clean. Screenshots: ${CONFIG.outDir}\n`)
for (const [k, g] of [...groups].sort((a, b) => (a[0].startsWith('MUST') ? 0 : 1) - (b[0].startsWith('MUST') ? 0 : 1) || b[1].n - a[1].n)) {
  console.log(`${String(g.n).padStart(3)} × ${k}\n        e.g. ${g.where.join(' ; ')}`)
}
if (appFindings.length) {
  console.log('\nAPP-WIDE design consistency (all pages together):')
  for (const x of appFindings) console.log(`  ${x.sev === 'must' ? 'MUST  ' : 'should'} [${x.theme}] ${x.what}`)
}
process.exit(must ? 1 : 0)
