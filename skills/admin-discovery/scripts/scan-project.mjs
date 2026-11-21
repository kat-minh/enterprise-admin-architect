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
    'pg-boss': 'pg-boss (job queue)', 'web-push': 'web-push (browser push)', multer: 'multer (uploads)', busboy: 'busboy (uploads)', formidable: 'formidable (uploads)',
    'expo-server-sdk': 'Expo push', '@onesignal/node-onesignal': 'OneSignal', typesense: 'Typesense', '@elastic/elasticsearch': 'Elasticsearch',
    winston: 'winston (logs)', pino: 'pino (logs)', 'express-rate-limit': 'express-rate-limit', helmet: 'helmet', 'posthog-node': 'PostHog (server)',
  },
  cms: {
    '@sanity/client': 'Sanity', sanity: 'Sanity', '@strapi/strapi': 'Strapi', contentful: 'Contentful', payload: 'Payload CMS',
    directus: 'Directus', '@directus/sdk': 'Directus SDK', '@keystatic/core': 'Keystatic', 'decap-cms-app': 'Decap CMS',
    'netlify-cms-app': 'Netlify CMS', '@builder.io/sdk': 'Builder.io', 'ghost-content-api': 'Ghost', '@prismicio/client': 'Prismic',
  },
  flags: {
    'launchdarkly-node-server-sdk': 'LaunchDarkly', '@launchdarkly/node-server-sdk': 'LaunchDarkly', 'launchdarkly-js-client-sdk': 'LaunchDarkly',
    'unleash-client': 'Unleash', '@growthbook/growthbook': 'GrowthBook', 'flagsmith-nodejs': 'Flagsmith', '@vercel/flags': 'Vercel Flags', flags: 'Flags SDK',
  },
  pwa: {
    'vite-plugin-pwa': 'vite-plugin-pwa (manifest generated at build)', 'next-pwa': 'next-pwa', '@serwist/next': 'Serwist', 'workbox-build': 'Workbox', 'workbox-window': 'Workbox',
  },
  i18n: {
    'next-intl': 'next-intl', i18next: 'i18next', 'react-i18next': 'react-i18next', 'next-i18next': 'next-i18next',
    'react-intl': 'react-intl', '@formatjs/intl': 'FormatJS', 'vue-i18n': 'vue-i18n', '@lingui/core': 'Lingui', '@lingui/react': 'Lingui',
    'svelte-i18n': 'svelte-i18n', '@ngx-translate/core': 'ngx-translate', 'i18n-js': 'i18n-js', 'typesafe-i18n': 'typesafe-i18n',
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
  // Only when the framework that gives `pages/` its meaning is present (a Vite/React-Router app also has src/pages/*.tsx)
  if (m && !/\/_/.test('/' + m[1]) && !m[1].startsWith('api/') && !/(^|\/)(components?|ui|lib|libs|features|shared|widgets|hooks)(\/|$)/.test(f.slice(0, m.index)) && (m[2] === 'vue' ? deps.nuxt : deps.next || deps.gatsby)) {
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

// Express/Fastify-style mount prefixes: app.use('/api/x', xRoutes) gives the routes declared in xRoutes' file their full path.
const FILESET = new Set(FILES);
const joinUrl = (a, b) => ('/' + [a, b].join('/')).replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
function resolveModule(fromFile, spec) {
  let base = null;
  if (spec.startsWith('.')) base = path.posix.join(path.posix.dirname(fromFile), spec);
  else if (spec.startsWith('@/') || spec.startsWith('~/')) {
    const i = fromFile.indexOf('src/');
    base = (i >= 0 ? fromFile.slice(0, i) : '') + 'src/' + spec.slice(2);
  }
  if (!base) return null;
  const clean = path.posix.normalize(base).replace(/\.(?:m?[jt]sx?)$/, '');
  for (const c of [`${clean}.ts`, `${clean}.js`, `${clean}.mjs`, `${clean}.tsx`, `${clean}/index.ts`, `${clean}/index.js`]) if (FILESET.has(c)) return c;
  return null;
}
const mounts = new Map(); // child file -> [{ parent, prefix }]
const reUse = /\b(?:app|server|router|api|[A-Za-z]+Router)\.use\(\s*(['"`])([^'"`]+)\1\s*,\s*(?:[\w$.]+(?:\([^)]*\))?\s*,\s*)*([A-Za-z_$][\w$]*)\s*\)/g;
for (const f of FILES) {
  if (!/\.(m?[jt]s|tsx|jsx)$/.test(f) || isTestFile(f)) continue;
  const src = read(f, 200_000);
  if (!src.includes('.use(')) continue;
  const idents = new Map();
  for (const m of src.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s*from\s*['"]([^'"]+)['"]/g)) idents.set(m[1], m[2]);
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    for (const part of m[1].split(',')) { const [orig, alias] = part.trim().split(/\s+as\s+/); if (orig) idents.set((alias || orig).trim(), m[2]); }
  }
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g)) idents.set(m[1], m[2]);
  for (const m of src.matchAll(reUse)) {
    const spec = idents.get(m[3]);
    const child = spec && resolveModule(f, spec);
    if (child) { if (!mounts.has(child)) mounts.set(child, []); mounts.get(child).push({ parent: f, prefix: m[2] }); }
  }
}
function prefixesFor(file, depth = 0) {
  const ms = mounts.get(file);
  if (!ms || depth > 3) return null;
  const out = [];
  for (const { parent, prefix } of ms) for (const p of prefixesFor(parent, depth + 1) || ['']) out.push(joinUrl(p, prefix));
  return uniq(out);
}
if (mounts.size) {
  const resolved = [];
  for (const r of apiRoutes) {
    const ps = r.kind === 'express-like' ? prefixesFor(r.file) : null;
    if (ps && ps.length) for (const p of ps) resolved.push({ ...r, path: joinUrl(p, r.path), mounted: true });
    else resolved.push(r);
  }
  apiRoutes.length = 0;
  apiRoutes.push(...resolved);
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
/**
 * Front-end-only and API-less projects have no ORM, schema or migration, but their data still has a shape in TypeScript. When no model was found, list
 * the exported interfaces and object types of files named types / models / entities / schema as CANDIDATE models (names and field counts only).
 */
const typeModels = [];
const TYPE_FILE_RE = /(^|\/)(types?|models?|entities|schema|interfaces)\.(ts|tsx)$/;
const NOT_A_MODEL_RE = /(Props|Options|Config|Context|State|Params|Args|Result|Response|Request|Input|Payload|Handler|Event|Action|Store|Hook)$/;
function collectTypeModels() {
  for (const f of FILES) {
    if (typeModels.length >= 80) return;
    if (!TYPE_FILE_RE.test(f) || isTestFile(f) || /\.d\.ts$/.test(f)) continue;
    const src = read(f, 120_000);
    // a one-line type (`export type Id = { id: string; title: string };`) is a model of its own; the multi-line form starts a block at the end of its first line
    for (const m of src.matchAll(/^export\s+type\s+([A-Z]\w*)\s*=\s*\{([^\n]*)\}\s*;?\s*$/gm)) {
      if (NOT_A_MODEL_RE.test(m[1])) continue;
      const fieldCount = (m[2].match(/[\w'"]+\??\s*:/g) || []).length;
      if (fieldCount >= 2) typeModels.push({ name: m[1], file: f, fieldCount });
    }
    for (const m of src.matchAll(/^export\s+(?:interface\s+([A-Z]\w*)\s*(?:extends\s+[^{\n]+)?\{|type\s+([A-Z]\w*)\s*=\s*\{)[ \t]*\n([\s\S]*?)\n\}/gm)) {
      const name = m[1] || m[2];
      if (NOT_A_MODEL_RE.test(name)) continue;
      const fieldCount = (m[3].match(/^\s{1,4}[\w'"]+\??\s*:/gm) || []).length;
      if (fieldCount >= 2) typeModels.push({ name, file: f, fieldCount });
    }
  }
}
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
  for (const m of src.matchAll(/\btype\s+\w*Role\w*\s*=\s*((?:\s*\|?\s*['"][\w-]+['"])+)/g)) for (const v of m[1].matchAll(/['"]([\w-]+)['"]/g)) roleValues.set(v[1], (roleValues.get(v[1]) || 0) + 1);
}
for (const e of enums) if (/role/i.test(e.name)) for (const v of e.values) roleValues.set(v, (roleValues.get(v) || 0) + 1);

const AUTH_NAME_RE = /(^|\/)(auth|authentication|session|sessions)\.(ts|js|tsx)$|(^|\/)(auth|authentication|session)\/[^/]+\.(ts|js|tsx)$|(^|\/)(auth|session)[.-][\w.-]*\.(ts|js|tsx)$|\[\.\.\.nextauth\]|auth\.config\.|(^|\/)(middleware|proxy)\.(ts|js)$/i;
const authFiles = FILES.filter((f) => AUTH_NAME_RE.test(f) && !isTestFile(f) && !/\.(swagger|dto)\./.test(f));
const middlewareFiles = FILES.filter((f) => /(^|\/)(middleware|proxy)\.(ts|js)$/.test(f));
if (modelsDedup.length === 0) collectTypeModels();
const roleModels = uniq(modelsDedup.filter((m) => m.flags.role).map((m) => m.name));
const loginFiles = FILES.filter((f) => /(^|\/)(login|sign-?in)[\w.-]*\.(tsx|jsx|vue|svelte)$/i.test(f) && !isTestFile(f));
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

// dictionaries may be nested one level per language (i18n/en/home.ts) or per file (locales/en.json)
const localeFiles = FILES.filter((f) => /(^|\/)(locales?|messages|i18n|lang|translations)\/(?:[^/]+\/)*[^/]+\.(json|ts|js|ya?ml)$/.test(f));
const LANG_CODE = /^[a-z]{2}(-[A-Za-z]{2,4})?$/;
const locales = uniq(localeFiles.flatMap((f) => {
  const after = f.split(/(?:^|\/)(?:locales?|messages|i18n|lang|translations)\//).pop().split('/');
  return [path.basename(f).replace(/\.\w+$/, ''), ...after.slice(0, -1)];
})).filter((n) => LANG_CODE.test(n));

// ----------------------------------------------------------------------------
// UI surfaces: everything the end user sees that is edited in code today (candidates for a CMS-style module)
// ----------------------------------------------------------------------------
const I18N_LIBS = ['i18next', 'react-i18next', 'next-i18next', 'react-intl', '@formatjs/intl', 'vue-i18n', 'next-intl', '@lingui/core', 'svelte-i18n', '@ngx-translate/core', 'i18n-js', 'typesafe-i18n'];
const SRC_RE = /\.(tsx?|jsx?|vue|svelte|astro|html)$/;
const TCALL_RE = /(?:^|[^\w.$])(?:t|\$t|i18n\.t|translate|_)\(\s*(['"`])((?:\\.|(?!\1)[^\\\n]){2,}?)\1/g;
const tKeys = new Map();
let tCalls = 0;
let tFiles = 0;
for (const f of FILES.filter((x) => SRC_RE.test(x) && !/(^|\/)(node_modules|dist|build|\.next|coverage)\//.test(x)).slice(0, 4000)) {
  const src = read(f, 300_000);
  if (!src) continue;
  let hit = false;
  for (const m of src.matchAll(TCALL_RE)) {
    if (/[\n]/.test(m[2]) || (m[1] === '`' && m[2].includes('${'))) continue;
    tCalls++;
    hit = true;
    if (tKeys.size < 200_000) tKeys.set(m[2], (tKeys.get(m[2]) || 0) + 1);
  }
  if (hit) tFiles++;
}
const tokenFiles = [];
for (const f of FILES.filter((x) => /\.(css|scss|less|pcss)$/.test(x) && !/(^|\/)(node_modules|dist|build)\//.test(x)).slice(0, 600)) {
  const n = (read(f, 200_000).match(/--[a-zA-Z][\w-]*\s*:/g) || []).length;
  if (n >= 10) tokenFiles.push({ file: f, customProperties: n });
}
const htmlHeads = [];
for (const f of FILES.filter((x) => /(^|\/)(index|_document|layout)\.(html|tsx|jsx|vue)$/.test(x) || /(^|\/)public\/index\.html$/.test(x)).slice(0, 20)) {
  const src = read(f, 100_000);
  const title = (src.match(/<title>([^<]{1,160})<\/title>/i) || [])[1];
  const description = (src.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']{1,300})["']/i) || [])[1];
  const themeColor = (src.match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)["']/i) || [])[1];
  if (title || description || themeColor) htmlHeads.push({ file: f, title, description, themeColor });
}
const manifestFiles = FILES.filter((f) => /(^|\/)(manifest\.json|[\w.-]*\.webmanifest)$/.test(f));
// the NAME of the file, in any case style (UpdateBanner.tsx, cookie-banner.vue, announcement_bar.jsx)
const bannerFiles = FILES.filter((f) => /(banner|announcement|notice-?bar|alert-?bar|promo-?bar)[\w-]*\.(tsx|jsx|vue|svelte|astro|js|ts)$/i.test(path.basename(f)) && !/(^|\/)(node_modules|dist|build)\/|\.(test|spec)\./.test(f));
const markdownPages = FILES.filter((f) => /(^|\/)(content|pages|posts|blog|articles)\/.*\.(md|mdx)$/i.test(f) && !/(^|\/)(README|CHANGELOG|LICENSE)/i.test(f));
const uiSurfaces = {
  translation: {
    libraries: I18N_LIBS.filter((l) => deps[l]),
    translateCalls: tCalls,
    distinctStrings: tKeys.size,
    filesUsingTranslate: tFiles,
    dictionaryFiles: cap(localeFiles, 30),
    languages: locales,
    note: tCalls > 0 && !I18N_LIBS.some((l) => deps[l]) ? 'Custom translation function (no i18n library): the key is probably the source-language text.' : null,
  },
  theme: { tokenFiles: cap(tokenFiles, 10), tailwindConfig: FILES.filter((f) => /(^|\/)tailwind\.config\.\w+$/.test(f)) },
  brand: { htmlHeads: cap(htmlHeads, 5), manifests: manifestFiles, pwaPlugin: Object.keys(deps).filter((d) => /pwa|workbox/.test(d)) },
  banners: cap(bannerFiles, 20),
  // site/brand/plan/navigation constants and public config files that a business owner may want to change
  configFiles: cap(FILES.filter((f) => (/(^|\/)(site|siteconfig|site\.config|plans?|pricing|navigation|nav|menu|footer|theme|branding|copy|strings)\.(tsx?|jsx?|json|ya?ml)$/i.test(f)
    || /(^|\/)(public|static)\/(robots\.txt|manifest\.json|[\w.-]*\.webmanifest)$/.test(f)
    || /(^|\/)(config|settings)\/(?!env\.|database\.|db\.|index\.)[^/]+\.(tsx?|jsx?|json|ya?ml)$/i.test(f))
    && !/(\.test\.|\.spec\.|\.d\.ts$|(^|\/)node_modules\/)/.test(f)), 30),
  staticContent: { markdownPages: cap(markdownPages, 30), infoPageRoutes: cap(uniq(pageRoutes.map((r) => r.route).filter((r) => /terms|privacy|about|faq|contact|policy|legal|help/i.test(r))), 20) },
};

// ----------------------------------------------------------------------------
// Operations: things operators end up doing by hand (schedules, webhooks, outbound messages, uploads, switches, limits)
// ----------------------------------------------------------------------------
const SCHEDULER_RE = /\b(cron\.schedule|new CronJob|@Cron\(|schedule\.scheduleJob|agenda\.every|boss\.schedule|new Queue\(|new Worker\()/;
const SEND_RE = /(\.sendMail\(|sgMail\.send|resend\.emails\.send|\.emails\.send\(|webpush\.sendNotification|sendNotification\(|messages\.create\(|\.sendMulticast\(|messaging\(\)\.send)/;
const UPLOAD_RE = /(multer\(|upload\.(single|array|fields)\(|new busboy|Busboy\(|formidable\(|createPresignedPost|getSignedUrl\()/;
const LIMITER_RE = /(rateLimit\(|rateLimiter\(|RateLimiterMemory|new Ratelimit\()/;
const ENV_USE_RE = /(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]+)/g;
const GATE_RE = /^(FEATURE_|ENABLE_|DISABLE_|ALLOW_|DISALLOW_|USE_|IS_)|(_ENABLED|_DISABLED|_OFF|_ON|_MODE)$/;
const ops = { schedulers: new Set(), messageSends: new Set(), uploads: new Set(), rateLimiters: new Set() };
const envInCode = new Set();
for (const f of FILES.filter((x) => /\.(tsx?|jsx?|mjs|cjs)$/.test(x) && !/(^|\/)(node_modules|dist|build|\.next|coverage)\/|\.test\.|\.spec\./.test(x)).slice(0, 4000)) {
  const src = read(f, 300_000);
  if (!src) continue;
  if (SCHEDULER_RE.test(src) || (/\bsetInterval\(/.test(src) && !/\.(tsx|jsx)$/.test(f) && /(^|\/)(server|api|jobs?|workers?|cron|lib|services?)\//.test(f))) ops.schedulers.add(f);
  if (SEND_RE.test(src)) ops.messageSends.add(f);
  if (UPLOAD_RE.test(src)) ops.uploads.add(f);
  if (LIMITER_RE.test(src)) ops.rateLimiters.add(f);
  for (const m of src.matchAll(ENV_USE_RE)) envInCode.add(m[1]);
}
const vercelCrons = filesMatching(/(^|\/)vercel\.json$/).filter((f) => /"crons"\s*:/.test(read(f)));
const operations = {
  schedulers: cap([...ops.schedulers, ...vercelCrons], 30),
  webhookRoutes: cap(uniq(apiRoutes.map((r) => r.path).filter((p) => /webhook/i.test(p))), 20),
  messageSends: cap([...ops.messageSends], 30),
  uploads: cap([...ops.uploads], 20),
  rateLimiters: cap([...ops.rateLimiters], 20),
  envUsedInCode: cap([...envInCode].sort(), 120),
  envGates: [...envInCode].filter((n) => GATE_RE.test(n)).sort().slice(0, 40),
};

const seedFiles = FILES.filter((f) => /(^|\/)(seed|seeds|seeders|fixtures)(\/|\.)|seed\.(ts|js|py|rb|sql)$/i.test(f));
const envExamples = FILES.filter((f) => /(^|\/)\.env\.(example|sample|template|local\.example)$/.test(f));
const envNames = [];
for (const f of envExamples) for (const m of read(f).matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)) envNames.push(m[1]);

// ----------------------------------------------------------------------------
// Domain hints
// ----------------------------------------------------------------------------
const DOMAIN_KEYWORDS = {
  'ecommerce': ['product', 'cart', 'order', 'checkout', 'sku', 'coupon', 'inventory', 'shipping', 'variant', 'catalog', 'collection', 'sanpham', 'donhang', 'giohang'],
  'travel-booking': ['tour', 'destination', 'booking', 'itinerary', 'hotel', 'room', 'departure', 'traveler', 'traveller', 'package', 'availability', 'datphong', 'khachsan', 'lichtrinh'],
  'education-lms': ['course', 'lesson', 'student', 'enrollment', 'instructor', 'quiz', 'class', 'certificate', 'teacher', 'cohort', 'assessment', 'attendance', 'khoahoc', 'hocvien', 'baihoc'],
  'corporate-agency': ['portfolio', 'testimonial', 'service', 'team', 'casestudy', 'project', 'client', 'inquiry', 'quote'],
  'news-publishing': ['article', 'post', 'category', 'tag', 'author', 'comment', 'newsletter', 'editorial', 'tintuc', 'baiviet'],
  'saas': ['tenant', 'organization', 'workspace', 'subscription', 'plan', 'apikey', 'webhook', 'seat', 'membership', 'usage', 'invoice'],
  'marketplace': ['vendor', 'seller', 'commission', 'payout', 'dispute', 'provider', 'merchant'],
  'healthcare-appointments': ['patient', 'doctor', 'appointment', 'clinic', 'treatment', 'prescription', 'practitioner', 'therapist', 'benhnhan', 'bacsi', 'lichkham'],
  'real-estate': ['property', 'listing', 'agent', 'viewing', 'unit', 'broker', 'landlord'],
  'job-board': ['job', 'candidate', 'application', 'resume', 'employer', 'applicant', 'cv', 'interview'],
  'fnb-ordering': ['menu', 'menuitem', 'reservation', 'kitchen', 'dish', 'branch', 'restaurant', 'thucdon', 'datban', 'monan', 'nhahang'],
  'events-ticketing': ['event', 'ticket', 'attendee', 'venue', 'checkin', 'speaker', 'session', 'seat'],
  'community-ugc': ['thread', 'report', 'moderation', 'reputation', 'follow', 'reaction', 'flag', 'mute'],
  'consumer-app': ['onboarding', 'referral', 'device', 'feedback', 'push', 'invite', 'share', 'profile', 'install', 'sync'],
  'fintech-kyc': ['wallet', 'transaction', 'kyc', 'loan', 'ledger', 'account', 'transfer', 'deposit', 'withdrawal'],
};
function tokens(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).flatMap((t) => [t, t.replace(/ies$/, 'y').replace(/s$/, '')]);
}
const bag = new Set();
for (const m of modelsDedup) tokens(m.name).forEach((t) => bag.add(t));
for (const r of [...pageRoutes, ...apiRoutes]) tokens(r.route || r.path).forEach((t) => bag.add(t));
// typed models of a schema-less project count like real models
for (const m of typeModels) tokens(m.name).forEach((t) => bag.add(t));
// words written with a hyphen in a route ("thuc-don", "dat-ban") are also matched joined, so a Vietnamese slug can match its keyword
for (const r of [...pageRoutes, ...apiRoutes]) for (const seg of String(r.route || r.path).split('/')) {
  const parts = seg.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = 0; i + 1 < parts.length; i++) bag.add(parts[i] + parts[i + 1]);
}
const domainHints = Object.entries(DOMAIN_KEYWORDS).map(([domain, kws]) => {
  const matched = kws.filter((k) => bag.has(k) || bag.has(k.replace(/s$/, '')));
  return { domain, score: matched.length, keywords: matched };
}).filter((d) => d.score >= 2).sort((a, b) => b.score - a.score).slice(0, 4);
// structural signal for consumer apps: few tables, so keywords alone rarely match
if ((uiSurfaces.brand.pwaPlugin.length || deps['web-push'] || deps['expo-server-sdk']) && !domainHints.some((d) => d.domain === 'consumer-app')) {
  domainHints.push({ domain: 'consumer-app', score: 2, keywords: ['(installable PWA / push signals: confirm with the owner)'] });
}
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
  typeModels: cap(typeModels, 80),
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
    loginFiles: uniq(loginFiles).slice(0, 10),
    modelsWithRoleFields: roleModels,
    roleValuesSeenInCode: [...roleValues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([role, count]) => ({ role, count })),
  },
  publicForms: cap(publicForms, 40),
  sharedUI: { uiComponents: cap(uiComponents, 80), componentDirs: cap(componentDirs, 40) },
  contentFiles: cap(contentFiles, 40),
  i18n: { localeFiles: cap(localeFiles, 20), locales },
  uiSurfaces,
  operations,
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
  for (const k of ['framework', 'backend', 'ui', 'table', 'forms', 'data', 'charts', 'editor', 'auth', 'database', 'integrations', 'cms', 'flags', 'pwa', 'i18n', 'testing']) if (r.stack[k]) L.push(`- ${k}: ${names(r.stack[k])}`);
  L.push('', '## Domain hints (heuristic)');
  if (r.domainHints.length) for (const d of r.domainHints) L.push(`- ${d.domain} (score ${d.score}): ${d.keywords.join(', ')}`);
  else L.push('- none matched -> use references/domains/_custom-domain-playbook.md');
  L.push('', `## Data models (${r.models.length})`);
  for (const m of r.models.slice(0, 80)) {
    const f = Object.entries(m.flags).filter(([, v]) => v).map(([k]) => k).join(',');
    const rel = m.relations.map((x) => `${x.to}${x.list ? '[]' : ''}`).join(', ');
    L.push(`- ${m.name} [${m.source}] ${m.fieldCount} fields${rel ? ` -> ${rel}` : ''}${f ? `  {${f}}` : ''}  (${m.file})`);
  }
  if (!r.models.length && (r.typeModels || []).length) {
    L.push('', 'No ORM, schema or migration was found. Typed data in the code (candidate models: verify by reading the files):');
    for (const m of r.typeModels.slice(0, 60)) L.push(`- ${m.name} (${m.fieldCount} fields)  (${m.file})`);
  }
  if (r.enums.length) { L.push('', '## Enums / status hints'); for (const e of r.enums.slice(0, 40)) L.push(`- ${e.name}: ${e.values.join(' | ')}`); for (const s of r.statusHints.slice(0, 20)) L.push(`- (union) ${s.name}: ${s.values.join(' | ')}  (${s.file})`); }
  const adminRouteSet = new Set(r.existingAdmin.adminRoutes || []);
  const publicPages = r.routes.pages.filter((p) => !adminRouteSet.has(p.route));
  L.push('', `## Public pages (${publicPages.length})${adminRouteSet.size ? `  (${r.routes.pages.length - publicPages.length} admin routes are listed under "Existing admin footprint")` : ''}`);
  for (const p of publicPages.slice(0, 60)) L.push(`- ${p.route}  (${p.file})`);
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
  L.push(`- login UI files: ${(r.auth.loginFiles || []).join(', ') || '-'}`);
  L.push(`- models with role-like fields: ${r.auth.modelsWithRoleFields.join(', ') || '-'}`);
  L.push(`- role values seen in code: ${r.auth.roleValuesSeenInCode.map((x) => `${x.role}(${x.count})`).join(', ') || '-'}`);
  L.push('', `## Forms (${r.publicForms.length}) - decide which are public submission forms (leads inbox candidates) and which are in-app`);
  for (const f of r.publicForms.slice(0, 20)) L.push(`- ${f.file}${f.endpoints.length ? ' -> ' + f.endpoints.join(', ') : ''}`);
  L.push('', '## Shared UI');
  L.push(`- components/ui: ${r.sharedUI.uiComponents.join(', ') || '-'}`);
  L.push(`- component dirs: ${r.sharedUI.componentDirs.join(', ') || '-'}`);
  if (r.contentFiles.length) L.push(`- hard-coded content files (candidates for CMS): ${r.contentFiles.join(', ')}`);
  L.push(`- locales: ${r.i18n.locales.join(', ') || '-'}`);
  L.push(`- seed files: ${r.seedFiles.join(', ') || '-'}`);
  L.push(`- env var names (.env.example): ${r.env.namesOnly.join(', ') || '-'}`);
  const ui = r.uiSurfaces;
  L.push('', '## UI surfaces (CMS candidates: ask the user what they change by editing code today)');
  L.push(`- translation: ${ui.translation.translateCalls} translate calls, ${ui.translation.distinctStrings} distinct strings in ${ui.translation.filesUsingTranslate} files; libraries: ${ui.translation.libraries.join(', ') || 'none'}; languages: ${ui.translation.languages.join(', ') || '-'}${ui.translation.note ? `  (${ui.translation.note})` : ''}`);
  if (ui.translation.dictionaryFiles.length) L.push(`- dictionaries: ${ui.translation.dictionaryFiles.slice(0, 8).join(', ')}${ui.translation.dictionaryFiles.length > 8 ? ', ...' : ''}`);
  L.push(`- theme tokens: ${ui.theme.tokenFiles.map((t) => `${t.file} (${t.customProperties} custom properties)`).join(', ') || '-'}${ui.theme.tailwindConfig.length ? `; tailwind config: ${ui.theme.tailwindConfig.join(', ')}` : ''}`);
  L.push(`- brand: ${ui.brand.htmlHeads.map((h) => `${h.file} title="${h.title || ''}"`).join('; ') || '-'}; manifests: ${ui.brand.manifests.join(', ') || (ui.brand.pwaPlugin.length ? `generated at build (${ui.brand.pwaPlugin.join(', ')})` : '-')}`);
  L.push(`- banner / announcement components: ${ui.banners.join(', ') || 'none found'}`);
  L.push(`- static content: ${[...ui.staticContent.markdownPages, ...ui.staticContent.infoPageRoutes].join(', ') || '-'}`);
  if (ui.configFiles.length) L.push(`- config / constants files a business may own: ${ui.configFiles.join(', ')}`);
  const op = r.operations;
  L.push('', '## Operations (what operators likely do by hand today)');
  L.push(`- schedulers / queues: ${op.schedulers.join(', ') || '-'}`);
  L.push(`- webhook routes: ${op.webhookRoutes.join(', ') || '-'}`);
  L.push(`- outbound mail / SMS / push call sites: ${op.messageSends.join(', ') || '-'}`);
  L.push(`- upload handlers: ${op.uploads.join(', ') || '-'}`);
  L.push(`- rate limiters: ${op.rateLimiters.join(', ') || '-'}`);
  L.push(`- env switches read in code (boolean-looking): ${op.envGates.join(', ') || '-'}`);
  L.push(`- all env names read in code: ${op.envUsedInCode.join(', ') || '-'}`);
  L.push('- Known blind spots: Express `router.route().get().post()` chains, routes with a constant path, and submissions that use fetch from a click handler (no <form>) are not listed; read the router and the components before concluding something is absent.');
  L.push('- Classify each surface as CMS, code or build-time in product-discovery.md ("Content & configuration inventory"); read admin-discovery/references/site-content-and-config.md. Never exclude `site-content` without the user saying so.');
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
