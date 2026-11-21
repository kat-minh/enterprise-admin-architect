/**
 * Automated UI audit of an admin: every page x every role x phone / tablet / desktop x light / dark.
 * COPY this file into the project under test (e.g. tools/ui-audit.mjs), fill in the CONFIG block, run it.
 *
 *   npm i -D playwright axe-core        (in the project under test; this is not a dependency of the skill)
 *   node tools/ui-audit.mjs [role ...]
 *
 * What it checks (what a person sees at a glance, which a data or permission test never looks at):
 *   - the document itself scrolls vertically (a second scrollbar) or horizontally
 *   - text clipped without an ellipsis, content spilling out of its card / panel / dialog
 *   - touch targets under 28 px at phone width
 *   - axe-core (WCAG 2.1 A + AA + best practice): contrast, accessible names and labels, landmarks, headings, ARIA,
 *     scrollable regions that keyboard users cannot reach
 *   - console errors, uncaught exceptions, failed API calls
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
  // one entry per role: the account to sign in with and the pages that role can open. ':name' parts are filled from `ids`.
  roles: {
    admin: { account: 'admin@example.com', pages: ['/dashboard', '/users', '/users/:user', '/settings'] },
    // support: { account: 'support@example.com', pages: ['/dashboard', '/users'] },
  },
  /** sign in `page` as `account`; resolve when the app shell is visible */
  async login(page, account) {
    await page.goto(`${CONFIG.appUrl}/login`)
    await page.getByLabel('Email').fill(account)
    await page.getByLabel(/password|mật khẩu/i).fill(process.env.AUDIT_PASSWORD ?? '')
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
  ignoreClipped: '.sr-only, .ad-sr, [class*="visually-hidden"]',
  /**
   * Overlays to audit. `route` is the page to load, `when(role)` says which roles have the overlay, `open(page)` opens it and resolves when it is
   * visible, `selector` is the overlay itself, `minWidth` the narrowest it may be before it counts as squeezed. Add one entry per overlay.
   */
  overlays: [
    // {
    //   name: 'command-menu', route: '/dashboard', when: () => true, selector: '[role="dialog"]', minWidth: 300,
    //   async open(page) { await page.keyboard.press('Control+K'); await page.getByRole('combobox').waitFor() },
    // },
  ],
  states: [
    { w: 1440, h: 900, scheme: 'light' },
    { w: 1440, h: 900, scheme: 'dark' },
    { w: 1024, h: 768, scheme: 'light' },
    { w: 390, h: 844, scheme: 'light' },
    { w: 390, h: 844, scheme: 'dark' },
  ],
}
// ------------------------------------------------------------------------------------------------ end of CONFIG

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
  const out = { docV: doc.scrollHeight - doc.clientHeight, docH: doc.scrollWidth - doc.clientWidth, clipped: [], spill: [], small: [] }
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') || (ignoreSelector && el.closest(ignoreSelector)) || !visible(el)) continue
    const cs = getComputedStyle(el)
    if (el.children.length === 0 && el.textContent.trim() && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis') {
      out.clipped.push(`${sel(el)} "${el.textContent.trim().slice(0, 40)}" (${el.scrollWidth}>${el.clientWidth})`)
    }
  }
  // content that leaves its own box: any element that looks like a card / panel / dialog (border or shadow, overflow visible)
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue
    const cs = getComputedStyle(el)
    if (cs.overflowX !== 'visible' || (cs.boxShadow === 'none' && cs.borderTopWidth === '0px' && cs.borderLeftWidth === '0px')) continue
    const r = el.getBoundingClientRect()
    if (r.width < 80) continue
    for (const c of el.querySelectorAll('*')) {
      if (c.closest('svg') || !visible(c)) continue
      const cr = c.getBoundingClientRect()
      if (cr.right > r.right + 2 || cr.left < r.left - 2) {
        out.spill.push(`${sel(c)} leaves ${sel(el)} by ${Math.round(Math.max(cr.right - r.right, r.left - cr.left))}px`)
        break
      }
    }
  }
  if (isPhone) {
    for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem], summary')) {
      if (!visible(el)) continue
      // a link inside a sentence is exempt (WCAG 2.5.8, inline exception): inline box, and the parent has other text of its own
      if (el.matches('a') && getComputedStyle(el).display === 'inline' && el.parentElement && (el.parentElement.textContent || '').replace(el.textContent || '', '').trim().length >= 12) continue
      const r = el.getBoundingClientRect()
      if (r.height < 28 || r.width < 28) out.small.push(`${sel(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"`)
    }
  }
  return out
}

const wanted = process.argv.slice(2)
const roleNames = wanted.length ? wanted : Object.keys(CONFIG.roles)
const browser = await chromium.launch({ headless: true })
const report = []

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
      const label = `${roleName} ${route}${ov ? ` [${ov.name}]` : ''} ${st.w}${st.scheme === 'dark' ? ' dark' : ''}`
      problems.console.length = 0
      problems.api.length = 0
      await page.setViewportSize({ width: st.w, height: st.h })
      await page.emulateMedia({ colorScheme: st.scheme })
      await page.goto(CONFIG.appUrl + url)
      try { await page.waitForFunction(CONFIG.loaded, null, { timeout: 15000 }) } catch { /* the page never settled: visible in the screenshot */ }
      await page.waitForTimeout(600)
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
      if (m.docV > 1) findings.push({ sev: 'must', what: `document scrolls vertically by ${m.docV}px (a second scrollbar)` })
      if (m.docH > 1) findings.push({ sev: 'must', what: `document scrolls horizontally by ${m.docH}px` })
      for (const c of m.clipped.slice(0, 5)) findings.push({ sev: 'must', what: `clipped text: ${c}` })
      for (const s of m.spill.slice(0, 5)) findings.push({ sev: 'must', what: `spill: ${s}` })
      if (m.small.length) findings.push({ sev: 'should', what: `${m.small.length} touch target(s) under 28px, e.g. ${m.small.slice(0, 3).join(' | ')}` })
      for (const v of axe) findings.push({ sev: v.impact === 'critical' || v.impact === 'serious' ? 'must' : 'should', what: `axe ${v.id} (${v.impact}) x${v.n}: ${v.help} - ${v.target ?? ''}` })
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

fs.writeFileSync(path.join(CONFIG.outDir, 'ui-audit-report.json'), JSON.stringify({ at: new Date().toISOString(), states: report.length, report }, null, 2))
const groups = new Map()
for (const r of report) for (const f of r.findings) {
  const key = `${f.sev === 'must' ? 'MUST  ' : 'should'} ${f.what.replace(/\d+px/g, 'Npx').replace(/x\d+:/, ':').replace(/"[^"]*"/g, '"…"').slice(0, 150)}`
  const g = groups.get(key) ?? { n: 0, where: [] }
  g.n++
  if (g.where.length < 3) g.where.push(r.state)
  groups.set(key, g)
}
const must = report.filter((r) => r.findings.some((f) => f.sev === 'must')).length
console.log(`\n${report.length} states audited; ${must} with MUST-fix findings; ${report.filter((r) => r.findings.length === 0).length} clean. Screenshots: ${CONFIG.outDir}\n`)
for (const [k, g] of [...groups].sort((a, b) => (a[0].startsWith('MUST') ? 0 : 1) - (b[0].startsWith('MUST') ? 0 : 1) || b[1].n - a[1].n)) {
  console.log(`${String(g.n).padStart(3)} × ${k}\n        e.g. ${g.where.join(' ; ')}`)
}
process.exit(must ? 1 : 0)
