#!/usr/bin/env node
/**
 * scan-project.mjs - deterministic first pass for the admin-discovery skill.
 *
 * Maps an existing web project: stack, routes, API endpoints, data models,
 * enums/status hints, existing admin footprint, auth/role hints, public forms,
 * i18n, seed files, env var NAMES (never values) and likely business domains.
 *
 * Usage:
 *   node scan-project.mjs [projectRoot] [--out file.json] [--md] [--max-files N]
 *
 * No dependencies. Node >= 18. Output is a MAP, not truth - verify by reading files.
 */
import fs from 'node:fs';
import path from 'node:path';

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('Usage: node scan-project.mjs [projectRoot] [--out file.json] [--md] [--max-files N]');
  process.exit(0);
}
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !['--out', '--max-files'].includes(argv[i - 1]));
const ROOT = path.resolve(positional[0] || '.');
const OUT = opt('--out', null);
const MAX_FILES = Number(opt('--max-files', 25000));
const AS_MD = flag('--md');

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(`Not a directory: ${ROOT}`);
  process.exit(2);
}

const warnings = [];
const posix = (p) => p.split(path.sep).join('/');

// ----------------------------------------------------------------------------
// File walking
// ----------------------------------------------------------------------------
const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.output', 'dist', 'build', 'out', 'coverage',
  '.turbo', '.vercel', '.cache', 'vendor', 'venv', '.venv', '__pycache__', 'target', '.idea', '.vscode',
  'storybook-static', '.parcel-cache', '.yarn', '.pnpm-store', 'tmp', '.gradle', 'obj',
]);

function walk(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) stack.push(full);
      } else if (e.isFile()) {
        files.push(posix(path.relative(root, full)));
        if (files.length >= MAX_FILES) {
          warnings.push(`File limit ${MAX_FILES} reached; scan truncated. Use --max-files to raise.`);
          return files;
        }
      }
    }
  }
  return files.sort();
}

const FILES = walk(ROOT);
const readCache = new Map();
function read(rel, cap = 400_000) {
  if (readCache.has(rel)) return readCache.get(rel);
  let txt = '';
  try {
    const full = path.join(ROOT, rel);
    const st = fs.statSync(full);
    if (st.size <= cap) txt = fs.readFileSync(full, 'utf8');
    else txt = fs.readFileSync(full, 'utf8').slice(0, cap);
  } catch { /* unreadable */ }
  readCache.set(rel, txt);
  return txt;
}
const filesMatching = (re) => FILES.filter((f) => re.test(f));
const isCode = (f) => /\.(m?[jt]sx?|vue|svelte|astro)$/.test(f);
const isTestFile = (f) => /(\.|\/)(test|spec|stories)\.|__tests__|\/e2e\//.test(f);

// ----------------------------------------------------------------------------
// Small parsing helpers
// ----------------------------------------------------------------------------
/** Find matching closing brace for the opening brace at openIdx, skipping strings and comments. */
function matchBrace(text, openIdx) {
  const open = text[openIdx];
  const close = { '{': '}', '(': ')', '[': ']' }[open];
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { i = text.indexOf('*/', i + 2); if (i < 0) return -1; i++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < text.length && text[i] !== q) { if (text[i] === '\\') i++; i++; }
      continue;
    }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** Split a block of object-literal text on top-level commas. */
function splitTopLevel(str) {
  const parts = [];
  let depth = 0, cur = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; cur += c; i++;
      while (i < str.length && str[i] !== q) { if (str[i] === '\\') { cur += str[i++]; } cur += str[i++] ?? ''; }
      cur += q; continue;
    }
    if ('{[('.includes(c)) depth++;
    else if ('}])'.includes(c)) depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

/** Extract `key: value` pairs at top level of an object literal body. */
function objectEntries(body) {
  const out = [];
  for (const part of splitTopLevel(body)) {
    const m = part.trim().match(/^['"]?([A-Za-z_$][\w$]*)['"]?\s*:\s*([\s\S]*)$/);
    if (m) out.push([m[1], m[2].trim()]);
  }
  return out;
}

const uniq = (arr) => [...new Set(arr)];
const cap = (arr, n) => arr.slice(0, n);

// ----------------------------------------------------------------------------
// package.json / stack detection
// ----------------------------------------------------------------------------
const pkgFiles = filesMatching(/(^|\/)package\.json$/).filter((f) => f.split('/').length <= 5);
const deps = {};
const pkgInfo = [];
for (const f of pkgFiles) {
  try {
    const j = JSON.parse(read(f));
    const all = { ...(j.dependencies || {}), ...(j.devDependencies || {}) };
    Object.assign(deps, all);
    pkgInfo.push({ file: f, name: j.name, scripts: Object.keys(j.scripts || {}), workspaces: j.workspaces || null, type: j.type || null });
  } catch { warnings.push(`Could not parse ${f}`); }
}

const TECH = {
  framework: {
    next: 'Next.js', react: 'React', vue: 'Vue', nuxt: 'Nuxt', svelte: 'Svelte', '@sveltejs/kit': 'SvelteKit',
    '@angular/core': 'Angular', '@remix-run/react': 'Remix', astro: 'Astro', gatsby: 'Gatsby', vite: 'Vite',
    'react-scripts': 'Create React App', 'react-router-dom': 'React Router', 'react-router': 'React Router',
    express: 'Express', '@nestjs/core': 'NestJS', fastify: 'Fastify', hono: 'Hono', koa: 'Koa', '@trpc/server': 'tRPC',
  },
  ui: {
    antd: 'Ant Design', '@ant-design/pro-components': 'Ant Design Pro Components', '@ant-design/pro-table': 'ProTable',
    '@mui/material': 'MUI', '@mui/x-data-grid': 'MUI DataGrid', '@chakra-ui/react': 'Chakra UI', '@mantine/core': 'Mantine',
    tailwindcss: 'Tailwind CSS', '@radix-ui/react-dialog': 'Radix UI', '@headlessui/react': 'Headless UI',
    '@refinedev/core': 'Refine', 'react-admin': 'react-admin', primereact: 'PrimeReact', 'element-plus': 'Element Plus',
    vuetify: 'Vuetify', '@nextui-org/react': 'NextUI', '@heroui/react': 'HeroUI', daisyui: 'daisyUI', bootstrap: 'Bootstrap',
    'react-bootstrap': 'React Bootstrap', '@tremor/react': 'Tremor', 'lucide-react': 'lucide-react',
    '@ant-design/icons': 'Ant Design Icons', '@tabler/icons-react': 'Tabler Icons', sonner: 'sonner (toasts)',
    'react-hot-toast': 'react-hot-toast', 'framer-motion': 'Framer Motion', 'class-variance-authority': 'CVA (shadcn-style)',
  },
  table: {
    '@tanstack/react-table': 'TanStack Table', 'ag-grid-community': 'AG Grid', 'react-data-grid': 'react-data-grid',
    'material-react-table': 'Material React Table', 'mantine-react-table': 'Mantine React Table',
  },
  forms: {
    'react-hook-form': 'react-hook-form', formik: 'Formik', zod: 'Zod', yup: 'Yup', valibot: 'Valibot',
    '@hookform/resolvers': 'hookform resolvers', 'react-final-form': 'react-final-form',
  },
  data: {
    '@tanstack/react-query': 'TanStack Query', swr: 'SWR', '@apollo/client': 'Apollo Client', axios: 'Axios', ky: 'ky',
    '@trpc/client': 'tRPC client', zustand: 'Zustand', redux: 'Redux', '@reduxjs/toolkit': 'Redux Toolkit', jotai: 'Jotai', pinia: 'Pinia',
  },
  charts: {
    recharts: 'Recharts', echarts: 'ECharts', 'chart.js': 'Chart.js', '@nivo/core': 'Nivo', apexcharts: 'ApexCharts',
    '@ant-design/charts': 'Ant Design Charts', '@visx/visx': 'visx', victory: 'Victory',
  },
  editor: {
    '@tiptap/react': 'Tiptap', quill: 'Quill', 'react-quill': 'react-quill', slate: 'Slate', '@ckeditor/ckeditor5-react': 'CKEditor',
    lexical: 'Lexical', '@mdxeditor/editor': 'MDXEditor', 'draft-js': 'Draft.js',
  },
  auth: {
    'next-auth': 'NextAuth/Auth.js', '@auth/core': 'Auth.js', 'better-auth': 'Better Auth', '@clerk/nextjs': 'Clerk',
    '@supabase/supabase-js': 'Supabase', '@supabase/ssr': 'Supabase SSR', firebase: 'Firebase', 'firebase-admin': 'Firebase Admin',
    passport: 'Passport', jsonwebtoken: 'JWT (jsonwebtoken)', jose: 'jose (JWT)', lucia: 'Lucia', '@auth0/nextjs-auth0': 'Auth0',
    'iron-session': 'iron-session', bcrypt: 'bcrypt', bcryptjs: 'bcryptjs', argon2: 'argon2',
  },
  database: {
    prisma: 'Prisma', '@prisma/client': 'Prisma Client', 'drizzle-orm': 'Drizzle', typeorm: 'TypeORM', mongoose: 'Mongoose',
    sequelize: 'Sequelize', knex: 'Knex', kysely: 'Kysely', pg: 'PostgreSQL (pg)', mysql2: 'MySQL', mongodb: 'MongoDB',
    'better-sqlite3': 'SQLite', '@libsql/client': 'libSQL/Turso', '@neondatabase/serverless': 'Neon', '@planetscale/database': 'PlanetScale',
    '@vercel/postgres': 'Vercel Postgres', redis: 'Redis', ioredis: 'Redis (ioredis)', '@upstash/redis': 'Upstash Redis', 'mikro-orm': 'MikroORM',
  },
  integrations: {
    stripe: 'Stripe', '@stripe/stripe-js': 'Stripe.js', paypal: 'PayPal', '@paypal/react-paypal-js': 'PayPal', twilio: 'Twilio',
    '@sendgrid/mail': 'SendGrid', resend: 'Resend', nodemailer: 'Nodemailer', '@aws-sdk/client-s3': 'AWS S3', 'aws-sdk': 'AWS SDK',
    cloudinary: 'Cloudinary', uploadthing: 'UploadThing', '@vercel/blob': 'Vercel Blob', algoliasearch: 'Algolia', meilisearch: 'Meilisearch',
    '@sentry/nextjs': 'Sentry', '@sentry/node': 'Sentry', 'posthog-js': 'PostHog', '@vercel/analytics': 'Vercel Analytics',
    bullmq: 'BullMQ', bull: 'Bull', agenda: 'Agenda', 'node-cron': 'node-cron', inngest: 'Inngest', '@trigger.dev/sdk': 'Trigger.dev',
    'socket.io': 'Socket.IO', pusher: 'Pusher', ably: 'Ably', openai: 'OpenAI', '@anthropic-ai/sdk': 'Anthropic SDK',
    sharp: 'sharp', pdfkit: 'PDFKit', puppeteer: 'Puppeteer', exceljs: 'ExcelJS', xlsx: 'SheetJS', papaparse: 'PapaParse', 'csv-parse': 'csv-parse',
  },
  i18n: {
    'next-intl': 'next-intl', i18next: 'i18next', 'react-i18next': 'react-i18next', 'next-i18next': 'next-i18next',
    'date-fns': 'date-fns', dayjs: 'dayjs', moment: 'Moment', luxon: 'Luxon',
  },
  testing: {
    '@playwright/test': 'Playwright', cypress: 'Cypress', vitest: 'Vitest', jest: 'Jest', '@testing-library/react': 'Testing Library',
  },
};

const stack = {};
for (const [cat, map] of Object.entries(TECH)) {
  const hits = [];
  for (const [dep, label] of Object.entries(map)) if (deps[dep]) hits.push({ name: label, dep, version: deps[dep] });
  if (hits.length) stack[cat] = hits;
}
if (FILES.includes('components.json')) (stack.ui ||= []).push({ name: 'shadcn/ui (components.json present)', dep: 'components.json', version: '' });
if (FILES.some((f) => /^tailwind\.config\.[cm]?[jt]s$/.test(f)) && !stack.ui?.some((u) => u.dep === 'tailwindcss')) {
  (stack.ui ||= []).push({ name: 'Tailwind CSS (config present)', dep: 'tailwind.config', version: '' });
}

const languages = [];
if (FILES.some((f) => /\.tsx?$/.test(f)) || FILES.includes('tsconfig.json')) languages.push('TypeScript');
if (FILES.some((f) => /\.jsx?$/.test(f))) languages.push('JavaScript');
const markerLangs = [
  [/(^|\/)(requirements\.txt|pyproject\.toml|Pipfile)$/, 'Python'],
  [/(^|\/)composer\.json$/, 'PHP'],
  [/(^|\/)Gemfile$/, 'Ruby'],
  [/(^|\/)go\.mod$/, 'Go'],
  [/(^|\/)(pom\.xml|build\.gradle(\.kts)?)$/, 'Java/Kotlin'],
  [/\.csproj$/, '.NET'],
];
for (const [re, lang] of markerLangs) if (FILES.some((f) => re.test(f))) languages.push(lang);

const backendFrameworks = [];
const pyFiles = filesMatching(/(^|\/)(requirements\.txt|pyproject\.toml|Pipfile)$/).map((f) => read(f)).join('\n').toLowerCase();
for (const [k, label] of [['django', 'Django'], ['fastapi', 'FastAPI'], ['flask', 'Flask']]) if (pyFiles.includes(k)) backendFrameworks.push(label);
const phpFiles = filesMatching(/(^|\/)composer\.json$/).map((f) => read(f)).join('\n');
if (/laravel\/framework/.test(phpFiles)) backendFrameworks.push('Laravel');
if (/symfony\//.test(phpFiles)) backendFrameworks.push('Symfony');
if (FILES.some((f) => /(^|\/)Gemfile$/.test(f)) && /rails/.test(filesMatching(/(^|\/)Gemfile$/).map((f) => read(f)).join('\n'))) backendFrameworks.push('Rails');
const javaBuild = filesMatching(/(^|\/)(pom\.xml|build\.gradle(\.kts)?)$/).map((f) => read(f)).join('\n');
if (/spring-boot/.test(javaBuild)) backendFrameworks.push('Spring Boot');
if (backendFrameworks.length) stack.backend = backendFrameworks.map((n) => ({ name: n, dep: '', version: '' }));

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------
const pageRoutes = [];
const apiRoutes = [];
const serverActions = [];

function cleanRoute(segments) {
  const groups = [];
  const kept = [];
  for (const s of segments) {
    if (/^\(.+\)$/.test(s)) { groups.push(s); continue; }
    if (/^@/.test(s)) continue; // parallel route slots
    kept.push(s);
  }
  return { route: '/' + kept.join('/'), groups };
}

for (const f of FILES) {
  // Next.js app router pages
  let m = f.match(/(?:^|\/)app\/(.*?)\/?page\.(?:tsx|ts|jsx|js|mdx)$/);
  if (m !== null && /(?:^|\/)app\//.test(f)) {
    const segs = m[1] ? m[1].split('/') : [];
    const { route, groups } = cleanRoute(segs);
    pageRoutes.push({ route: route === '/' ? '/' : route, file: f, router: 'next-app', groups });
    continue;
  }
  // Next.js app router route handlers
  m = f.match(/(?:^|\/)app\/(.*?)\/?route\.(?:ts|js)$/);
  if (m !== null && /(?:^|\/)app\//.test(f)) {
    const { route } = cleanRoute(m[1] ? m[1].split('/') : []);
    const src = read(f);
    const methods = uniq([
      ...[...src.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((x) => x[1]),
      ...[...src.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((x) => x[1]),
    ]);
    for (const method of methods.length ? methods : ['?']) apiRoutes.push({ method, path: route, file: f, kind: 'next-route-handler' });
    continue;
  }
  // Next.js pages router API
  m = f.match(/(?:^|\/)pages\/api\/(.+)\.(?:ts|js)$/);
  if (m) {
    const p = '/api/' + m[1].replace(/\/index$/, '');
    const src = read(f);
    const methods = uniq([...src.matchAll(/req\.method\s*={2,3}\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/g)].map((x) => x[1]));
    for (const method of methods.length ? methods : ['*']) apiRoutes.push({ method, path: p, file: f, kind: 'next-pages-api' });
    continue;
  }
  // Next.js pages router / Nuxt pages
  m = f.match(/(?:^|\/)pages\/(.+)\.(tsx|jsx|vue|mdx)$/);
  if (m && !/\/_/.test('/' + m[1]) && !m[1].startsWith('api/')) {
    const route = '/' + m[1].replace(/\/?index$/, '');
    pageRoutes.push({ route: route === '' ? '/' : route, file: f, router: m[2] === 'vue' ? 'nuxt-pages' : 'pages', groups: [] });
    continue;
  }
  // Remix / React Router v7 flat file routes (only when the dependency is present, to avoid clashing with Next.js `app/`)
  m = f.match(/(?:^|\/)app\/routes\/([^/]+)\.(?:tsx|jsx|ts|js)$/);
  if (m && (deps['@remix-run/react'] || deps['@react-router/dev'] || deps['@react-router/node'])) {
    const segs = m[1].split('.').filter((s) => !/^_[^i]|^_$/.test(s) || s === '_index').map((s) => (s === '_index' ? '' : s.startsWith('$') ? ':' + s.slice(1) : s.replace(/^\(|\)$/g, '')));
    pageRoutes.push({ route: '/' + segs.filter(Boolean).join('/'), file: f, router: 'remix', groups: [] });
    continue;
  }
  // SvelteKit
  m = f.match(/(?:^|\/)routes\/(.*?)\/?\+page\.svelte$/);
  if (m !== null) { pageRoutes.push({ route: '/' + (m[1] || ''), file: f, router: 'sveltekit', groups: [] }); continue; }
  m = f.match(/(?:^|\/)routes\/(.*?)\/?\+server\.(?:ts|js)$/);
  if (m !== null) { apiRoutes.push({ method: '*', path: '/' + (m[1] || ''), file: f, kind: 'sveltekit-endpoint' }); continue; }
}

const HTTP = '(get|post|put|patch|delete)';
const reExpress = new RegExp(`\\b(?:app|router|server|api|fastify|[A-Za-z]+Router|[A-Za-z]+Routes)\\.${HTTP}\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'g');
const rePy = new RegExp(`@\\w+\\.${HTTP}\\(\\s*['"]([^'"]+)['"]`, 'g');
const rePyFlask = /@\w+\.route\(\s*['"]([^'"]+)['"]/g;

for (const f of FILES) {
  if (isTestFile(f)) continue;
  if (/\.(m?[jt]s|tsx|jsx)$/.test(f) && !f.includes('/app/') && !/pages\/api\//.test(f)) {
    const src = read(f, 200_000);
    if (!src) continue;
    // Express / Fastify / Hono style
    if (/\b(express|fastify|hono|koa|Router)\b/.test(src)) {
      for (const m of src.matchAll(reExpress)) apiRoutes.push({ method: m[1].toUpperCase(), path: m[2], file: f, kind: 'express-like' });
    }
    // NestJS controllers
    if (src.includes('@Controller')) {
      const prefix = (src.match(/@Controller\(\s*['"`]?([^'"`)\s]*)/) || [, ''])[1];
      for (const m of src.matchAll(/@(Get|Post|Put|Patch|Delete)\(\s*['"`]?([^'"`)\s]*)/g)) {
        apiRoutes.push({ method: m[1].toUpperCase(), path: ('/' + prefix + '/' + m[2]).replace(/\/+/g, '/').replace(/\/$/, '') || '/', file: f, kind: 'nest' });
      }
    }
  }
  if (/\.py$/.test(f)) {
    const src = read(f, 200_000);
    for (const m of src.matchAll(rePy)) apiRoutes.push({ method: m[1].toUpperCase(), path: m[2], file: f, kind: 'python-decorator' });
    for (const m of src.matchAll(rePyFlask)) apiRoutes.push({ method: '*', path: m[1], file: f, kind: 'flask-route' });
    if (/(^|\/)urls\.py$/.test(f)) for (const m of src.matchAll(/\b(?:re_)?path\(\s*r?['"]([^'"]*)['"]/g)) apiRoutes.push({ method: '*', path: '/' + m[1], file: f, kind: 'django-url' });
  }
  if (/(^|\/)routes\/.*\.php$/.test(f)) {
    for (const m of read(f).matchAll(/Route::(get|post|put|patch|delete|resource|apiResource)\(\s*['"]([^'"]+)['"]/g)) {
      apiRoutes.push({ method: m[1].toUpperCase(), path: '/' + m[2].replace(/^\//, ''), file: f, kind: 'laravel' });
    }
  }
  if (/(^|\/)config\/routes\.rb$/.test(f)) {
    for (const m of read(f).matchAll(/\bresources?\s+:(\w+)/g)) apiRoutes.push({ method: 'CRUD', path: '/' + m[1], file: f, kind: 'rails-resources' });
  }
  // Server actions
  if (isCode(f) && /^['"]use server['"]/m.test(read(f, 60_000).slice(0, 400))) {
    const src = read(f, 120_000);
    const names = uniq([...src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map((x) => x[1]));
    serverActions.push({ file: f, actions: cap(names, 30) });
  }
  // Inline server actions inside components are not scanned (documented limitation).
}

// React Router style config routes (best effort)
for (const f of FILES) {
  if (!/\.(tsx|jsx|ts|js)$/.test(f) || isTestFile(f) || !/(router|routes|app|main|index)/i.test(path.basename(f))) continue;
  const src = read(f, 150_000);
  if (!/react-router|createBrowserRouter|<Route\b/.test(src)) continue;
  for (const m of src.matchAll(/(?:<Route\s+[^>]*path=|\bpath:\s*)["'`]([^"'`]+)["'`]/g)) {
    pageRoutes.push({ route: m[1].startsWith('/') ? m[1] : '/' + m[1], file: f, router: 'react-router', groups: [] });
  }
}

// ----------------------------------------------------------------------------
// Data models
// ----------------------------------------------------------------------------
const models = [];
const enums = [];

const SOFT_DELETE_RE = /^(deletedAt|deleted_at|isDeleted|is_deleted|archivedAt|archived_at|isArchived)$/i;
const STATUS_RE = /^(status|state|stage|step)$/i;
const ROLE_RE = /^(role|roles|isAdmin|is_admin|is_staff|is_superuser|permissions)$/i;
const AUDIT_RE = /^(createdBy|created_by|updatedBy|updated_by)$/i;

function modelFlags(fieldNames, fieldTypes = {}, enumNames = new Set()) {
  return {
    softDelete: fieldNames.some((n) => SOFT_DELETE_RE.test(n)),
    status: fieldNames.some((n) => STATUS_RE.test(n)) || Object.values(fieldTypes).some((t) => enumNames.has(t) && /status|state|stage/i.test(t)),
    role: fieldNames.some((n) => ROLE_RE.test(n)),
    auditColumns: fieldNames.some((n) => AUDIT_RE.test(n)),
    timestamps: fieldNames.some((n) => /^(createdAt|created_at)$/i.test(n)),
  };
}

// Prisma
const prismaFiles = filesMatching(/\.prisma$/);
const prismaModels = [];
const prismaEnums = [];
for (const f of prismaFiles) {
  const src = read(f);
  for (const m of src.matchAll(/^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    if (m[1] === 'enum') {
      const values = m[3].split('\n').map((l) => l.replace(/\/\/.*$/, '').trim()).filter((l) => /^\w+/.test(l) && !l.startsWith('@@')).map((l) => l.split(/\s+/)[0]);
      prismaEnums.push({ name: m[2], values, file: f, source: 'prisma' });
    } else {
      const fields = [];
      for (const raw of m[3].split('\n')) {
        const line = raw.replace(/\/\/.*$/, '').trim();
        if (!line || line.startsWith('@@')) continue;
        const fm = line.match(/^(\w+)\s+([\w.]+)(\[\])?(\?)?\s*(.*)$/);
        if (!fm) continue;
        const attrs = fm[5] || '';
        fields.push({
          name: fm[1], type: fm[2], list: !!fm[3], optional: !!fm[4],
          id: /@id\b/.test(attrs), unique: /@unique\b/.test(attrs),
          default: (attrs.match(/@default\(((?:[^()]|\([^()]*\))*)\)/) || [, null])[1],
          hasRelationAttr: /@relation\b/.test(attrs),
        });
      }
      prismaModels.push({ name: m[2], file: f, fields });
    }
  }
}
const prismaModelNames = new Set(prismaModels.map((m) => m.name));
const prismaEnumNames = new Set(prismaEnums.map((e) => e.name));
for (const pm of prismaModels) {
  const relations = pm.fields.filter((f) => prismaModelNames.has(f.type)).map((f) => ({ field: f.name, to: f.type, list: f.list }));
  const types = Object.fromEntries(pm.fields.map((f) => [f.name, f.type]));
  models.push({
    name: pm.name, source: 'prisma', file: pm.file,
    fieldCount: pm.fields.length,
    fields: cap(pm.fields.filter((f) => !prismaModelNames.has(f.type)).map((f) => ({
      name: f.name, type: f.type + (f.list ? '[]' : '') + (f.optional ? '?' : ''),
      ...(f.id ? { id: true } : {}), ...(f.unique ? { unique: true } : {}), ...(f.default ? { default: f.default } : {}),
      ...(prismaEnumNames.has(f.type) ? { enum: true } : {}),
    })), 45),
    relations,
    flags: modelFlags(pm.fields.map((f) => f.name), types, prismaEnumNames),
  });
}
enums.push(...prismaEnums);

// Drizzle
for (const f of filesMatching(/\.(ts|js|mjs)$/)) {
  if (isTestFile(f)) continue;
  const src = read(f, 300_000);
  if (!/(pgTable|mysqlTable|sqliteTable)\(/.test(src)) continue;
  for (const m of src.matchAll(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)\(\s*['"]([^'"]+)['"]\s*,\s*\{/g)) {
    const openIdx = m.index + m[0].length - 1;
    const close = matchBrace(src, openIdx);
    if (close < 0) continue;
    const entries = objectEntries(src.slice(openIdx + 1, close));
    const fields = entries.map(([k, v]) => ({ name: k, type: (v.match(/^(\w+)\(/) || [, '?'])[1] }));
    const refs = entries.filter(([, v]) => /\.references\(/.test(v)).map(([k, v]) => ({ field: k, to: (v.match(/\.references\(\s*\(\)\s*=>\s*(\w+)/) || [, '?'])[1], list: false }));
    models.push({ name: m[2], source: 'drizzle', file: f, fieldCount: fields.length, fields: cap(fields, 45), relations: refs, flags: modelFlags(fields.map((x) => x.name)) });
  }
}

// Mongoose
for (const f of filesMatching(/\.(ts|js|mjs|cjs)$/)) {
  if (isTestFile(f)) continue;
  const src = read(f, 300_000);
  if (!/mongoose/.test(src) || !/new\s+(?:mongoose\.)?Schema\(/.test(src)) continue;
  const modelNames = [...src.matchAll(/mongoose\.model(?:<[^>]*>)?\(\s*['"](\w+)['"]/g)].map((x) => x[1]);
  let i = 0;
  for (const m of src.matchAll(/new\s+(?:mongoose\.)?Schema(?:<[^>]*>)?\(\s*\{/g)) {
    const openIdx = m.index + m[0].length - 1;
    const close = matchBrace(src, openIdx);
    if (close < 0) continue;
    const entries = objectEntries(src.slice(openIdx + 1, close));
    const fields = entries.map(([k, v]) => ({ name: k, type: (v.match(/^\{?\s*type:\s*(?:mongoose\.)?(?:Schema\.Types\.)?(\w+)/) || v.match(/^\[?\s*(?:mongoose\.)?(?:Schema\.Types\.)?(\w+)/) || [, '?'])[1] }));
    const refs = entries.filter(([, v]) => /\bref:\s*['"]/.test(v)).map(([k, v]) => ({ field: k, to: (v.match(/ref:\s*['"](\w+)/) || [, '?'])[1], list: v.trim().startsWith('[') }));
    models.push({ name: modelNames[i] || path.basename(f).replace(/\.\w+$/, ''), source: 'mongoose', file: f, fieldCount: fields.length, fields: cap(fields, 45), relations: refs, flags: modelFlags(fields.map((x) => x.name)) });
    i++;
  }
}

// TypeORM entities
for (const f of filesMatching(/\.(ts)$/)) {
  if (isTestFile(f)) continue;
  const src = read(f, 200_000);
  if (!src.includes('@Entity')) continue;
  for (const m of src.matchAll(/@Entity\([^)]*\)\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)[^{]*\{/g)) {
    const openIdx = m.index + m[0].length - 1;
    const close = matchBrace(src, openIdx);
    const body = close > 0 ? src.slice(openIdx + 1, close) : '';
    // decorators may sit on the same line as the property: `@Column() status: string;`
    const bodyNoDecorators = body.replace(/@\w+\((?:[^()]|\([^()]*\))*\)/g, ' ');
    const fields = [...bodyNoDecorators.matchAll(/(?:^|[\s;{])(?:public\s+|private\s+|protected\s+|readonly\s+)*(\w+)[!?]?:\s*([\w\[\]<>| .]+?);/g)].map((x) => ({ name: x[1], type: x[2].trim() }));
    const rels = [...body.matchAll(/@(ManyToOne|OneToMany|ManyToMany|OneToOne)\(\s*\(\)\s*=>\s*(\w+)/g)].map((x) => ({ field: x[1], to: x[2], list: /ToMany/.test(x[1]) }));
    models.push({ name: m[1], source: 'typeorm', file: f, fieldCount: fields.length, fields: cap(fields, 45), relations: rels, flags: modelFlags(fields.map((x) => x.name)) });
  }
}

// Sequelize (names only)
for (const f of filesMatching(/\.(ts|js|cjs|mjs)$/)) {
  if (isTestFile(f)) continue;
  const src = read(f, 200_000);
  if (!/sequelize/i.test(src)) continue;
  for (const m of src.matchAll(/\.define\(\s*['"](\w+)['"]\s*,\s*\{/g)) {
    const openIdx = m.index + m[0].length - 1;
    const close = matchBrace(src, openIdx);
    const fields = close > 0 ? objectEntries(src.slice(openIdx + 1, close)).map(([k]) => ({ name: k, type: '?' })) : [];
    models.push({ name: m[1], source: 'sequelize', file: f, fieldCount: fields.length, fields: cap(fields, 45), relations: [], flags: modelFlags(fields.map((x) => x.name)) });
  }
}

// SQL (migrations / schema dumps)
const sqlTables = new Map();
for (const f of filesMatching(/\.sql$/)) {
  const src = read(f, 600_000);
  for (const m of src.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([\w.]+)["`]?\s*\(/gi)) {
    const openIdx = m.index + m[0].length - 1;
    const close = matchBrace(src, openIdx);
    if (close < 0) continue;
    const body = src.slice(openIdx + 1, close);
    const fields = [];
    for (const part of splitTopLevel(body)) {
      const line = part.trim();
      if (!line || /^(constraint|primary|foreign|unique|key|index|check|exclude)\b/i.test(line)) continue;
      const fm = line.match(/^["`]?(\w+)["`]?\s+([\w]+(?:\([^)]*\))?(?:\[\])?)/);
      if (fm) fields.push({ name: fm[1], type: fm[2] });
    }
    const name = m[1].replace(/^public\./, '');
    if (!sqlTables.has(name)) sqlTables.set(name, { name, source: 'sql', file: f, fieldCount: fields.length, fields: cap(fields, 45), relations: [], flags: modelFlags(fields.map((x) => x.name)) });
    for (const rm of body.matchAll(/["`]?(\w+)["`]?\s+[\w()]+[^,]*?REFERENCES\s+["`]?(?:public\.)?(\w+)/gi)) sqlTables.get(name).relations.push({ field: rm[1], to: rm[2], list: false });
  }
  for (const m of src.matchAll(/CREATE\s+TYPE\s+["`]?([\w.]+)["`]?\s+AS\s+ENUM\s*\(([^)]*)\)/gi)) {
    enums.push({ name: m[1].replace(/^public\./, ''), values: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]), file: f, source: 'sql' });
  }
}
models.push(...sqlTables.values());

// Django models
for (const f of filesMatching(/(^|\/)models(\/[\w]+)?\.py$/)) {
  const src = read(f);
  for (const m of src.matchAll(/^class\s+(\w+)\((?:[\w.]*Model|models\.Model)\)\s*:([\s\S]*?)(?=^class\s|(?![\s\S]))/gm)) {
    const fields = [...m[2].matchAll(/^\s+(\w+)\s*=\s*models\.(\w+)\(/gm)].map((x) => ({ name: x[1], type: x[2] }));
    const rels = [...m[2].matchAll(/^\s+(\w+)\s*=\s*models\.(ForeignKey|OneToOneField|ManyToManyField)\(\s*['"]?([\w.]+)/gm)].map((x) => ({ field: x[1], to: x[3], list: x[2] === 'ManyToManyField' }));
    models.push({ name: m[1], source: 'django', file: f, fieldCount: fields.length, fields: cap(fields, 45), relations: rels, flags: modelFlags(fields.map((x) => x.name)) });
  }
}

// Laravel migrations
for (const f of filesMatching(/database\/migrations\/.*\.php$/)) {
  const src = read(f);
  for (const m of src.matchAll(/Schema::create\(\s*['"](\w+)['"]/g)) {
    const fields = [...src.matchAll(/\$table->(\w+)\(\s*['"](\w+)['"]/g)].map((x) => ({ name: x[2], type: x[1] }));
    models.push({ name: m[1], source: 'laravel-migration', file: f, fieldCount: fields.length, fields: cap(fields, 45), relations: [], flags: modelFlags(fields.map((x) => x.name)) });
  }
}

// Rails schema
for (const f of filesMatching(/(^|\/)db\/schema\.rb$/)) {
  const src = read(f);
  for (const m of src.matchAll(/create_table\s+"(\w+)"[^\n]*do\s*\|t\|([\s\S]*?)\n\s*end/g)) {
    const fields = [...m[2].matchAll(/t\.(\w+)\s+"(\w+)"/g)].map((x) => ({ name: x[2], type: x[1] }));
    models.push({ name: m[1], source: 'rails-schema', file: f, fieldCount: fields.length, fields: cap(fields, 45), relations: [], flags: modelFlags(fields.map((x) => x.name)) });
  }
}

// Status unions and TS enums (lifecycle hints)
const statusHints = [];
for (const f of filesMatching(/\.(ts|tsx)$/)) {
  if (isTestFile(f) || f.endsWith('.d.ts')) continue;
  const src = read(f, 200_000);
  for (const m of src.matchAll(/\b(\w*[sS]tatus|\w*[sS]tate|\w*[sS]tage)\??\s*[:=]\s*((?:['"][\w -]+['"]\s*\|\s*)+['"][\w -]+['"])/g)) {
    const values = [...m[2].matchAll(/['"]([\w -]+)['"]/g)].map((x) => x[1]);
    statusHints.push({ name: m[1], values, file: f });
  }
  for (const m of src.matchAll(/\b(?:export\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g)) {
    const values = m[2].split(',').map((s) => s.trim().split(/\s*=\s*/)[0]).filter(Boolean);
    if (values.length) enums.push({ name: m[1], values, file: f, source: 'ts-enum' });
  }
}

// Deduplicate models by name+source
const seenModel = new Set();
const modelsDedup = models.filter((m) => { const k = m.source + ':' + m.name; if (seenModel.has(k)) return false; seenModel.add(k); return true; });

// ----------------------------------------------------------------------------
// Existing admin footprint, auth, roles
// ----------------------------------------------------------------------------
const adminStrict = FILES.filter((f) => /(^|\/)(admin|backoffice|back-office|cms)(\/|[.-])/i.test(f));
const adminSoft = FILES.filter((f) => /(^|\/)(dashboard|manage|management|console)(\/|\.)/i.test(f) && !adminStrict.includes(f));
const adminRoutes = pageRoutes.filter((r) => /\/(admin|backoffice|back-office|cms|manage)(\/|$)/i.test(r.route));
const dashboardRoutes = pageRoutes.filter((r) => /\/dashboard(\/|$)/i.test(r.route) && !adminRoutes.includes(r));

const roleValues = new Map();
for (const f of FILES) {
  if (!isCode(f) && !/\.py$/.test(f)) continue;
  if (isTestFile(f)) continue;
  const src = read(f, 120_000);
  if (!/role|permission|is_staff|isAdmin/i.test(src)) continue;
  for (const m of src.matchAll(/\brole[s]?\s*(?:===|!==|==|!=)\s*['"]([\w-]+)['"]/g)) roleValues.set(m[1], (roleValues.get(m[1]) || 0) + 1);
  for (const m of src.matchAll(/\broles?\.includes\(\s*['"]([\w-]+)['"]/g)) roleValues.set(m[1], (roleValues.get(m[1]) || 0) + 1);
  for (const m of src.matchAll(/\bhasRole\(\s*['"]([\w-]+)['"]/g)) roleValues.set(m[1], (roleValues.get(m[1]) || 0) + 1);
}
for (const e of enums) if (/role/i.test(e.name)) for (const v of e.values) roleValues.set(v, (roleValues.get(v) || 0) + 1);

const authFiles = FILES.filter((f) => /(^|\/)(auth|session|lib\/auth|utils\/auth)\.(ts|js|tsx)$|\[\.\.\.nextauth\]|auth\.config\.|(^|\/)(middleware|proxy)\.(ts|js)$/i.test(f)).filter((f) => !/node_modules/.test(f));
const middlewareFiles = FILES.filter((f) => /(^|\/)(middleware|proxy)\.(ts|js)$/.test(f));
const roleModels = uniq(modelsDedup.filter((m) => m.flags.role).map((m) => m.name));
const loginPages = pageRoutes.filter((r) => /\/(login|signin|sign-in|register|signup|sign-up)(\/|$)/i.test(r.route)).map((r) => r.route);

// ----------------------------------------------------------------------------
// Public forms, shared UI, data/content, i18n, seed, env
// ----------------------------------------------------------------------------
const publicForms = [];
for (const f of FILES) {
  if (!/\.(tsx|jsx|vue|svelte|astro|html)$/.test(f) || isTestFile(f)) continue;
  if (adminStrict.includes(f)) continue;
  const src = read(f, 120_000);
  if (/<form\b|useForm\(|<Form\b/.test(src)) {
    const posts = uniq([...src.matchAll(/(?:fetch|axios\.post|axios\.put|api\.post)\(\s*['"`]([^'"`]+)['"`]/g)].map((x) => x[1]));
    publicForms.push({ file: f, endpoints: cap(posts, 4) });
  }
}

const uiComponents = FILES.filter((f) => /(^|\/)components\/ui\/[^/]+\.(tsx|jsx|vue)$/.test(f)).map((f) => path.basename(f).replace(/\.\w+$/, ''));
const componentDirs = uniq(FILES.filter((f) => /(^|\/)components\/[^/]+\//.test(f)).map((f) => f.match(/(^|\/)components\/([^/]+)\//)[2]));
const contentFiles = FILES.filter((f) => /(^|\/)(data|content|constants)\/[^/]+\.(json|ts|js|md|mdx|ya?ml)$/.test(f));

const localeFiles = FILES.filter((f) => /(^|\/)(locales?|messages|i18n|lang|translations)\/[^/]+\.(json|ts|js|ya?ml)$/.test(f));
const locales = uniq(localeFiles.map((f) => path.basename(f).replace(/\.\w+$/, ''))).filter((n) => /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(n));

const seedFiles = FILES.filter((f) => /(^|\/)(seed|seeds|seeders|fixtures)(\/|\.)|seed\.(ts|js|py|rb|sql)$/i.test(f));
const envExamples = FILES.filter((f) => /(^|\/)\.env\.(example|sample|template|local\.example)$/.test(f));
const envNames = [];
for (const f of envExamples) for (const m of read(f).matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)) envNames.push(m[1]);

// ----------------------------------------------------------------------------
// Domain hints
// ----------------------------------------------------------------------------
const DOMAIN_KEYWORDS = {
  'ecommerce': ['product', 'cart', 'order', 'checkout', 'sku', 'coupon', 'inventory', 'shipping', 'variant', 'catalog', 'collection'],
  'travel-booking': ['tour', 'destination', 'booking', 'itinerary', 'hotel', 'room', 'departure', 'traveler', 'traveller', 'package', 'availability'],
  'education-lms': ['course', 'lesson', 'student', 'enrollment', 'instructor', 'quiz', 'class', 'certificate', 'teacher', 'cohort', 'assessment', 'attendance'],
  'corporate-agency': ['portfolio', 'testimonial', 'service', 'team', 'casestudy', 'project', 'client', 'inquiry', 'quote'],
  'news-publishing': ['article', 'post', 'category', 'tag', 'author', 'comment', 'newsletter', 'editorial'],
  'saas': ['tenant', 'organization', 'workspace', 'subscription', 'plan', 'apikey', 'webhook', 'seat', 'membership', 'usage', 'invoice'],
  'marketplace': ['vendor', 'seller', 'commission', 'payout', 'dispute', 'provider', 'merchant'],
  'healthcare-appointments': ['patient', 'doctor', 'appointment', 'clinic', 'treatment', 'prescription', 'practitioner', 'therapist'],
  'real-estate': ['property', 'listing', 'agent', 'viewing', 'unit', 'broker', 'landlord'],
  'job-board': ['job', 'candidate', 'application', 'resume', 'employer', 'applicant', 'cv', 'interview'],
  'fnb-ordering': ['menu', 'menuitem', 'reservation', 'table', 'kitchen', 'dish', 'branch'],
  'events-ticketing': ['event', 'ticket', 'attendee', 'venue', 'checkin', 'speaker', 'session', 'seat'],
  'community-ugc': ['thread', 'report', 'moderation', 'ban', 'reputation', 'follow', 'reaction', 'group', 'flag'],
  'fintech-kyc': ['wallet', 'transaction', 'kyc', 'loan', 'ledger', 'account', 'transfer', 'deposit', 'withdrawal'],
};
function tokens(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).flatMap((t) => [t, t.replace(/ies$/, 'y').replace(/s$/, '')]);
}
const bag = new Set();
for (const m of modelsDedup) tokens(m.name).forEach((t) => bag.add(t));
for (const r of [...pageRoutes, ...apiRoutes]) tokens(r.route || r.path).forEach((t) => bag.add(t));
const domainHints = Object.entries(DOMAIN_KEYWORDS).map(([domain, kws]) => {
  const matched = kws.filter((k) => bag.has(k) || bag.has(k.replace(/s$/, '')));
  return { domain, score: matched.length, keywords: matched };
}).filter((d) => d.score >= 2).sort((a, b) => b.score - a.score).slice(0, 4);
if (stack.integrations?.some((i) => /Stripe|PayPal/.test(i.name))) {
  for (const d of domainHints) if (['ecommerce', 'saas', 'fintech-kyc', 'marketplace'].includes(d.domain)) d.keywords.push('(payment SDK present)');
}

// ----------------------------------------------------------------------------
// Assemble report
// ----------------------------------------------------------------------------
const byRoute = (a, b) => a.route.localeCompare(b.route);
const report = {
  root: ROOT,
  scannedAt: new Date().toISOString(),
  fileCount: FILES.length,
  note: 'This is a MAP produced by regex heuristics, not truth. Verify by reading the referenced files.',
  stack: { languages: uniq(languages), ...stack },
  packages: pkgInfo,
  routes: {
    pages: cap(pageRoutes.sort(byRoute), 500),
    api: cap(apiRoutes.sort((a, b) => a.path.localeCompare(b.path)), 600),
    serverActions: cap(serverActions, 80),
  },
  models: cap(modelsDedup, 400),
  enums: cap(enums, 150),
  statusHints: cap(statusHints, 80),
  existingAdmin: {
    exists: adminStrict.length > 0 || adminRoutes.length > 0,
    adminFiles: cap(adminStrict, 80),
    adminRoutes: cap(adminRoutes.map((r) => r.route), 80),
    dashboardLikeFiles: cap(adminSoft, 40),
    dashboardLikeRoutes: cap(dashboardRoutes.map((r) => r.route), 40),
  },
  auth: {
    files: cap(authFiles, 20),
    middleware: middlewareFiles,
    loginPages: uniq(loginPages),
    modelsWithRoleFields: roleModels,
    roleValuesSeenInCode: [...roleValues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([role, count]) => ({ role, count })),
  },
  publicForms: cap(publicForms, 40),
  sharedUI: { uiComponents: cap(uiComponents, 80), componentDirs: cap(componentDirs, 40) },
  contentFiles: cap(contentFiles, 40),
  i18n: { localeFiles: cap(localeFiles, 20), locales },
  seedFiles: cap(seedFiles, 20),
  env: { files: envExamples, namesOnly: uniq(envNames) },
  domainHints,
  warnings,
};

// ----------------------------------------------------------------------------
// Markdown summary
// ----------------------------------------------------------------------------
function toMarkdown(r) {
  const L = [];
  const names = (arr) => (arr || []).map((x) => x.name + (x.version ? ` ${x.version}` : '')).join(', ') || '-';
  L.push(`# Project scan: ${path.basename(r.root)}`);
  L.push(`Files scanned: ${r.fileCount}  |  ${r.note}`);
  L.push('', '## Stack');
  L.push(`- Languages: ${r.stack.languages.join(', ') || '-'}`);
  for (const k of ['framework', 'backend', 'ui', 'table', 'forms', 'data', 'charts', 'editor', 'auth', 'database', 'integrations', 'i18n', 'testing']) if (r.stack[k]) L.push(`- ${k}: ${names(r.stack[k])}`);
  L.push('', '## Domain hints (heuristic)');
  if (r.domainHints.length) for (const d of r.domainHints) L.push(`- ${d.domain} (score ${d.score}): ${d.keywords.join(', ')}`);
  else L.push('- none matched -> use references/domains/_custom-domain-playbook.md');
  L.push('', `## Data models (${r.models.length})`);
  for (const m of r.models.slice(0, 80)) {
    const f = Object.entries(m.flags).filter(([, v]) => v).map(([k]) => k).join(',');
    const rel = m.relations.map((x) => `${x.to}${x.list ? '[]' : ''}`).join(', ');
    L.push(`- ${m.name} [${m.source}] ${m.fieldCount} fields${rel ? ` -> ${rel}` : ''}${f ? `  {${f}}` : ''}  (${m.file})`);
  }
  if (r.enums.length) { L.push('', '## Enums / status hints'); for (const e of r.enums.slice(0, 40)) L.push(`- ${e.name}: ${e.values.join(' | ')}`); for (const s of r.statusHints.slice(0, 20)) L.push(`- (union) ${s.name}: ${s.values.join(' | ')}  (${s.file})`); }
  L.push('', `## Public pages (${r.routes.pages.length})`);
  for (const p of r.routes.pages.slice(0, 60)) L.push(`- ${p.route}  (${p.file})`);
  L.push('', `## API endpoints (${r.routes.api.length})`);
  for (const a of r.routes.api.slice(0, 80)) L.push(`- ${a.method} ${a.path}  (${a.file})`);
  if (r.routes.serverActions.length) { L.push('', '## Server actions'); for (const s of r.routes.serverActions.slice(0, 20)) L.push(`- ${s.file}: ${s.actions.join(', ')}`); }
  L.push('', '## Existing admin footprint');
  L.push(`- exists: ${r.existingAdmin.exists}`);
  if (r.existingAdmin.adminRoutes.length) L.push(`- routes: ${r.existingAdmin.adminRoutes.slice(0, 20).join(', ')}`);
  if (r.existingAdmin.adminFiles.length) L.push(`- files: ${r.existingAdmin.adminFiles.slice(0, 15).join(', ')}`);
  if (r.existingAdmin.dashboardLikeRoutes.length) L.push(`- dashboard-like routes (may be user dashboards): ${r.existingAdmin.dashboardLikeRoutes.join(', ')}`);
  L.push('', '## Auth & roles');
  L.push(`- auth files: ${r.auth.files.join(', ') || '-'}`);
  L.push(`- middleware: ${r.auth.middleware.join(', ') || '-'}`);
  L.push(`- login pages: ${r.auth.loginPages.join(', ') || '-'}`);
  L.push(`- models with role-like fields: ${r.auth.modelsWithRoleFields.join(', ') || '-'}`);
  L.push(`- role values seen in code: ${r.auth.roleValuesSeenInCode.map((x) => `${x.role}(${x.count})`).join(', ') || '-'}`);
  L.push('', `## Public forms (${r.publicForms.length}) - candidates for a leads/submissions inbox`);
  for (const f of r.publicForms.slice(0, 20)) L.push(`- ${f.file}${f.endpoints.length ? ' -> ' + f.endpoints.join(', ') : ''}`);
  L.push('', '## Shared UI');
  L.push(`- components/ui: ${r.sharedUI.uiComponents.join(', ') || '-'}`);
  L.push(`- component dirs: ${r.sharedUI.componentDirs.join(', ') || '-'}`);
  if (r.contentFiles.length) L.push(`- hard-coded content files (candidates for CMS): ${r.contentFiles.join(', ')}`);
  L.push(`- locales: ${r.i18n.locales.join(', ') || '-'}`);
  L.push(`- seed files: ${r.seedFiles.join(', ') || '-'}`);
  L.push(`- env var names (.env.example): ${r.env.namesOnly.join(', ') || '-'}`);
  if (r.warnings.length) { L.push('', '## Warnings'); for (const w of r.warnings) L.push(`- ${w}`); }
  return L.join('\n');
}

if (OUT) {
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(toMarkdown(report));
  console.log(`\nFull JSON written to ${OUT}`);
} else if (AS_MD) {
  console.log(toMarkdown(report));
} else {
  console.log(JSON.stringify(report, null, 2));
}
