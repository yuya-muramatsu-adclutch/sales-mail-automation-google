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

# Design QA: アプリ全体ナビゲーション v220

## Source visual truth

- Figma audit board: `https://www.figma.com/design/A5O3KJBJtNQOjdCpprD8Vf?node-id=2-2`.
- Audit recommendation: make the daily workflow visible as `今日 → 収集 → 確認 → 送信 → 成果`, and move lower-frequency screens under secondary navigation.
- Existing visual language, colors, sidebar width, icons, page content, and lead table are preserved.

## Implementation

- Five primary workflow destinations are always visible and open directly.
- List, history, templates, settings, and operations screens are grouped into two secondary disclosures.
- Only the disclosure containing the current screen opens; previously visited groups no longer accumulate in the sidebar.
- Review and send counts are visible beside the relevant primary destination.
- Active navigation exposes `aria-current="page"`, global feedback uses a polite live region, and reduced-motion preferences are respected.
- The global DOM enhancement observer now inspects only added subtrees, with a full-main fallback only for unusually large mutation batches.

## Static and functional evidence

- `node scripts/smoke-test.js`: passed for the v220 navigation, accessibility, and observer regressions.
- `git diff --check`: passed.
- The existing mail safety, review, list, background, and collection regressions remain in the same smoke suite.

## Visual comparison evidence

- The authenticated production screen still requires a signed-in browser capture after deployment.
- Static and functional checks do not prove final wrapping, hover/focus rendering, or mobile drawer spacing.

## Production checklist

- Confirm the five primary destinations fit without wrapping at desktop width.
- Navigate through a secondary screen and verify only its disclosure stays open.
- Confirm the review/send badges update after data load.
- Verify keyboard focus and reduced-motion behavior.
- Verify the sidebar and content remain usable at 900px and 620px breakpoints.

final result: pending authenticated production screenshot

# Performance QA: ルート別更新 v221

## Findings

- `refreshAll()` が初回以外も常に `loadLeads()` を待っていたため、ダッシュボード・設定・履歴など営業リストを必要としない画面でも全件読込が発生していた。
- 起動後の遅延更新が常に `bypassCache=true` でダッシュボード全件集計を再実行していた。
- メール、フォーム、商談、重複チェックはレスポンスの集計値を使わない一方、サーバー側で全件集計と絞り込み集計を毎回作っていた。

## Verification

- 表示中ルートだけを更新する `refreshActiveRouteData()` を追加。
- ダッシュボードの通常更新で営業リストAPIを呼ばないことを静的回帰テストで固定。
- 軽量一覧取得が集計・不要なマスター構築を実行しないことをモックで確認。
- 初期キャッシュがない場合だけダッシュボード強制再集計を行うことを回帰テストで固定。
- 認証済みChromeを制御する実行機能がこのセッションでは利用できないため、Networkタイミングの実測比較は未取得。

final result: code paths verified; authenticated timing comparison pending

## v222 follow-up

- Default review startup now requests only the review count and first 50 rows without list-wide aggregate cards.
- Full breakdown data remains deferred until the user explicitly opens the bulk sales-list view.
- Regression coverage checks both the lean startup request and the full-stat bulk-list transition.

## v223 follow-up

- Post-startup dashboard refresh now reads only the runtime or persisted dashboard cache; it never starts the full lead aggregate from an ordinary screen refresh.
- Lead, mail, template, job, and operational mutations invalidate the short cache and reserve a deferred aggregate refresh.
- The existing 10-minute worker refreshes the aggregate only when at least 90 seconds remain, while the analytics screen retains an explicit fresh-data path.
- Automated coverage verifies cache-only behavior, dirty/fresh/expired state transitions, and the worker runtime guard.
- Authenticated Chrome timing remains a manual follow-up because this session could only verify the fixed deployment and observed a Google sign-in redirect for anonymous HTTP.

## v224 follow-up

- Initial app data now reads only the persisted completion status of the legacy collection-quality migration.
- The migration no longer runs during page refreshes or before scheduled-mail safety checks.
- Pending migration work is deferred to the existing background worker and requires at least 150 seconds of remaining runtime.
- Regression coverage verifies that startup and scheduled mail cannot execute the migration and that short worker windows defer it.

## v225 follow-up

- Reference data loaded after startup is cached for 10 minutes per application version.
- Genre records are read once, and the settings already loaded for the UI are reused by schema validation.
- Lead activity does not evict the reference cache; master, settings, list-view, custom-field, Serper, and PC-search changes do.
- Automated coverage verifies cache hits, relevant and irrelevant invalidation, and explicit cache bypass.

## v226 follow-up

- The scheduled and manually resumed background worker now uses one short-lived ownership claim before reading or advancing jobs.
- Overlapping invocations return a safe busy result without running stale recovery, migrations, or dashboard aggregation twice.
- Top-level failures record a failed worker state and release ownership in `finally`; expired claims are recovered automatically by the next run.
- Worker health exposes only busy/source/time/stale metadata and never returns the ownership token.
- Automated coverage verifies success, overlap, exception cleanup, stale recovery, token-matched release, and token redaction.
- Authenticated live trigger overlap remains a manual production observation because Apps Script execution inspection is unavailable from this session.

## v228 follow-up

- Production delivery outcomes are now persisted independently before spreadsheet tracking is finalized.
- A later automatic-mail run reconciles retained outcomes into send history and exact lead send counts before selecting new recipients.
- Finalization uses bounded short lock retries, preserves later reply/deal statuses, and retains failed recovery receipts for another run.
- Dashboard remaining capacity now subtracts both successful sends and pending production reservations.
- Automatic-mail results and job messages expose the recovered tracking count without exposing receipt payloads.
- Automated coverage verifies normal receipt cleanup, successful and failed recovery, exact-count repair, protected statuses, and retry retention.
- No live email was sent during verification; the next scheduled production run should be observed for receipt recovery and remaining-capacity consistency.

## v229 follow-up

- SearXNG remains the zero-credit primary provider; non-empty results never consume Serper credits.
- Empty SearXNG results use Serper when available, while a failed secondary lookup preserves the valid empty primary response.
- Source-page official-site fallback now works in SearXNG-only configurations and labels the actual provider in progress history.
- Permanent HTTP/configuration errors stop retrying; rate limits, timeouts, connection failures, and server errors remain resumable.
- Automated coverage verifies provider priority, empty-result fallback, fallback failure, configuration-only failure, and typed retry behavior.
- External search calls were not executed during verification; provider behavior was validated with deterministic response fixtures.

## v230 follow-up

- Contact discovery now checks up to four successful pages, prioritizing contact pages and same-domain company/operator pages while keeping a six-candidate queue bound.
- A failed high-priority page no longer prevents remaining candidates from being inspected.
- Cloudflare, split data-attribute, and percent-encoded mail addresses are decoded before the existing email validity filter.
- Known external form coverage includes Microsoft Forms, Form Mailer, formOK, and HubSpot shared forms.
- Form detection is scoped to each form and rejects newsletter, search, login, and booking forms.
- Weak company/profile discovery is restricted to the official domain so it cannot expand into unrelated external sites.
- Automated fixtures verify discovery depth, failure continuation, obfuscation decoding, false-positive rejection, and hard page bounds.
- Fixed deployment updated to `@231`; no live external crawl or email delivery was performed during verification.
