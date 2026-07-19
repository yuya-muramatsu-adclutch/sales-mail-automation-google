**Source visual truth**

- Grouped workflow navigation: selected generated image 2.
- Lead list: established table implementation from commit `b16c2da` (the version immediately before the two-pane workspace).

**Implementation**

- Apps Script fixed deployment: `AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` at deployment version `@214`
- App code marker: `20260719_apps_script_full_workflow_v213_grouped_navigation_restored_lead_table`
- Intended state: grouped sidebar navigation with the original full-width lead table

**Static and functional evidence**

- The complete `#leads` markup matches commit `b16c2da`.
- `renderLeads()` and `renderLeadRowsTable()` match commit `b16c2da`.
- Grouped menu markup and active-section disclosure remain enabled.
- `node scripts/smoke-test.js`: passed.
- `Index.html` inline script syntax compilation: passed.
- Static HTML ID uniqueness check: passed.
- `git diff --check`: passed.
- Fixed deployment updated successfully to `@214`.

**Visual comparison evidence**

- An authenticated rendered screenshot is unavailable because browser control for the signed-in Apps Script session is not exposed in this task.
- Source-only or code-only inspection is not accepted as a visual comparison pass.

**Findings**

- [P1] The deployed lead table cannot be visually signed off without an authenticated screenshot.
  Impact: actual wrapping, spacing, and responsive behavior remain unverified.
  Fix: capture the deployed 営業リスト after a hard refresh.

**Implementation Checklist**

- Confirm the grouped menu remains visible.
- Confirm the lead list uses the original full-width table.
- Confirm visible columns, pagination, bulk actions, and row edit actions work.
- Confirm the two-pane detail panel is absent.

**Comparison history**

- Pass 1: static restoration and deployment passed; rendered visual comparison blocked.

final result: blocked
