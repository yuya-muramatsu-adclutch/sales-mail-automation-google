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

## v231 follow-up

- Create-time duplicate checks now compare normalized official-site and form URLs even when facility names differ.
- URL identity ignores protocol, `www`, trailing slash, fragment, and known tracking parameters while preserving facility paths and meaningful form query identifiers.
- Shared-domain facilities with different paths remain valid, and different forms on the same hosted-form domain remain distinct.
- Source-page preflight and final create validation now use the same URL identity rule.
- Automated fixtures verify same-URL blocking and shared-domain false-positive prevention.
- Fixed deployment updated to `@232`; no production records were rewritten during verification.

## v232 follow-up

- Search-result bulk review now releases the global script lock every 25 records instead of holding it for the full selection.
- Search configuration, result claims, job ownership, contact enrichment, and cache writes use bounded 6-second retries instead of a single 90-second wait.
- Every review item is re-read after the chunk lock is acquired, preserving conflict detection and preventing stale overwrites.
- Automated coverage verifies a 26-record selection uses two lock windows and retains idempotent/conflict behavior.
- Fixed deployment updated to `@233`; authenticated concurrent clicking and Apps Script execution timing remain production observations.

## v233 follow-up

- The default script-lock policy is now five bounded 6-second attempts instead of one 30-second wait.
- Lead editing, mail reservation/tracking, scheduled-mail job state, replies, Calendar claims, CSV jobs, stale recovery, and migrations no longer use explicit 90-second waits.
- Network delivery and Calendar creation remain outside the global lock; their reservation and rollback guards are unchanged.
- CSV preparation remains chunked at 500 rows and search-result review at 25 records, limiting each lock hold.
- Automated coverage verifies default retry timing and all previously protected mail, reply, import, and migration paths.
- Fixed deployment updated to `@234`; authenticated simultaneous-operation timing remains a production observation.

## v234 follow-up

- Shared append/update helpers no longer reread an entire sheet to return a record that was just written.
- Row lookup now returns its already-read header set, and lead/form/mail update paths reuse it instead of fetching the header row again.
- Form-send mark and undo actions return the persisted in-memory record rather than performing a second lead-ID search.
- Lock-time revalidation and post-write cache invalidation remain intact, so the optimization does not weaken stale-write protection.
- Automated coverage verifies zero post-append searches, one total update-row search, no duplicate update-header read, and returned/written row equality.
- Fixed deployment updated to `@235`; authenticated wall-clock profiling remains a production observation.

## v235 follow-up

- Storage growth is shown only after opening Admin > Logs / Maintenance, so startup and normal list work do not pay for the diagnostic.
- The diagnostic uses sheet row counts rather than loading records and caches the result for ten minutes.
- Search results, search usage, sync logs, job history, and raw import staging have visible normal/warn/danger thresholds.
- Leads, send history, and reply logs are listed separately as protected evidence and cannot be deleted from this panel.
- No cleanup action was added or run; the UI requires a Drive backup and retention decision before any future temporary-data cleanup.
- Fixed deployment updated to `@236`; authenticated current row counts remain a production UI observation.

## v236 follow-up

- Background health, stale recovery, duplicate prevention, and queued work now search the status column and read only matching rows.
- Completed and failed job history remains available but is not transferred on every background-worker check.
- Both search jobs and CSV import jobs use the same exact-match helper, preventing performance behavior from drifting between workflows.
- The helper rechecks the returned row status and deduplicates matched row numbers before returning records.
- Automated coverage proves that only queued/running full rows are read from a mixed-status fixture and that background paths no longer contain full-history job reads.
- Fixed deployment updated to `@237`; authenticated worker timing remains a production observation.

## v237 follow-up

- Dashboard refresh reads only status from search jobs, usage counters and timestamps from search usage, and metric fields from sync logs.
- Query payloads, error stacks, context JSON, and other large text cells are excluded from routine dashboard aggregation.
- Adjacent selected columns are merged into one range, balancing lower cell transfer against Apps Script call overhead.
- Missing legacy metric columns are ignored while existing fallback column names remain supported.
- Automated coverage verifies merged ranges, omitted payload fields, and unchanged daily/monthly usage totals.
- Fixed deployment updated to `@238`; authenticated refresh duration remains a production observation.

## v238 follow-up

- Saved-site research status reads only the 14 search-job fields required for URL matching, progress, errors, and timestamps.
- The computed status list is cached for five minutes and invalidated whenever search jobs or source-page settings change.
- The visible refresh action bypasses the cache, so operators can request current status without waiting for expiry.
- Active research is preferred over an older completed job, while completed, failed, and never-started states remain distinct.
- Automated coverage verifies all four states, active-job progress, cache reuse, invalidation, and manual bypass behavior.
- Fixed deployment updated to `@239`; authenticated UI timing remains a production observation.

## v239 follow-up

- Routine dashboard aggregation reads only the ten send-history fields required for counts, pending reservations, duplicate-send protection, and analytics attribution.
- Historical subject, body, error detail, company/facility labels, and Gmail identifiers are no longer transferred with every dashboard refresh.
- Template-analysis copy is hydrated from the already-loaded current template records, preserving the visible subject and body preview without reading every historical body cell.
- Send success/failure counts, pending-send age, lead tracking mismatches, recipient uniqueness, and reply/deal attribution keep their existing rules.
- Automated coverage compares full large-text histories with projected histories and verifies identical analytics plus the omission of subject, body, and error columns.
- Fixed deployment updated to `@240`; authenticated refresh timing remains a production observation.

## v240 follow-up

- Automatic-mail planning, daily limits, duplicate-send protection, pending reservations, and delivery recovery now read seven compact send-history fields.
- Per-lead send tracking recovery uses exact lead-ID matching with projected columns instead of scanning every historical body.
- Gmail reply checks and false-positive diagnostics reuse the compact history reader, reducing scheduled-trigger payload without changing sent-at ordering.
- Lead-detail history retains full subject/body/error content but fetches only histories belonging to the selected lead.
- Send-history import duplicate checks read only the ID column.
- Automated coverage verifies exact-match column projection, omitted large text fields, and identical safety decisions with or without large historical content.
- Fixed deployment updated to `@241`; authenticated trigger duration and live quota behavior remain production observations.

## v241 follow-up

- Dashboard lead aggregation returns eighteen required fields instead of all forty-five lead columns.
- Large custom/source payload JSON, notes, address, and facility-label fields are excluded from routine refresh and cache serialization.
- Small gaps between requested columns can be merged into one range; the dashboard lead projection now uses three grouped range reads rather than many tiny calls.
- Gap columns are never copied into returned records, preserving field minimization even when the underlying range is widened for latency.
- Automated coverage verifies unchanged lead-state/sendability summaries and analytics between full large-payload leads and projected leads.
- Fixed deployment updated to `@242`; authenticated dashboard timing remains a production observation.

## v242 follow-up

- Automatic-mail candidate planning reads seventeen eligibility, routing, and ordering fields instead of every lead column.
- Large payload JSON, notes, address/facility labels, and form-progress fields are excluded from the ten-minute scheduled trigger path.
- The selected fields are fetched in three grouped ranges to balance lower cell transfer with fewer Spreadsheet calls.
- Email deduplication, newest-first ordering, genre round-robin, and template grouping retain their previous behavior.
- Each selected lead is still reloaded and revalidated under the send-preparation lock immediately before delivery.
- Automated coverage verifies identical selected order, exclusions, and template groups between full and projected lead fixtures.
- Fixed deployment updated to `@243`; authenticated trigger duration remains a production observation.

## v243 follow-up

- Sales-list routes now return twenty-six shared list fields instead of every lead column.
- Large source payload JSON, decision detail, meeting detail, and Calendar metadata are omitted from initial list rendering.
- Email, form, deal, and duplicate-manager routes request only their small screen-specific field additions.
- Opening the lead editor fetches the current complete record by ID before populating the dialog, so projected list data cannot erase hidden fields.
- Contiguous-only range grouping prevents the omitted source payload column from being swept into a widened read.
- Automated coverage verifies the base projection, safe extra-field allowlist, search behavior, omitted payload, route-specific fields, and on-demand detail fetch.
- Fixed deployment updated to `@244`; authenticated list timing remains a production observation.

## v244 follow-up

- The ten-minute automatic-mail trigger now reads seven job-claim fields instead of all twenty-five job columns.
- Payload, cursor, found-result JSON, query detail, and error text are excluded from the single-flight check.
- Active jobs still block duplicate execution, while only jobs stale for more than ten minutes are failed before replacement.
- Contiguous-only range grouping avoids widening reads across omitted JSON columns.
- Automated coverage verifies active-job reuse, stale-job recovery, new-job creation, the exact projection, and omitted large fields.
- Fixed deployment updated to `@245`; live trigger duration remains a production observation.

## v245 follow-up

- Reply false-positive review explicitly requests the latest Gmail thread identifier required by optimistic conflict checks.
- The route skips list statistics and their master-data reads because the screen only needs one paginated reply set.
- Reply-log reads are projected to six classification/display fields, and logs outside the current page are not accumulated.
- Human replies still suppress repair candidates, while auto-reply-only records remain repairable with the expected thread ID intact.
- Automated coverage verifies the query flags, exact log projection, page scoping, candidate classification, and concurrency token.
- Fixed deployment updated to `@246`; no live Gmail repair mutation was performed during verification.

## v246 follow-up

- Opening a lead no longer triggers an all-column scan of every lead for duplicate candidates.
- Duplicate checks read twelve identity, destination, status, send-count, and archive fields only.
- Source payload JSON, custom fields, notes, address, decision detail, meeting detail, and Calendar metadata are omitted.
- Email, domain, and company-domain matches preserve the same reason labels, archived exclusion, and send-count ordering.
- Automated coverage compares full large-payload fixtures with projected fixtures and verifies identical candidates and reasons.
- Fixed deployment updated to `@247`; authenticated editor timing remains a production observation.

## v247 follow-up

- Source-page background collection builds its existing-lead duplicate index from nine identity and URL fields rather than every lead column.
- Source payload JSON, custom fields, notes, address, contact channels, decision details, and meeting metadata are omitted.
- Source ID, detail URL, website URL, normalized-name keys, and archived-record exclusion retain their previous behavior.
- A discovered official URL is now actually checked against existing website URLs; previously the argument was accepted but not used.
- Automated coverage verifies identical index keys between full and projected records plus source-ID, detail-URL, official-URL, name, and archived cases.
- Fixed deployment updated to `@248`; no live external collection was run during verification.

## v248 follow-up

- Domain-cache reads now use an exact `cache_key` lookup instead of transferring every cache row and column.
- Cache hits read the ten fields needed for response restoration, expiry, and latest-row priority; write-side existence checks read four metadata fields.
- The matching row still includes `source_json`, while unrelated cached search payloads are omitted.
- Expired-row filtering, newest-row selection, short write locking, update-versus-append behavior, and cache response shape are preserved.
- Automated coverage verifies exact lookup arguments, newest-row selection, write locking, and update of the existing cache ID.
- Fixed deployment updated to `@249`; no live external search or cache mutation was run during verification.

## v249 follow-up

- Persisted dashboard-cache reads now look up `dashboard_stats_v5` exactly instead of transferring every cached aggregate payload.
- Normal reads use five fields; update-side existence checks use four metadata fields for the current v5 and legacy v4 keys.
- Newest-v5 priority, expiry handling, legacy-v4 update fallback, the ten-second write lock, and the two-level CacheService/sheet strategy are preserved.
- Automated coverage restores the newest of multiple v5 rows and verifies the exact read/write lookup arguments and updated row ID.
- Fixed deployment updated to `@250`; no live cache rebuild or sales-data mutation was run during verification.

## v250 follow-up

- Serper manager data no longer reads every search-usage column twice for daily and monthly totals.
- The manager reads created time, credits, and request count once, then reuses that array for both aggregates.
- Standalone usage-count fallback reads four required fields, including lead ID for its optional lead filter.
- Daily, monthly, and lead filters plus the credits/request-count/default-one precedence are preserved.
- Automated coverage validates a 1,002-row aggregate, projected fallback fields, one fallback read, and shared manager input.
- Fixed deployment updated to `@251`; no live Serper request or usage-log mutation was run during verification.

## v251 follow-up

- Generic sheet lists can now request only schema-allowed fields while preserving totals, updated-time ordering, and paging.
- Search-result loading omits the unused large `raw_json` field; search-usage loading requests five displayed fields only.
- Projected search operates on returned fields, and an all-invalid field request fails closed instead of falling back to every column.
- Automated coverage verifies total count, newest-first paging, projected output, large-payload omission, and invalid-field rejection.
- Fixed deployment updated to `@252`; no live search, result review, or lead creation was run during verification.

## v252 follow-up

- Repeated settings reads across dashboard, mail, reply, and collection paths now share a five-minute script cache.
- Cache population reads six settings fields and preserves number, boolean, JSON, string, and default-value parsing.
- Setting writes still inspect the latest sheet inside the existing lock, then invalidate the settings cache immediately after persistence.
- Automated coverage verifies one sheet read across repeated typed settings, explicit invalidation, refreshed reads, cache fields, and TTL.
- Fixed deployment updated to `@253`; no live setting or sales-data mutation was run during verification.

## v253 follow-up

- Initial operations loading omits the large send-history body while keeping the other eighteen list, filter, Gmail, and test-history fields.
- Selecting “本文を見る” fetches one history body through an exact ID lookup and retains it in the page cache.
- A non-empty history search explicitly preloads ID/body pairs for the latest one hundred rows, preserving body search only when requested.
- CSV export intentionally retains its full-record, all-page fetch so exported body content is unchanged; analytics continues to use server aggregates.
- Automated coverage verifies initial body omission, on-demand API wiring, exact projected fields, and search-time body projection.
- Fixed deployment updated to `@254`; no live mail send, history write, or sales-data mutation was run during verification.

## v254 follow-up

- Initial operations loading now requests thirteen sync-log fields and omits large stack traces and context JSON.
- Error and admin screens fetch ID, stack, and context JSON for the latest one hundred logs only when those screens are opened.
- Two-way merging preserves details regardless of whether the normal list or detail request completes first on the admin screen.
- Normal sync, progress, and background views retain status, counts, messages, ordering, and totals without transferring debug payloads.
- Automated coverage verifies the initial projection, detail projection, omitted fields, and error/admin lazy-load wiring.
- Fixed deployment updated to `@255`; no live log or sales-data mutation was run during verification.

## v255 follow-up

- Operations job loading now requests nineteen displayed/runtime-summary fields from `jobs` instead of all twenty-five columns.
- Search and operations loading request thirteen displayed/progress fields from `search_jobs` instead of all twenty columns.
- Request keys, lock tokens, lock timestamps, heartbeats, attempt counts, and the unused large `jobs.payload_json` are omitted from list transfer.
- Current query, progress, result counters, errors, added-lead samples, and source-page facility progress remain available.
- Automated coverage verifies both projections and the absence of internal lock fields and unused payload data.
- Fixed deployment updated to `@256`; no live job execution, external search, or sales-data mutation was run during verification.
