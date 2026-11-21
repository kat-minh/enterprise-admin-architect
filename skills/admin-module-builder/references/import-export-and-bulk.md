# Import, Export and Bulk Actions

Read when: a list needs bulk actions, when the owner says "import from Excel", "export the customers", "update many at once", or when the module inventory contains `import-export`. `data-table-spec.md` has the table side; this file is the contract behind it. Gates: `FN-15` (bulk), `FN-16` (import), `FN-17` (export jobs) in `quality-gates.md`.

## Contents
1. Bulk actions
2. Import
3. Export
4. Common rules

## 1. Bulk actions

- **Scope of a selection** is one of: the rows on this page, an explicit id list (capped), or "all N matching the filter" (the server receives the **filter**, not the ids, and freezes the count shown in the preview).
- **Preview** before running: what will change, how many items, a sample, and the consequences. Run only if the count still matches the preview; otherwise ask again.
- **Per-item results.** Each item ends as `changed`, `skipped` (with a reason: changed by someone else since the preview, no longer eligible, not permitted) or `failed` (with the error). One item failing never silently aborts the rest unless the action is declared **atomic**. State which of the two it is in the module spec.
- **Permission is checked per item** (a generic admin action framework checks the action, not the record). An item the admin may not touch is `skipped: not permitted`, not an error for the whole run.
- **Concurrency:** use the record's `revision`/`updated_at`; a changed record is skipped and listed, never overwritten.
- **Result dialog:** counts per outcome, the list of skipped and failed with reasons, a downloadable CSV of them, and the selection reduced to the failed rows so the operator can fix and retry.
- **Limits and audit:** a maximum per run (for example 100 explicit, 5,000 by filter, then an async job); one audit row for the batch (action, filter or ids, counts, reason) plus the per-item changes; a reason where the single-item action needs one.
- **Undo** only where an exact inverse exists (`FN-14`); an undo is its own audited batch.

## 2. Import

An import is a data migration run by a person. Treat it like one.
1. **Template:** a downloadable file with the exact headers, one example row, and a sheet or comment explaining each column (type, required, allowed values, how a reference is written). UTF-8 with a BOM for CSV so Excel reads accents; say which delimiter your target locale's Excel expects.
2. **Upload:** size and row limits, a type allow-list (CSV, optionally XLSX), the file stored with its hash; no formula execution while parsing.
3. **Mapping:** show detected columns against fields; let the operator fix the mapping; remember it.
4. **Staged validation, never straight into the tables.** Parse into a **staging area** under a batch id and validate every row: types, required fields, enum values, uniqueness, references that must exist, the operator's permission to create or change that record. Produce a **row-level error report** (row number, column, message) that can be downloaded, corrected and re-uploaded.
5. **Dry run is the default.** The operator sees "N would be created, M updated, K rejected" and a sample before anything is written; confirming is a separate step with a reason where the data is sensitive.
6. **Commit** in a transaction (all or nothing) or per row with a report, as the spec states. Choose and name the **upsert key** (what makes a row "the same record") and what happens on a match.
7. **Rollback** of a batch by its id inside a stated window, as long as nothing else changed those records (otherwise list the conflicts).
8. **Audit:** one row per batch (who, file hash, counts, mode) and per-record changes with the batch id; imported personal data follows the data map (`privacy-and-data-rights.md`).
9. **Rate limit and size limit**, a progress view for large files (a job, `operations-readiness.md` §10), and a clear failure state that leaves no half-imported data.

## 3. Export

- Small exports stream synchronously; big ones are **async jobs**: status in the UI, an **expiring signed link**, a **history** of past exports (who, when, filter, row count, expired?), and the audit row.
- Respect the current **filters and the role's permissions**: masked columns stay masked unless the role may reveal; personal-data exports are a separate permission.
- Let the operator choose **visible columns or all columns**; name the file with the module and date; UTF-8 with a BOM; neutralise values that start with `=`, `+`, `-`, `@` (formula injection) and say so in the module spec.
- A scheduled export (daily to a bucket) is a job with an owner and a failure alert.

## 4. Common rules

State in the module spec, per module: which of import, export, bulk are in scope and which are deliberately out (with the reason); limits; the permission names; the audit actions; and the tests: a bulk run with a changed-in-between item, an import with every kind of invalid row, an export with a role that may not see a column. An "import" that is only a one-line table row in the inventory is not a specification.
