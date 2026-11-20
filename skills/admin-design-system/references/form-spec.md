# Form Specification

Read when: building create/edit forms, settings pages, wizards.

## Contents
- Layout
- Validation
- Submission lifecycle
- Data-loss prevention & concurrency
- Special fields
- Long forms, wizards, settings
- Acceptance checklist

---

## Layout

- Single column by default; two columns only for short, related fields (first/last, start/end). Labels above inputs; required marked consistently (asterisk + `aria-required`); optional left unmarked or marked "(optional)" - pick one convention.
- Group into **sections** with titles and descriptions ("Pricing", "Inventory", "SEO"). Sidebar anchors/tabs for > 6 sections.
- Help text under the field for constraints; placeholder is never the label.
- Page forms: max width 720-960px; drawer forms for ≤ ~8 fields; **no long forms in modals**.
- **Sticky footer** (`StickyFormFooter`) with Save / Cancel and dirty indicator ("Unsaved changes"), always reachable.

## Validation

- One schema (Zod/Yup/Valibot) shared with the server where possible; the server remains the authority.
- Validate on blur and on submit; after the first error, revalidate on change. Don't show errors before the user interacts.
- Messages are specific and actionable ("Price must be at least 0", not "Invalid"); in the user's language.
- On submit failure: focus the first invalid field, scroll to it, show a summary for long forms.
- Map server errors to fields (`{ field: 'sku', message: 'SKU already exists' }`); unknown errors → toast + form-level alert with request ID.
- Cross-field/business rules (end > start, stock ≥ 0) validated both sides.

## Submission lifecycle

1. Disable submit + show progress while pending (prevent double submit); attach an **idempotency key** for money/creating operations.
2. Success: toast (short, specific: "Order #1042 updated"), then navigate to detail or back to the preserved list URL; reset dirty state.
3. Failure: keep input, show actionable error, allow retry.
4. Optimistic updates only for safe, reversible, simple fields (toggle publish flag with rollback); never for money, stock, permissions.

## Data-loss prevention & concurrency

- **Dirty guard**: browser `beforeunload` + in-app route-change confirm when the form is dirty.
- **Optimistic concurrency**: load `version`/`updatedAt`; send it back; server returns 409 if stale → UI shows "This record was changed by <user> at <time>" with *Reload* / *Review changes* options. Never silently overwrite.
- Autosave **drafts** (separate from live data) for long content (articles, pages); show "Draft saved 10:42".
- Warn on navigating away from a wizard mid-flow.

## Special fields

| Field | Guidance |
|---|---|
| Async select / combobox | Server-side search with debounce; show selected label; create-new inline only when cheap |
| Date / time | Explicit timezone for scheduled actions; store UTC; locale format; presets |
| Money | Numeric input with currency; integer minor units in API; no float math; VND has 0 decimals |
| Slug | Auto-generate from title (editable), live uniqueness check, redirect on change for published content |
| File / image upload | Type/size validation client+server, progress, preview, replace, remove, alt text; large files direct-to-storage with signed URL (serverless bodies are limited, e.g. 4.5 MB on Vercel Functions) |
| Rich text | Sanitised output (XSS), restricted embeds, image upload integration, paste cleaning |
| Tags / multi-select | Create on enter, limits, dedupe |
| Dependent fields | Reset dependents when parent changes; show why disabled |
| Conditional fields | Show a field only when its rule holds (`aria-expanded` on the controller); a hidden field is neither validated nor submitted and its value is cleared; the rule lives in one schema shared by client and server |
| Date range | Start ≤ end validated on both sides; presets (today, 7 days, this month); the business time zone stated next to scheduled times |
| Secrets / API keys | Write-only; show masked + "replace"; never re-display |
| Status / lifecycle | Don't expose as free text; use transition actions with reason where needed |
| Address (VN) | Follow the structure used by the public site and backend; don't invent levels |

## Long forms, wizards, settings

- **Long forms**: sections + sticky anchor nav; optional section-level save only if backend supports partial updates.
- **Wizard**: only for real multi-step/dependent flows (import, refund, onboarding). Show progress, allow back, validate per step, persist draft, final review step.
- **Settings pages**: grouped cards with their own Save; show "last changed by/at"; dangerous settings isolated in a "Danger zone" with typed confirmation; secrets masked.
- **Create vs edit**: reuse the same form component; edit shows read-only system fields (ID, created, updated).

## Acceptance checklist

- [ ] Labels, required, help text, logical grouping
- [ ] Schema validation + server error mapping + focus first error
- [ ] Submit loading/disabled, idempotency where relevant
- [ ] Dirty guard + 409 conflict handling
- [ ] Success/failure feedback consistent
- [ ] Keyboard: Tab order, Enter to submit where appropriate, Esc to close drawer
- [ ] Works at 390px width (stacked) and with long Vietnamese text
