/**
 * Front-end performance budget of an admin (quality-gates.md PERF-8), measured on the PRODUCTION build, per route, with a phone profile
 * (390 px, CPU 4x slower, 1.6 Mbps / 150 ms latency, like Lighthouse's mobile preset) and a desktop profile (no throttling).
 * COPY this file into the project under test (e.g. tools/perf-frontend.mjs), fill in the CONFIG block, run it.
 *
 *   npm i -D playwright                 (in the project under test; this is not a dependency of the skill)
 *   node tools/perf-frontend.mjs
 *
 * Per route and profile it reports (median of RUNS cold loads):
 *   - JavaScript and CSS loaded, gzip, computed from the built files (what the route really downloads, not the biggest chunk)
 *   - API requests finished before the page showed real content, and the time until it did
 *   - largest contentful paint, cumulative layout shift (with the elements that moved), blocking time of long tasks
 * and, for the scripted session in CONFIG.interactions, the longest interaction (Event Timing) per kind of event.
 * It exits 1 and lists every figure over budget. A budget that is never exceeded is not a budget: record the numbers that are over,
 * with a plan, in qa-report.md instead of raising the threshold.
 *
 * Measure with a realistic seed. A list that renders 25 rows costs the same at 100 or 400 000 rows, but the API time at scale is a
 * different measurement (PERF-1..7). Say which data the figures were taken with.
 */
import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

// ------------------------------------------------------------------------------------------------ CONFIG
const CONFIG = {
  buildCommand: 'npm run build',
  distDir: 'dist',
  /** serves the production build; the API must allow this origin (CORS) */
  previewUrl: 'http://localhost:5176',
  previewCommand: ['npx', 'vite', 'preview', '--port', '5176', '--strictPort'],
  outFile: 'perf-frontend.json',
  runs: 3,
  /** routes to measure; `auth: false` for the sign-in page */
  routes: [
    { path: '/login', auth: false },
    { path: '/dashboard', auth: true },
    { path: '/users', auth: true },
  ],
  /** run once; return whatever `authenticate` needs (for example a session token obtained by signing in through the UI or the API) */
  async prepare(browser) {
    return { token: process.env.PERF_TOKEN ?? '' }
  },
  /** called on every fresh browser context before the page loads: put the session in place (storage, cookie) */
  async authenticate(context, auth) {
    await context.addInitScript((t) => sessionStorage.setItem('session', t), auth.token)
  },
  /** true when the page shows real content (not skeletons or spinners) */
  ready: () => !!document.querySelector('main, [role="main"], form') && !document.querySelector('[aria-busy="true"], .skeleton, .spinner'),
  /**
   * optional scripted session on one page: the longest interaction is reported. Open a menu, type in the search box, sort a column,
   * change the page size; repeat a few rounds. `page` is already on `interactionsPath`.
   */
  interactionsPath: '/users',
  async interactions(page) {
    // for (let i = 0; i < 3; i++) { await page.keyboard.press('Control+K'); await page.keyboard.type('use'); await page.keyboard.press('Escape') }
  },
  /** Web Vitals "good" thresholds and the usual critical-path budget of JavaScript for a route on a phone */
  budget: { jsGzKB: 170, lcpMs: 2500, cls: 0.1, inpMs: 200, tbtMs: 200 },
}
// ------------------------------------------------------------------------------------------------ end of CONFIG

const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('playwright')

const PROFILES = {
  phone: { viewport: { width: 390, height: 844 }, throttle: true },
  desktop: { viewport: { width: 1440, height: 900 }, throttle: false },
}
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
const gzOfFile = (f) => (fs.existsSync(f) && fs.statSync(f).isFile() ? zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length : 0)
const gzOfUrl = (u) => gzOfFile(path.join(CONFIG.distDir, decodeURIComponent(new URL(u).pathname)))

console.log('building…')
execSync(CONFIG.buildCommand, { stdio: 'pipe' })
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
const jsFiles = walk(CONFIG.distDir).filter((f) => f.endsWith('.js')).map((f) => ({ file: path.relative(CONFIG.distDir, f), gzKB: gzOfFile(f) / 1024 })).sort((a, b) => b.gzKB - a.gzKB)
console.log(`  ${jsFiles.length} JS files; largest ${jsFiles[0]?.file} = ${jsFiles[0]?.gzKB.toFixed(1)} KB gzip (reported, not judged: only what a route loads in total has a standard budget)`)

const [cmd, ...args] = CONFIG.previewCommand
const server = spawn(cmd, args, { stdio: 'ignore', shell: process.platform === 'win32' })
const stop = () => { try { server.kill() } catch { /* gone */ } }
process.on('exit', stop)
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(CONFIG.previewUrl)).ok) break } catch { /* not yet */ }
  await new Promise((r) => setTimeout(r, 500))
}

const browser = await chromium.launch()
const auth = await CONFIG.prepare(browser)

async function newPage(profile, withAuth) {
  const ctx = await browser.newContext({ viewport: profile.viewport, serviceWorkers: 'block' })
  if (withAuth) await CONFIG.authenticate(ctx, auth)
  const page = await ctx.newPage()
  if (profile.throttle) {
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
  }
  await page.addInitScript(() => {
    window.__m = { lcp: 0, cls: 0, tbt: 0, events: [], shifts: [] }
    const obs = (type, fn, extra = {}) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true, ...extra }) } catch { /* unsupported */ } }
    obs('largest-contentful-paint', (e) => { window.__m.lcp = e.startTime })
    obs('layout-shift', (e) => {
      if (e.hadRecentInput) return
      window.__m.cls += e.value
      const name = (el) => (el ? `${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''}` : '?')
      window.__m.shifts.push({ v: Number(e.value.toFixed(3)), at: Math.round(e.startTime), nodes: (e.sources || []).slice(0, 3).map((x) => name(x.node)) })
    })
    obs('longtask', (e) => { window.__m.tbt += Math.max(0, e.duration - 50) })
    obs('event', (e) => { if (e.interactionId) window.__m.events.push({ name: e.name, d: e.duration }) }, { durationThreshold: 16 })
  })
  return { ctx, page }
}

async function measure(route, profileName) {
  const profile = PROFILES[profileName]
  const runs = []
  for (let i = 0; i < CONFIG.runs; i++) {
    const { ctx, page } = await newPage(profile, route.auth)
    const finished = []
    page.on('requestfinished', (r) => finished.push({ url: r.url(), t: Date.now() }))
    const t0 = Date.now()
    await page.goto(`${CONFIG.previewUrl}${route.path}`, { waitUntil: 'load' })
    await page.waitForFunction(CONFIG.ready, null, { timeout: 45000 })
    const readyAt = Date.now()
    await page.waitForTimeout(1200) // let the largest contentful paint settle
    const m = await page.evaluate(() => window.__m)
    const pick = (re) => new Set(finished.filter((r) => re.test(new URL(r.url).pathname)).map((r) => r.url))
    const js = pick(/\.m?js$/)
    const css = pick(/\.css$/)
    runs.push({
      jsGzKB: [...js].reduce((s, u) => s + gzOfUrl(u), 0) / 1024,
      cssGzKB: [...css].reduce((s, u) => s + gzOfUrl(u), 0) / 1024,
      jsFiles: js.size,
      requestsBeforeContent: finished.filter((r) => !/\.(m?js|css|png|jpe?g|svg|webp|woff2?|ico)$/.test(new URL(r.url).pathname) && r.t <= readyAt).length,
      contentMs: readyAt - t0,
      lcpMs: m.lcp,
      cls: m.cls,
      tbtMs: m.tbt,
      shifts: m.shifts,
    })
    await ctx.close()
  }
  const med = (k) => median(runs.map((r) => r[k]))
  return { route: route.path, profile: profileName, jsGzKB: med('jsGzKB'), cssGzKB: med('cssGzKB'), jsFiles: med('jsFiles'), requestsBeforeContent: med('requestsBeforeContent'), contentMs: med('contentMs'), lcpMs: med('lcpMs'), cls: Number(med('cls').toFixed(3)), tbtMs: Math.round(med('tbtMs')), shifts: runs.find((r) => r.shifts.length)?.shifts ?? [] }
}

async function interactions(profileName) {
  const { ctx, page } = await newPage(PROFILES[profileName], true)
  await page.goto(`${CONFIG.previewUrl}${CONFIG.interactionsPath}`)
  await page.waitForFunction(CONFIG.ready, null, { timeout: 45000 })
  await page.waitForTimeout(800)
  await CONFIG.interactions(page)
  await page.waitForTimeout(500)
  const ev = await page.evaluate(() => window.__m.events)
  await ctx.close()
  const byName = {}
  for (const e of ev) byName[e.name] = Math.max(byName[e.name] ?? 0, e.d)
  return { profile: profileName, count: ev.length, maxMs: Math.round(Math.max(0, ...ev.map((e) => e.d))), byName }
}

const B = CONFIG.budget
const rows = []
for (const p of Object.keys(PROFILES)) {
  for (const r of CONFIG.routes) {
    const m = await measure(r, p)
    rows.push(m)
    console.log(`  ${p.padEnd(7)} ${r.path.padEnd(14)} js ${m.jsGzKB.toFixed(0).padStart(4)} KB (${m.jsFiles} files)  css ${m.cssGzKB.toFixed(0).padStart(2)} KB  requests ${m.requestsBeforeContent}  content ${String(m.contentMs).padStart(5)} ms  LCP ${String(Math.round(m.lcpMs)).padStart(5)} ms  CLS ${m.cls}  TBT ${m.tbtMs} ms`)
    if (m.cls > 0) console.log(`      layout shifts: ${JSON.stringify(m.shifts)}`)
  }
}
const inter = []
for (const p of Object.keys(PROFILES)) {
  const i = await interactions(p)
  inter.push(i)
  console.log(`  interactions ${p}: ${i.count} measured, longest ${i.maxMs} ms ${JSON.stringify(i.byName)}`)
}

const problems = []
for (const m of rows) {
  const where = `${m.profile} ${m.route}`
  if (m.jsGzKB > B.jsGzKB) problems.push(`${where}: JavaScript ${m.jsGzKB.toFixed(0)} KB gzip > ${B.jsGzKB}`)
  if (m.profile === 'phone' && m.lcpMs > B.lcpMs) problems.push(`${where}: LCP ${Math.round(m.lcpMs)} ms > ${B.lcpMs}`)
  if (m.cls > B.cls) problems.push(`${where}: CLS ${m.cls} > ${B.cls}`)
  if (m.tbtMs > B.tbtMs) problems.push(`${where}: blocking time ${m.tbtMs} ms > ${B.tbtMs}`)
}
for (const i of inter) if (i.maxMs > B.inpMs) problems.push(`${i.profile} interaction ${i.maxMs} ms > ${B.inpMs}`)

fs.writeFileSync(CONFIG.outFile, JSON.stringify({ at: new Date().toISOString(), budget: B, runsPerRoute: CONFIG.runs, largestFiles: jsFiles.slice(0, 8).map((f) => ({ file: f.file, gzKB: Number(f.gzKB.toFixed(1)) })), rows, interactions: inter, problems }, null, 2))
console.log(problems.length ? `\nOVER BUDGET (${problems.length}):\n  ${problems.join('\n  ')}` : '\nwithin budget on every route and profile')
stop()
await browser.close()
process.exit(problems.length ? 1 : 0)
