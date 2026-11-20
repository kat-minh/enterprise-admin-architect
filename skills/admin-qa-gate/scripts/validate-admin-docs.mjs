#!/usr/bin/env node
/**
 * validate-admin-docs.mjs - consistency checker for docs/admin/* produced by the
 * enterprise-admin-architect skill suite.
 *
 * Usage:
 *   node validate-admin-docs.mjs [--root <projectRoot>] [--docs docs/admin]
 *        [--stage discovery|architecture|design|build|final] [--json] [--strict]
 *
 * Exit code 0 = no errors (warnings allowed unless --strict), 1 = errors, 2 = usage error.
 * Checks structure and cross-references only; it cannot prove the code works.
 */
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------- CLI
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('Usage: node validate-admin-docs.mjs [--root <dir>] [--docs docs/admin] [--stage discovery|architecture|design|build|final] [--json] [--strict]');
  process.exit(0);
}
const ROOT = path.resolve(opt('--root', '.'));
const DOCS = path.resolve(ROOT, opt('--docs', 'docs/admin'));
const STAGE = opt('--stage', 'build');
const AS_JSON = argv.includes('--json');
const STRICT = argv.includes('--strict');
const STAGES = ['discovery', 'architecture', 'design', 'build', 'final'];
if (!STAGES.includes(STAGE)) { console.error(`Unknown --stage "${STAGE}". Use: ${STAGES.join(' | ')}`); process.exit(2); }
const at = (s) => STAGES.indexOf(STAGE) >= STAGES.indexOf(s);

const results = [];
const err = (file, msg) => results.push({ level: 'error', file, msg });
const warn = (file, msg) => results.push({ level: 'warn', file, msg });
const ok = (file, msg) => results.push({ level: 'ok', file, msg });

// ---------------------------------------------------------------- helpers
function readDoc(rel) {
  const p = path.join(DOCS, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (s) => (s || '').replace(/`/g, '').trim();
const isEmptyVal = (s) => !s || /^(-|—|–|tbd|todo|n\/a|none|)$/i.test(clean(s));

const isSeparator = (line) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line) && line.includes('-');

/** Parse all markdown tables: [{ headers, rows: [{cells, line}], heading, line }] */
function parseTables(md) {
  const lines = md.split('\n');
  const tables = [];
  let heading = '';
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^#{1,6}\s/.test(l)) heading = l.replace(/^#+\s*/, '').trim();
    if (/^\s*\|/.test(l) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const split = (row) => {
        const cells = [];
        let cur = '';
        const body = row.trim().replace(/^\|/, '').replace(/\|$/, '');
        for (let k = 0; k < body.length; k++) {
          if (body[k] === '\\' && body[k + 1] === '|') { cur += '|'; k++; continue; }
          if (body[k] === '|') { cells.push(cur.trim()); cur = ''; continue; }
          cur += body[k];
        }
        cells.push(cur.trim());
        return cells;
      };
      const headers = split(l);
      const rows = [];
      let j = i + 2;
      while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push({ cells: split(lines[j]), line: j + 1 }); j++; }
      tables.push({ headers, rows, heading, line: i + 1 });
      i = j - 1;
    }
  }
  return tables;
}

/** Find a table whose normalised headers include all of `required`. */
function findTable(md, required) {
  return parseTables(md).find((t) => {
    const h = t.headers.map(norm);
    return required.every((r) => h.includes(r));
  });
}
function colIndex(table, name) { return table.headers.map(norm).indexOf(name); }

function sectionOf(md, headingRe) {
  const lines = md.split('\n');
  let start = -1, level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (m && headingRe.test(m[2])) { start = i + 1; level = m[1].length; break; }
  }
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}
const hasHeading = (md, re) => md.split('\n').some((l) => /^#{1,6}\s/.test(l) && re.test(l.replace(/^#+\s*/, '')));

const PLACEHOLDER_RE = /<YYYY-MM-DD>|<name>/;
const checkPlaceholders = (file, md) => { if (md && PLACEHOLDER_RE.test(md)) warn(file, 'Template placeholders (<name>, <YYYY-MM-DD>) are still present - fill them in.'); };

const LAYERS = ['core', 'foundation', 'domain'];
const EVIDENCE = ['confirmed', 'implied', 'proposed'];
const PRIORITY = ['P0', 'P1', 'P2'];
const STATUS = ['proposed', 'planned', 'in-progress', 'prototype', 'done', 'blocked', 'dropped', 'exists'];
const CORE_IDS = ['auth', 'rbac', 'dashboard', 'admin-users', 'audit-log', 'settings', 'my-account'];
// universal foundation candidates (admin-discovery/references/universal-modules.md): each must be decided, never skipped silently
const FOUNDATION_IDS = ['public-users', 'notifications', 'media', 'import-export', 'trash', 'site-content', 'leads-inbox', 'templates', 'jobs-monitor', 'search-command', 'saved-views', 'localization', 'help', 'user-messaging', 'privacy-requests', 'app-controls'];
const NO_PERMISSION_OK = new Set(['auth', 'my-account']); // self-service / public entry modules
const CELL_OK = /^(yes|no|own|team|y|n|x|✔|✓|✘|✗|-|—|–)$/i;
const PERM_RE = /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/;
const SPEC_HEADINGS = [
  ['Definition', /^definition\b/i], ['Permissions', /^permissions\b/i], ['API dependencies', /^api dependencies\b/i],
  ['List page', /^list page\b/i], ['Create / Edit', /^create\s*\/?\s*edit\b/i], ['Detail page', /^detail page\b/i],
  ['Business rules', /^business rules\b/i], ['Audit events', /^audit events\b/i], ['Edge cases', /^edge cases\b/i],
  ['Test scenarios', /^test scenarios\b/i],
];

// ---------------------------------------------------------------- required files per stage
const FILES_BY_STAGE = {
  discovery: ['product-discovery.md', 'business-domain-map.md', 'module-inventory.md'],
  architecture: ['information-architecture.md', 'permission-matrix.md'],
  design: ['design-system.md'],
  build: ['implementation-status.md'],
  final: ['qa-report.md'],
};
if (!fs.existsSync(DOCS)) {
  err('docs/admin', `Directory not found: ${DOCS}`);
} else {
  for (const s of STAGES) {
    if (!at(s)) continue;
    for (const f of FILES_BY_STAGE[s]) {
      const md = readDoc(f);
      if (md === null) err(f, `Missing required file for stage "${STAGE}".`);
      else if (md.trim().length < 80) err(f, 'File is empty or trivially short.');
      else { ok(f, 'present'); checkPlaceholders(f, md); }
    }
  }
}

// ---------------------------------------------------------------- module inventory
const modules = new Map(); // id -> row object
const inventoryMd = readDoc('module-inventory.md');
if (inventoryMd) {
  const t = findTable(inventoryMd, ['id', 'module', 'layer', 'evidence', 'priority', 'status']);
  if (!t) {
    err('module-inventory.md', 'Could not find the inventory table (needs columns: ID, Module, Layer, Evidence, Priority, Source / Justification, Depends on, Status).');
  } else {
    const ix = Object.fromEntries(['id', 'module', 'layer', 'evidence', 'priority', 'status'].map((n) => [n, colIndex(t, n)]));
    const srcIx = t.headers.map(norm).findIndex((h) => h.startsWith('source') || h.startsWith('justification'));
    const depIx = t.headers.map(norm).findIndex((h) => h.startsWith('depend'));
    if (srcIx < 0) err('module-inventory.md', 'Missing "Source / Justification" column - every module needs evidence.');
    for (const r of t.rows) {
      const c = r.cells;
      const id = clean(c[ix.id]);
      const row = { id, name: clean(c[ix.module]), layer: clean(c[ix.layer]).toLowerCase(), evidence: clean(c[ix.evidence]).toLowerCase(), priority: clean(c[ix.priority]).toUpperCase(), status: clean(c[ix.status]).toLowerCase(), source: srcIx >= 0 ? c[srcIx] : '', deps: depIx >= 0 ? c[depIx] : '', line: r.line };
      const where = `module-inventory.md:${r.line}`;
      if (!/^[a-z][a-z0-9-]*$/.test(id)) { err(where, `Invalid module ID "${id}" (use kebab-case).`); continue; }
      if (modules.has(id)) { err(where, `Duplicate module ID "${id}".`); continue; }
      modules.set(id, row);
      if (!LAYERS.includes(row.layer)) err(where, `${id}: Layer "${row.layer}" not in ${LAYERS.join('|')}.`);
      if (!EVIDENCE.includes(row.evidence)) err(where, `${id}: Evidence "${row.evidence}" not in ${EVIDENCE.join('|')}.`);
      if (!PRIORITY.includes(row.priority)) err(where, `${id}: Priority "${row.priority}" not in ${PRIORITY.join('|')}.`);
      if (!STATUS.includes(row.status)) err(where, `${id}: Status "${row.status}" not in ${STATUS.join('|')}.`);
      if (srcIx >= 0 && isEmptyVal(row.source)) err(where, `${id}: Source / Justification is empty - no module without evidence.`);
      if (row.evidence === 'proposed' && ['planned', 'in-progress', 'done'].includes(row.status) && !/approved/i.test(row.source)) {
        warn(where, `${id}: evidence is "proposed" but status is "${row.status}" without an "approved" note in Source - was the user's approval recorded?`);
      }
      if (row.priority === 'P0' && row.status === 'dropped') warn(where, `${id}: P0 module is dropped - confirm this was approved.`);
    }
    // dependencies
    for (const m of modules.values()) {
      for (const d of (m.deps || '').split(/[,;]/).map(clean).filter((x) => !isEmptyVal(x))) {
        if (!modules.has(d)) err(`module-inventory.md:${m.line}`, `${m.id}: depends on unknown module "${d}".`);
      }
    }
    // core modules
    const excluded = sectionOf(inventoryMd, /excluded/i) || '';
    for (const core of CORE_IDS) {
      if (!modules.has(core) && !new RegExp(`\\b${core}\\b`, 'i').test(excluded)) {
        warn('module-inventory.md', `Core module "${core}" is missing. Core modules are mandatory for every admin - add it, or document the exception under "Excluded / deferred".`);
      }
    }
    if (modules.size === 0) err('module-inventory.md', 'Inventory table has no rows.');
    else ok('module-inventory.md', `${modules.size} modules parsed`);
    if (![...modules.values()].some((m) => m.layer === 'domain')) warn('module-inventory.md', 'No domain-layer modules - a generic admin is not the goal; derive domain modules from the website.');
    // foundation triage: every candidate is included, or excluded / deferred with a reason the owner has seen
    const decidedText = excluded.split('\n').filter((l) => !/decide each/i.test(l)).join('\n'); // the template's placeholder row decides nothing
    const undecided = FOUNDATION_IDS.filter((f) => !modules.has(f) && !new RegExp(`(^|[^a-z0-9-])${f}([^a-z0-9-]|$)`, 'i').test(decidedText));
    if (/decide each/i.test(excluded)) warn('module-inventory.md', 'The template row "decide each" is still in "Excluded / deferred": replace it with one row per foundation candidate.');
    if (undecided.length) {
      warn('module-inventory.md', `Foundation modules not decided: ${undecided.join(', ')}. Include each, or list it under "Excluded / deferred" with a reason (and ask the owner at Gate 1: never exclude silently).`);
    }
  }
}

// ---------------------------------------------------------------- discovery document: owner intake, content inventory, ledger traceability
if (at('discovery')) {
  const disc = readDoc('product-discovery.md');
  if (disc && disc.trim().length >= 80) {
    if (!hasHeading(disc, /owner intake/i)) warn('product-discovery.md', 'No "Owner intake" section: ask the owner what they change by hand today (discovery step 3b) and map each answer to a module.');
    if (!hasHeading(disc, /content\s*(&|and)\s*configuration inventory/i)) warn('product-discovery.md', 'No "Content & configuration inventory" section: list UI strings, branding, banners, legal pages and switches, and classify each as CMS, code or build-time (discovery step 3c).');
    const ledgerSection = sectionOf(disc, /feature ledger/i);
    const ledger = ledgerSection ? parseTables(ledgerSection)[0] : null;
    if (ledger) {
      const ownerIx = ledger.headers.map(norm).findIndex((h) => h.startsWith('ownermodule'));
      if (ownerIx < 0) {
        warn('product-discovery.md', 'Feature Ledger has no "Owner module" column: every feature must map to a module ID or "excluded: <reason>".');
      } else {
        for (const r of ledger.rows) {
          const feature = clean(r.cells[0]);
          const owner = clean(r.cells[ownerIx]);
          if (isEmptyVal(owner)) { warn('product-discovery.md', `Feature "${feature}" has no owner module (a module ID, or "excluded: <reason>").`); continue; }
          if (/^excluded\b/i.test(owner)) continue;
          if (modules.size) {
            for (const id of owner.split(/[,;+/]/).map(clean).filter(Boolean)) {
              if (!modules.has(id)) warn('product-discovery.md', `Feature "${feature}": owner module "${id}" is not in module-inventory.md.`);
            }
          }
        }
      }
    }
  }
}

const activeModules = () => [...modules.values()].filter((m) => !['dropped', 'proposed'].includes(m.status));

// ---------------------------------------------------------------- permission matrix & IA
const permissions = new Map(); // key -> module id
if (at('architecture')) {
  const pmMd = readDoc('permission-matrix.md');
  if (pmMd) {
    const cat = findTable(pmMd, ['permission', 'moduleid']);
    if (!cat) err('permission-matrix.md', 'Permission catalog table not found (columns: Permission, Module ID, Description, Sensitive).');
    else {
      const pIx = colIndex(cat, 'permission'), mIx = colIndex(cat, 'moduleid');
      for (const r of cat.rows) {
        const key = clean(r.cells[pIx]);
        const mod = clean(r.cells[mIx]);
        const where = `permission-matrix.md:${r.line}`;
        if (!PERM_RE.test(key)) { err(where, `Invalid permission key "${key}" (use resource.action, lowercase).`); continue; }
        if (permissions.has(key)) err(where, `Duplicate permission "${key}".`);
        permissions.set(key, mod);
        if (modules.size && !modules.has(mod)) err(where, `${key}: Module ID "${mod}" is not in module-inventory.md.`);
      }
      ok('permission-matrix.md', `${permissions.size} permissions in catalog`);
    }
    // matrix: table with first header "permission", >=2 columns, and no "moduleid" column
    const matrix = parseTables(pmMd).find((t) => norm(t.headers[0] || '') === 'permission' && t.headers.length >= 2 && !t.headers.map(norm).includes('moduleid'));
    if (!matrix) err('permission-matrix.md', 'Role × Permission matrix table not found (first column "Permission", then one column per role).');
    else {
      const roles = matrix.headers.slice(1);
      const seen = new Set();
      for (const r of matrix.rows) {
        const key = clean(r.cells[0]);
        seen.add(key);
        if (permissions.size && !permissions.has(key)) err(`permission-matrix.md:${r.line}`, `Matrix row "${key}" is not in the permission catalog.`);
        r.cells.slice(1).forEach((v, i) => { if (!CELL_OK.test(clean(v))) warn(`permission-matrix.md:${r.line}`, `Unexpected cell value "${clean(v)}" for role "${roles[i]}" (use yes/no/own/team).`); });
      }
      for (const key of permissions.keys()) if (!seen.has(key)) err('permission-matrix.md', `Permission "${key}" is in the catalog but has no row in the role matrix.`);
      const fullRole = roles.findIndex((_, i) => matrix.rows.length && matrix.rows.every((r) => /^(yes|y|✔|✓)$/i.test(clean(r.cells[i + 1] || ''))));
      if (matrix.rows.length && fullRole < 0) warn('permission-matrix.md', 'No role has every permission - is there a Super Admin?');
    }
    // every active module needs permissions
    for (const m of activeModules()) {
      if (NO_PERMISSION_OK.has(m.id)) continue;
      if (![...permissions.values()].includes(m.id)) err('permission-matrix.md', `Module "${m.id}" has no permission in the catalog (server-side authorization cannot be specified).`);
    }
  }

  const iaMd = readDoc('information-architecture.md');
  if (iaMd) {
    const routes = findTable(iaMd, ['route', 'moduleid', 'permission']);
    if (!routes) err('information-architecture.md', 'Route table not found (columns: Route, Page, Module ID, Type, Permission, Interaction).');
    else {
      const rIx = colIndex(routes, 'route'), mIx = colIndex(routes, 'moduleid'), pIx = colIndex(routes, 'permission');
      const covered = new Set();
      for (const r of routes.rows) {
        const mod = clean(r.cells[mIx]);
        const perm = clean(r.cells[pIx]);
        const where = `information-architecture.md:${r.line}`;
        if (!clean(r.cells[rIx]).startsWith('/')) warn(where, `Route "${clean(r.cells[rIx])}" should start with "/".`);
        if (modules.size && !modules.has(mod)) err(where, `Route references unknown module "${mod}".`);
        covered.add(mod);
        if (!isEmptyVal(perm) && !/^public$/i.test(perm) && permissions.size && !permissions.has(perm)) err(where, `Route permission "${perm}" is not in the permission catalog.`);
      }
      for (const m of activeModules()) if (!covered.has(m.id)) err('information-architecture.md', `Module "${m.id}" has no route in the route table.`);
      ok('information-architecture.md', `${routes.rows.length} routes`);
    }
    if (!/```/.test(iaMd)) warn('information-architecture.md', 'No sidebar tree (code block) found.');
  }
}

// ---------------------------------------------------------------- design
if (at('design')) {
  const ds = readDoc('design-system.md');
  if (ds) {
    if (!hasHeading(ds, /tokens/i)) warn('design-system.md', 'No "Tokens" section.');
    if (!hasHeading(ds, /component/i)) warn('design-system.md', 'No component catalogue section.');
  }
  // fe-first mode: prototype modules are built against api-contract.md (contract-first)
  const prototypes = [...modules.values()].filter((m) => m.status === 'prototype');
  if (prototypes.length) {
    const contract = readDoc('api-contract.md');
    if (contract === null) err('api-contract.md', `${prototypes.length} module(s) are "prototype" (${prototypes.map((m) => m.id).join(', ')}) but api-contract.md is missing - FE-first is contract-first.`);
    else {
      for (const m of prototypes) {
        if (!new RegExp(`\\b${m.id}\\b`).test(contract)) warn('api-contract.md', `Prototype module "${m.id}" is not mentioned in the contract.`);
      }
      ok('api-contract.md', `present (${prototypes.length} prototype module(s))`);
    }
  }
}

// ---------------------------------------------------------------- build: specs + implementation status
if (at('build') && modules.size) {
  const specDir = path.join(DOCS, 'module-specifications');
  for (const m of modules.values()) {
    const specPath = path.join(specDir, `${m.id}.md`);
    const exists = fs.existsSync(specPath);
    const needsSpec = ['in-progress', 'prototype', 'done'].includes(m.status);
    if (!exists) {
      if (needsSpec) err(`module-specifications/${m.id}.md`, `Module "${m.id}" is ${m.status} but has no module specification.`);
      else if (['planned', 'blocked'].includes(m.status) && ['P0', 'P1'].includes(m.priority)) warn(`module-specifications/${m.id}.md`, `${m.priority} module "${m.id}" (${m.status}) has no specification yet.`);
      continue;
    }
    const spec = fs.readFileSync(specPath, 'utf8').replace(/\r\n/g, '\n');
    for (const [label, re] of SPEC_HEADINGS) {
      if (!hasHeading(spec, re)) err(`module-specifications/${m.id}.md`, `Missing section "## ${label}" (write "N/A - reason" if it does not apply).`);
    }
    if (!hasHeading(spec, /^public[- ]site integration\b/i)) {
      warn(`module-specifications/${m.id}.md`, 'No "## Public-site integration" section: write how the public product reads this data (read path, caching, timing, fallback, preview, rollback), or "N/A - admin-only".');
    }
    const permSection = sectionOf(spec, /^permissions\b/i);
    if (permSection && permissions.size) {
      for (const k of new Set([...permSection.matchAll(/`([a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*)`/g)].map((x) => x[1]))) {
        if (!permissions.has(k)) warn(`module-specifications/${m.id}.md`, `Permission "${k}" is used in the spec but not in permission-matrix.md.`);
      }
    }
  }

  const impl = readDoc('implementation-status.md');
  if (impl) {
    const t = findTable(impl, ['moduleid', 'verified', 'evidence']);
    if (!t) err('implementation-status.md', 'Verification table not found (columns: Module ID, Verified, Evidence, Backend, Known gaps).');
    else {
      const mIx = colIndex(t, 'moduleid'), vIx = colIndex(t, 'verified'), eIx = colIndex(t, 'evidence');
      const rows = new Map(t.rows.map((r) => [clean(r.cells[mIx]), { v: clean(r.cells[vIx]).toLowerCase(), e: r.cells[eIx], line: r.line }]));
      for (const id of rows.keys()) if (!modules.has(id)) warn('implementation-status.md', `Row "${id}" is not a module in module-inventory.md.`);
      // a module cannot be done (or exist as real) while its data source is still the mock adapter
      const backend = findTable(impl, ['moduleid', 'datasource']);
      if (backend) {
        const bm = colIndex(backend, 'moduleid'), bd = colIndex(backend, 'datasource');
        for (const r of backend.rows) {
          const id = clean(r.cells[bm]);
          const src = clean(r.cells[bd]).toLowerCase();
          if (!['api', 'mock', '-', ''].includes(src)) warn(`implementation-status.md:${r.line}`, `${id}: Data source "${src}" should be "api" or "mock".`);
          if (src === 'mock' && modules.get(id)?.status === 'done') err(`implementation-status.md:${r.line}`, `Module "${id}" is done but its Data source is still "mock" - connect the real backend first.`);
        }
      }
      for (const m of modules.values()) {
        if (m.status !== 'done') continue;
        const row = rows.get(m.id);
        if (!row) err('implementation-status.md', `Module "${m.id}" is marked done but has no verification row.`);
        else {
          if (row.v !== 'yes') err(`implementation-status.md:${row.line}`, `Module "${m.id}" is done but Verified="${row.v}" - verify it or set status back to in-progress.`);
          if (isEmptyVal(row.e)) err(`implementation-status.md:${row.line}`, `Module "${m.id}" is done but has no verification evidence.`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------- final
if (at('final') && modules.size) {
  for (const m of modules.values()) {
    if (['planned', 'in-progress', 'proposed', 'prototype'].includes(m.status)) {
      const note = m.status === 'prototype' ? ' (UI prototype on mock data - backend not connected)' : '';
      (m.priority === 'P0' ? err : warn)('module-inventory.md', `${m.priority} module "${m.id}" is still "${m.status}" at final stage${note}.`);
    }
  }
  const qa = readDoc('qa-report.md');
  if (qa && !hasHeading(qa, /summary|verdict/i)) warn('qa-report.md', 'No Summary/Verdict section.');
}

// ---------------------------------------------------------------- output
const errors = results.filter((r) => r.level === 'error');
const warns = results.filter((r) => r.level === 'warn');
if (AS_JSON) {
  console.log(JSON.stringify({ stage: STAGE, docs: DOCS, errors: errors.length, warnings: warns.length, results }, null, 2));
} else {
  console.log(`Admin docs validation - stage: ${STAGE} - ${DOCS}`);
  for (const r of results.filter((x) => x.level === 'ok')) console.log(`  OK    ${r.file}: ${r.msg}`);
  for (const r of warns) console.log(`  WARN  ${r.file}: ${r.msg}`);
  for (const r of errors) console.log(`  ERROR ${r.file}: ${r.msg}`);
  console.log(`\n${errors.length} error(s), ${warns.length} warning(s).`);
}
process.exit(errors.length || (STRICT && warns.length) ? 1 : 0);
