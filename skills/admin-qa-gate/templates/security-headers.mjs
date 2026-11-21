/**
 * Gate SEC-19: the security headers are present on the DEPLOYED (or production-preview) admin host, and the app still works under them.
 * COPY this file into the project under test (e.g. tools/security-headers.mjs), fill in the CONFIG block, run it:
 *
 *   npm i -D playwright                  (in the project under test; this is not a dependency of the skill)
 *   node tools/security-headers.mjs
 *
 * 1. Fetches the admin URL and checks the headers (identity-and-sessions.md §8): a Content-Security-Policy that forbids inline and eval script and
 *    framing, nosniff, a Referrer-Policy, a Permissions-Policy, HSTS on https, and an index.html with no inline <script>.
 * 2. Signs in, walks CONFIG.pages in a real browser and FAILS on any Content-Security-Policy violation (an inline theme script, a font or image
 *    host nobody listed, an API origin missing from connect-src: all of them break silently, which is why the page walk matters more than the headers).
 * 3. Prints the headers of CONFIG.otherHosts (the API, the public app) for the report; it does not assert them.
 * Run it against the production build or the deployed host, never the dev server (hot reload needs inline script, so a dev server cannot carry the policy).
 */
import { createRequire } from 'node:module'
import path from 'node:path'

// ------------------------------------------------------------------------------------------------ CONFIG
const CONFIG = {
  adminUrl: 'http://localhost:4173',
  /** pages to open after signing in; include one with a preview frame, one with images from the API, one with an editor */
  pages: ['/dashboard', '/users', '/settings'],
  /** other hosts to report (not asserted) */
  otherHosts: [{ name: 'API', url: 'http://localhost:7863/api/health' }],
  /** directives the CSP must contain (as substrings); `script-src` must not carry 'unsafe-inline' or 'unsafe-eval' (checked separately) */
  cspMust: ["default-src 'self'", "script-src 'self'", "frame-ancestors 'none'", "base-uri 'none'", "object-src 'none'"],
  /** true when the admin is served over https (HSTS is then required) */
  https: false,
  /** sign in `page`; resolve when the app shell is visible */
  async login(page) {
    await page.goto(`${CONFIG.adminUrl}/login`)
    await page.getByLabel('Email').fill('admin@example.com')
    await page.getByLabel(/^(password|mật khẩu)/i).first().fill(process.env.AUDIT_PASSWORD ?? '')
    await page.getByRole('button', { name: /sign in|đăng nhập/i }).click()
    await page.locator('nav, aside').first().waitFor({ timeout: 15000 })
  },
}
// ------------------------------------------------------------------------------------------------ end of CONFIG

const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('playwright')
let pass = 0
let fail = 0
const check = (ok, name, extra = '') => {
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && extra ? ` :: ${extra}` : ''}`)
}

console.log('== headers on the admin host')
const res = await fetch(CONFIG.adminUrl + '/')
const h = (n) => res.headers.get(n) ?? ''
const csp = h('content-security-policy')
check(csp !== '', 'a Content-Security-Policy is sent')
for (const d of CONFIG.cspMust) check(csp.includes(d), `CSP has ${d}`, csp.slice(0, 200))
const scriptSrc = (csp.match(/(?:^|;)\s*script-src[^;]*/) ?? [''])[0]
check(!/'unsafe-inline'|'unsafe-eval'/.test(scriptSrc), "CSP script-src allows no 'unsafe-inline' and no 'unsafe-eval'", scriptSrc)
check(h('x-content-type-options').toLowerCase() === 'nosniff', 'X-Content-Type-Options: nosniff')
check(h('referrer-policy') !== '', 'a Referrer-Policy is sent', 'none')
check(h('permissions-policy') !== '', 'a Permissions-Policy is sent (deny camera, microphone, geolocation unless used)', 'none')
if (CONFIG.https) check(/max-age=\d{7,}/.test(h('strict-transport-security')), 'Strict-Transport-Security with a long max-age (https)', h('strict-transport-security'))
else console.log('  --   HSTS not required: CONFIG.https is false (set it when the admin is served over https)')
const html = await res.text()
check(!/<script(?![^>]*\bsrc=)[^>]*>[^<]/i.test(html), 'index.html has no inline script (CSP would block it silently)')

console.log('== other hosts (reported, not asserted)')
for (const { name, url } of CONFIG.otherHosts) {
  try {
    const r = await fetch(url)
    console.log(`  ${name}: nosniff=${r.headers.get('x-content-type-options') ?? '-'} csp=${r.headers.get('content-security-policy') ? 'yes' : '-'} hsts=${r.headers.get('strict-transport-security') ?? '-'} referrer=${r.headers.get('referrer-policy') ?? '-'}`)
  } catch (e) {
    console.log(`  ${name}: not reachable (${e.message})`)
  }
}

console.log('== the app under the policy: no CSP violation on any page')
const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
const violations = []
page.on('console', (m) => /Content Security Policy|Refused to/i.test(m.text()) && violations.push(m.text().slice(0, 220)))
await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.error(`Refused to (event): ${e.violatedDirective} ${e.blockedURI}`)))
try {
  await CONFIG.login(page)
  for (const route of CONFIG.pages) {
    await page.goto(CONFIG.adminUrl + route)
    await page.waitForTimeout(1800)
  }
  check(violations.length === 0, `no Content-Security-Policy violation on ${CONFIG.pages.length} pages`, [...new Set(violations)].slice(0, 3).join(' | '))
} catch (e) {
  check(false, 'the page walk completed', String(e.message).split('\n')[0])
}
await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
