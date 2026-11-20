# Stack Adapters

Read when: choosing/adapting the UI foundation for the project's stack. **Rule: reuse what the project already uses; never run two component kits side by side in the admin.** Verify API details against the installed package versions/docs - names below are typical, versions differ.

## Contents
- Decision table
- Next.js App Router structure (and auth caveat)
- Ant Design
- shadcn/ui + Tailwind + TanStack Table
- MUI, Mantine
- Refine / react-admin
- Vue / Angular / Svelte
- Data fetching pattern
- Shared component naming

---

## Decision table

| Project already has | Use for admin |
|---|---|
| Ant Design | Ant Design (theme tokens, `Table`, `Form`, `Drawer`, `Menu`); optionally Pro Components if installed or approved |
| Tailwind + shadcn/ui (`components.json`) | shadcn components + TanStack Table + react-hook-form + zod + sonner + cmdk |
| Tailwind only | Add shadcn/ui (copy-in components, no runtime lock-in) |
| MUI | MUI + DataGrid (server mode) + dense theme |
| Mantine | Mantine + `mantine-react-table` or `mantine-datatable` |
| Chakra / other kit | Keep it; build table/form patterns on top; add TanStack Table if no grid |
| Nothing / custom CSS | Tailwind + shadcn/ui if React; otherwise the framework's mainstream kit |
| Refine / react-admin already | Continue with it; still apply module archetypes and these specs |

## Next.js App Router structure

```
src/app/
  (admin-auth)/admin/login/page.tsx       # no shell
  (admin)/admin/layout.tsx                # shell + session check
  (admin)/admin/page.tsx                  # dashboard
  (admin)/admin/orders/page.tsx           # list (reads searchParams)
  (admin)/admin/orders/[id]/page.tsx
  (admin)/admin/orders/loading.tsx | error.tsx | not-found.tsx
  (admin)/admin/403/page.tsx
src/features/admin/<module>/{components,hooks,services,schemas,types}
src/lib/{api,auth,permissions}
```
- Set `robots: noindex` for the admin segment; keep admin code out of public bundles (route group + dynamic imports for heavy editors/charts).
- **Auth caveat:** layouts are not re-rendered on every client navigation, so a check only in `layout.tsx` is not enough. Enforce authentication/permission **in the data access layer, route handlers and server actions**, plus middleware/proxy (`middleware.ts`, or `proxy.ts` in newer Next versions) as a coarse gate.
- Server Components fetch list data from `searchParams`; client components handle interactive table state and mutate via server actions/API + revalidation.
- Use `loading.tsx` skeletons; `error.tsx` with retry; `not-found.tsx` for missing records.

## Ant Design (v5)

- `ConfigProvider` with `theme`: `algorithm: theme.compactAlgorithm` (admin density), `token: { colorPrimary, borderRadius: 6, fontSize: 14, controlHeight: 32 }`, plus component tokens for Table (header bg, cell padding), Layout, Menu. Map tokens from `visual-standard.md`.
- Locale: `ConfigProvider locale={viVN}` (`antd/locale/vi_VN`) and `dayjs.locale('vi')` when Vietnamese.
- Wrap the app in `<App>` and use `App.useApp()` for `message`, `notification`, `modal.confirm` (context-aware, themed).
- Next.js: register SSR styles with `@ant-design/nextjs-registry` (`AntdRegistry`) in the root layout.
- `Table`: controlled `pagination={{ current, pageSize, total, showSizeChanger }}`, `onChange` → URL/query state, `loading`, `rowKey`, `rowSelection`, `sticky`, `scroll={{ x: 'max-content' }}`; custom empty via `locale.emptyText`.
- `Form`: `rules` or zod via resolver pattern; server errors → `form.setFields([{ name, errors }])`; `scrollToFirstError`; `Form.useWatch` for dependent fields; dirty guard via `form.isFieldsTouched()`.
- `Drawer` (width 560-640) for previews; `Layout.Sider` + `Menu` (`inlineCollapsed`) for the sidebar; `Breadcrumb`, `Dropdown`, `Badge`/`Tag` for `StatusBadge`.
- Command menu isn't built in: use `cmdk` or a `Modal` + `Input` + `Menu`.
- Pro Components (`ProTable`, `ProForm`, `ProLayout`) speed up CRUD (`request` handler for server-side data) but are opinionated and heavy; use only when already installed or the user approves. Wrap them in the shared components so modules don't depend on them directly.

## shadcn/ui + Tailwind + TanStack Table

- `npx shadcn@latest init`; add what is needed (button, input, select, dialog, alert-dialog, sheet (drawer), dropdown-menu, popover, tabs, table, badge, skeleton, breadcrumb, sidebar, command, sonner, calendar, form/field as per installed version).
- Tokens in CSS variables (`--background`, `--primary`, `--radius`, …) mapped from `visual-standard.md`; set compact size variants (control 32px) instead of per-page overrides.
- `DataTable<TData>` wrapper around `@tanstack/react-table` with `manualPagination`, `manualSorting`, `manualFiltering`; state ↔ URL (searchParams helper or `nuqs`); column definitions per module.
- Forms: `react-hook-form` + `zod` resolver; shared schema with the API; toasts with `sonner`; command menu with `cmdk` (shadcn `command`).

## MUI

- Theme: `components.MuiTextField.defaultProps.size = 'small'`, dense `MuiTable`, `shape.borderRadius = 6`, typography scale from tokens.
- `@mui/x-data-grid`: `paginationMode="server"`, `sortingMode="server"`, `filterMode="server"`, `rowCount`, `loading`; map models to URL state.
- Forms: react-hook-form + zod, `Controller`.

## Mantine

- `MantineProvider` theme: `primaryColor`, `defaultRadius`, `components` default props (size `sm`). Table: `mantine-react-table` or `mantine-datatable` with server-side options; forms: `@mantine/form` + zod resolver; `Drawer`, `Modal`, `Spotlight` (command menu), `notifications`.

## Refine / react-admin

Data-provider driven CRUD scaffolding. Keep if present; still design specialised workflows (orders, bookings, moderation) beyond CRUD, and enforce `accessControlProvider`/`authProvider` **plus** server-side checks.

## Vue / Angular / Svelte

Same standards, different kit: Vue → Element Plus / PrimeVue / Vuetify / Naive UI (+ TanStack Table Vue or the kit's grid); Angular → Angular Material / PrimeNG; Svelte → shadcn-svelte or Skeleton. Keep the module architecture (`features/<module>`), URL state, permission guard, and component names below.

## Data fetching pattern

- TanStack Query (or SWR/RSC equivalent): query keys `['orders', params]`; paginated lists with `placeholderData: keepPreviousData` (v5); mutations invalidate affected keys; centralised API client with auth, error normalisation (`{ code, message, fields }`), 401 → sign-out redirect, 403 → forbidden state, 409 → conflict UI.
- Never fetch everything to filter client-side. Debounce search; abort stale requests.

## Shared component naming

Use these names (or the project's equivalents) consistently across modules: `AdminShell`, `PageHeader`, `DataTable`, `FilterBar`, `BulkActionBar`, `StatusBadge`, `EntityHeader`, `KeyValueList`, `Timeline`, `FormSection`, `StickyFormFooter`, `ConfirmDialog`, `PermissionGate`, `EmptyState`, `ErrorState`, `StatTile`, `AttentionQueue`, `FileUploader`, `RichTextField`, `Money`, `DateTime`.
