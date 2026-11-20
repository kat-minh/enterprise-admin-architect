// Tests for skills/admin-discovery/scripts/scan-project.mjs
// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCANNER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../skills/admin-discovery/scripts/scan-project.mjs');

/** Create a throw-away project from a { relativePath: content } map and return its directory. */
function makeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}
const scan = (dir) => JSON.parse(execFileSync(process.execPath, [SCANNER, dir], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
const find = (arr, pred) => arr.find(pred);

test('Next.js app router + Prisma: routes, API methods, models, enums, flags', () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ dependencies: { next: '15.0.0', antd: '5.0.0', '@prisma/client': '6.0.0', stripe: '16.0.0' } }),
    'src/app/page.tsx': 'export default function P(){return null}',
    'src/app/(shop)/products/[slug]/page.tsx': 'export default function P(){return null}',
    'src/app/api/orders/route.ts': 'export async function GET(){}\nexport async function POST(){}',
    'src/app/api/orders/[id]/route.ts': 'export const PATCH = async () => {}',
    'prisma/schema.prisma': `enum OrderStatus {\n  PENDING\n  PAID\n}\nmodel Order {\n  id String @id @default(cuid())\n  status OrderStatus @default(PENDING)\n  items Item[]\n  deletedAt DateTime?\n}\nmodel Item {\n  id String @id\n  order Order @relation(fields: [orderId], references: [id])\n  orderId String\n}\n`,
  });
  const r = scan(dir);
  assert.ok(r.stack.framework.some((f) => f.name === 'Next.js'));
  assert.ok(r.stack.ui.some((f) => f.name === 'Ant Design'));
  const routes = r.routes.pages.map((p) => p.route);
  assert.ok(routes.includes('/') && routes.includes('/products/[slug]'), `routes: ${routes}`);
  assert.deepEqual(r.routes.api.filter((a) => a.path === '/api/orders').map((a) => a.method).sort(), ['GET', 'POST']);
  assert.ok(r.routes.api.some((a) => a.path === '/api/orders/[id]' && a.method === 'PATCH'));
  const order = find(r.models, (m) => m.name === 'Order');
  assert.equal(order.source, 'prisma');
  assert.ok(order.relations.some((x) => x.to === 'Item' && x.list));
  assert.equal(order.flags.softDelete, true);
  assert.equal(order.flags.status, true);
  const idField = find(order.fields, (f) => f.name === 'id');
  assert.equal(idField.default, 'cuid()', 'nested parentheses in @default must be preserved');
  assert.deepEqual(find(r.enums, (e) => e.name === 'OrderStatus').values, ['PENDING', 'PAID']);
});

test('never reads or reports secret values; env names only from .env.example', () => {
  const dir = makeProject({
    '.env.example': 'STRIPE_SECRET_KEY=sk_live_EXAMPLE_VALUE\nDATABASE_URL=postgres://user:pw@host/db\n',
    '.env': 'REAL_SECRET=super-secret-value\n',
    '.env.local': 'LOCAL_SECRET=another-secret\n',
  });
  const out = execFileSync(process.execPath, [SCANNER, dir], { encoding: 'utf8' });
  const r = JSON.parse(out);
  assert.deepEqual(r.env.namesOnly.sort(), ['DATABASE_URL', 'STRIPE_SECRET_KEY']);
  for (const leaked of ['sk_live_EXAMPLE_VALUE', 'postgres://user', 'super-secret-value', 'another-secret', 'REAL_SECRET']) {
    assert.ok(!out.includes(leaked), `output leaked ${leaked}`);
  }
});

test('TypeORM entity with decorators on the same line as properties', () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ dependencies: { typeorm: '0.3.0' } }),
    'src/order.entity.ts': `@Entity('orders')\nexport class Order {\n  @PrimaryGeneratedColumn() id: number;\n  @Column() status: string;\n  @Column({ nullable: true }) deletedAt?: Date;\n  @ManyToOne(() => User) user: User;\n}\n`,
  });
  const order = find(scan(dir).models, (m) => m.name === 'Order');
  assert.ok(order, 'Order entity not found');
  assert.deepEqual(order.fields.map((f) => f.name).sort(), ['deletedAt', 'id', 'status', 'user']);
  assert.equal(order.flags.softDelete, true);
  assert.equal(order.flags.status, true);
});

test('Django: every model is found, including the last one in the file', () => {
  const dir = makeProject({
    'requirements.txt': 'django\n',
    'shop/models.py': `from django.db import models\nclass Order(models.Model):\n    status = models.CharField(max_length=20)\n    user = models.ForeignKey('User', on_delete=models.CASCADE)\n\nclass User(models.Model):\n    email = models.EmailField()\n    is_staff = models.BooleanField(default=False)\n`,
  });
  const names = scan(dir).models.map((m) => m.name).sort();
  assert.deepEqual(names, ['Order', 'User']);
});

test('Mongoose and SQL migrations', () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ dependencies: { mongoose: '8.0.0' } }),
    'models/User.js': `const mongoose = require('mongoose');\nconst schema = new mongoose.Schema({\n  name: { type: String, required: true },\n  role: { type: String, enum: ['admin', 'customer'] },\n  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },\n  deletedAt: Date,\n});\nmodule.exports = mongoose.model('User', schema);\n`,
    'db/001.sql': `CREATE TYPE ticket_status AS ENUM ('open', 'closed');\nCREATE TABLE IF NOT EXISTS public.tickets (\n  id uuid PRIMARY KEY,\n  status ticket_status DEFAULT 'open',\n  user_id uuid REFERENCES public.profiles(id),\n  CONSTRAINT c CHECK (id IS NOT NULL)\n);\n`,
  });
  const r = scan(dir);
  const user = find(r.models, (m) => m.name === 'User');
  assert.equal(user.source, 'mongoose');
  assert.ok(user.relations.some((x) => x.to === 'Shop'));
  assert.equal(user.flags.role, true);
  const tickets = find(r.models, (m) => m.name === 'tickets');
  assert.equal(tickets.source, 'sql');
  assert.ok(tickets.relations.some((x) => x.to === 'profiles'));
  assert.deepEqual(find(r.enums, (e) => e.name === 'ticket_status').values, ['open', 'closed']);
});

test('Express, NestJS and Laravel endpoints', () => {
  const dir = makeProject({
    'api/package.json': JSON.stringify({ dependencies: { express: '4.0.0', '@nestjs/core': '10.0.0' } }),
    'api/app.js': `const express = require('express'); const router = express.Router();\nrouter.get('/api/reviews', () => {}); router.post('/api/reviews', () => {});\n`,
    'api/orders.controller.ts': `@Controller('orders')\nexport class C {\n  @Get() all() {}\n  @Post(':id/refund') refund() {}\n}\n`,
    'php/routes/web.php': `<?php Route::get('/orders', [C::class, 'index']);`,
  });
  const api = scan(dir).routes.api.map((a) => `${a.method} ${a.path}`);
  for (const expected of ['GET /api/reviews', 'POST /api/reviews', 'GET /orders', 'POST /orders/:id/refund']) {
    assert.ok(api.includes(expected), `missing ${expected}; got ${api}`);
  }
});

test('Express mount prefixes are applied to router files (incl. a router mounted twice)', () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ dependencies: { express: '4.0.0' } }),
    'src/app.ts': `import express from 'express';\nimport itemRoutes from './modules/items/item.routes';\nimport { authRouter as auth } from './modules/auth/auth.routes';\nconst app = express();\napp.use('/api/auth', auth);\napp.use('/api/shops/:shopId/items', itemRoutes);\napp.use('/api/items', requireAuth, itemRoutes);\napp.get('/health', () => {});\n`,
    'src/modules/items/item.routes.ts': `import { Router } from 'express';\nconst router = Router();\nrouter.get('/', () => {});\nrouter.put('/:itemId', () => {});\nexport default router;\n`,
    'src/modules/auth/auth.routes.ts': `import { Router } from '@/lib/router';\nexport const authRouter = Router();\nauthRouter.post('/login', () => {});\n`,
  });
  const api = scan(dir).routes.api.map((a) => `${a.method} ${a.path}`).sort();
  for (const expected of ['GET /health', 'GET /api/items', 'GET /api/shops/:shopId/items', 'PUT /api/items/:itemId', 'PUT /api/shops/:shopId/items/:itemId']) {
    assert.ok(api.includes(expected), `missing ${expected}; got ${api}`);
  }
  assert.ok(!api.includes('GET /') && !api.includes('PUT /:itemId'), `unmounted paths leaked: ${api}`);
});

test('src/pages is not treated as a Next.js pages router in a Vite / React Router app', () => {
  const vite = scan(makeProject({
    'package.json': JSON.stringify({ dependencies: { react: '19.0.0', 'react-router-dom': '7.0.0', vite: '6.0.0' } }),
    'src/App.tsx': `import { Routes, Route } from 'react-router-dom';\nexport default () => <Routes><Route path="/trip/:id" element={null} /></Routes>`,
    'src/pages/Login.tsx': 'export const Login = () => null',
    'src/pages/Trips.tsx': 'export const Trips = () => null',
  }));
  assert.deepEqual(vite.routes.pages.map((p) => p.route), ['/trip/:id']);
  const next = scan(makeProject({
    'package.json': JSON.stringify({ dependencies: { next: '14.0.0' } }),
    'pages/about.tsx': 'export default () => null',
  }));
  assert.deepEqual(next.routes.pages.map((p) => p.route), ['/about']);
});

test('auth-related files under modules/ and middlewares/ are found', () => {
  const dir = makeProject({
    'src/modules/auth/auth.routes.ts': 'x',
    'src/modules/auth/auth.service.ts': 'x',
    'src/modules/auth/auth.swagger.ts': 'x',
    'src/middlewares/auth.middleware.ts': 'x',
    'src/modules/blog/author.ts': 'x',
  });
  const files = scan(dir).auth.files;
  assert.ok(files.includes('src/modules/auth/auth.routes.ts') && files.includes('src/middlewares/auth.middleware.ts'));
  assert.ok(!files.some((f) => f.includes('swagger') || f.includes('author')), `unexpected: ${files}`);
});

test('Remix file routes are detected only when the dependency is present', () => {
  const files = {
    'app/routes/_index.tsx': 'x',
    'app/routes/products.$id.tsx': 'x',
    'app/routes/_auth.login.tsx': 'x',
  };
  const withDep = scan(makeProject({ ...files, 'package.json': JSON.stringify({ dependencies: { '@remix-run/react': '2.0.0' } }) }));
  const routes = withDep.routes.pages.map((p) => p.route).sort();
  assert.deepEqual(routes, ['/', '/login', '/products/:id']);
  const withoutDep = scan(makeProject(files));
  assert.equal(withoutDep.routes.pages.length, 0);
});

test('existing admin footprint, role values and public forms', () => {
  const dir = makeProject({
    'package.json': JSON.stringify({ dependencies: { next: '15.0.0', 'react-hook-form': '7.0.0' } }),
    'src/app/admin/orders/page.tsx': 'export default function P(){return null}',
    'src/app/contact/page.tsx': `'use client'\nexport default function C(){ const submit = () => fetch('/api/contact', {method:'POST'}); return <form onSubmit={submit}/> }`,
    'src/middleware.ts': `export function middleware(){ if (user.role === 'editor') {} }`,
  });
  const r = scan(dir);
  assert.equal(r.existingAdmin.exists, true);
  assert.ok(r.existingAdmin.adminRoutes.includes('/admin/orders'));
  assert.ok(r.auth.roleValuesSeenInCode.some((x) => x.role === 'editor'));
  assert.ok(r.publicForms.some((f) => f.file.endsWith('contact/page.tsx') && f.endpoints.includes('/api/contact')));
});

test('domain hints and graceful handling of empty / invalid input', () => {
  const shop = scan(makeProject({
    'prisma/schema.prisma': ['Product', 'Order', 'Coupon', 'Cart'].map((n) => `model ${n} {\n  id String @id\n}\n`).join('\n'),
  }));
  assert.equal(shop.domainHints[0].domain, 'ecommerce');
  assert.equal(scan(makeProject({ 'README.md': 'hello' })).models.length, 0);
  const bad = spawnSync(process.execPath, [SCANNER, path.join(os.tmpdir(), 'definitely-not-here-xyz')], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
});
