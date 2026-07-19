# Design QA: 営業リスト上部メニュー v214

## Source visual truth

- User-selected design: option 1.
- Reference image: `/Users/muramatsuyuuya/.codex/generated_images/019f6174-a561-77c3-be8e-42cf640b1de6/exec-7675d2c6-9212-4897-8a73-5e0810cf9f4f.png`
- User constraints overriding the generated image:
  - Keep the established full-width lead table.
  - Do not repeat identical facility and company names.
  - Do not show the address in the initial facility cell.

## Implementation

- Apps Script fixed deployment: `AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` at deployment version `@215`.
- App code marker: `20260719_apps_script_full_workflow_v214_compact_lead_menu_clean_facility_cell`.
- Search, genre, search action, and clear action form the first control row.
- Mutually exclusive lead-state totals form the second row as a compact segmented control.
- Detailed filters, visible columns, load range, and page size form the third utility row.
- The lead table structure, pagination, bulk actions, and edit actions remain in place.

## Static and functional evidence

- `node scripts/smoke-test.js`: passed.
- `Index.html` inline script syntax compilation: passed.
- `git diff --check`: passed.
- Required control IDs are unique in static markup.
- Facility-cell regression assertions verify that identical names are suppressed and `lead.address` is not rendered in the facility cell.
- Fixed deployment updated successfully to `@215`.

## Visual comparison evidence

- An authenticated rendered screenshot is unavailable because browser control for the signed-in Apps Script session is not exposed in this task.
- Source-only or code-only inspection is not accepted as a visual comparison pass.

## Findings

- [P1] The deployed menu cannot be visually signed off without an authenticated screenshot.
  - Impact: actual wrapping, popover positioning, and responsive behavior remain unverified.
  - Fix: capture the deployed 営業リスト after a hard refresh at the same desktop viewport as the reference.

## Implementation checklist

- Confirm the header displays the full genre total beside `営業リスト`.
- Confirm the first row contains only search, genre, search, and clear.
- Confirm the state buttons scroll horizontally instead of wrapping at narrower widths.
- Confirm `詳細条件`, `表示項目`, and `読み込み範囲` open usable controls.
- Confirm the facility cell displays one primary name and no address by default.
- Confirm pagination, bulk actions, row editing, and saved filters still work.

## Comparison history

- Pass 1: implementation, regression checks, and production deployment passed; authenticated rendered comparison blocked.

final result: blocked
