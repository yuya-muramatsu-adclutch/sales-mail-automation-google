# Design QA: 全画面実機監査と操作状態の明確化 v292

## Source visual truth

- User-selected reference: `/var/folders/dt/65rjch0j08vc0l_nbx7pv2y00000gn/T/codex-clipboard-d03de244-a09e-4e9f-9555-7f990ea8207a.png` (1586 x 992).
- Repository copy: `docs/design-references/collection-source-reference-v281.png`.
- Signed-in production comparison: `docs/design-audit/v292-live/07-reference-vs-v292.jpg`.
- Final clean collection state: `docs/design-audit/v292-live/08-source-page-final-clean.png`.

## Full-screen audit scope

Chromeでログイン済みの固定Web appを開き、主要20画面とバックグラウンド実行状態を実データで確認した。変更を伴う収集、メール送信、フォーム送信、マスター登録は実行していない。

| 画面 | 実機確認 | 判定・対応 |
| --- | --- | --- |
| 確認待ち | `v291-live/01-review.png` | 候補数、次操作、一覧の階層が明確。維持。 |
| 今日 | `v291-live/02-dashboard.png` | 作業優先順位と異常確認が明確。維持。 |
| 収集方法 | `v291-live/03-collection-overview.png` | キーワード型と一覧ページ型の選択が明確。維持。 |
| 一覧ページ収集 | `v292-live/08-source-page-final-clean.png` | 参考画像と同じ順序へ整理し、戻る導線も初期表示へ復元。 |
| メール送信対象 | `v291-live/05-email-targets.png` | 初回表示が空白に見えたため、画面固有の読込案内を追加。 |
| 成果・分析 | `v291-live/06-results-analytics.png` | KPI、内訳、推移の順序が明確。遅延読込案内を共通化。 |
| 営業リスト | `v291-live/07-leads.png` | 絞り込み、件数、表の関係が明確。維持。 |
| 収集の進捗 | `v291-live/08-background-jobs.png` | 初回の空白を読込案内へ置換。 |
| フォーム送信 | `v291-live/09-forms.png` | KPIと対象一覧が明確。維持。 |
| 送信プレビュー | `v291-live/10-send-preview.png` | 送信前確認の階層は明確。読込案内を共通化。 |
| 送信履歴 | `v291-live/11-histories.png` | 横長表だが実務上必要な列を保持。初回読込案内を追加。 |
| 営業テンプレート | `v291-live/12-templates.png` | テンプレート操作が理解可能。初回読込案内を追加。 |
| 返信・商談 | `v291-live/13-deals.png` | 返信と商談の状態が明確。初回読込案内を追加。 |
| データ取り込み | `v292-live/02-sync-plain-language.png` | `doPost`等の内部用語を、上書き・重複・継続ルールの日本語表示へ変更。 |
| 送信NG | `v292-live/03-send-ng-guidance.png` | 例、必須条件、無効状態、成功/失敗メッセージを追加。 |
| 除外ドメイン | `v291-live/16-exclusions.png` | 対象と空状態が明確。維持。 |
| エラー詳細 | `v291-live/17-errors.png` | 固定の戻るボタンが内容へ重なるため撤去。既存のヘッダー導線を使用。 |
| Gmail連携 | `v291-live/18-gmail.png` | 認可状態と次操作が明確。維持。 |
| アプリ設定 | `v291-live/19-admin.png` | 検索と設定グループが明確。維持。 |
| 運用状況 | `v292-live/04-ops-no-overlay.png` | 重なる固定ボタンを撤去し、ヘッダーへ「ダッシュボードへ」を追加。 |
| バックグラウンド実行 | `v291-live/21-background-activity.png` | 実行履歴は維持し、固定ボタンによる下部の遮蔽を解消。 |

## Findings and repairs

- [P1 repaired] 一覧ページ収集へ進んだ直後にフォームまでスクロールし、選択した参考画像にある「戻る」と画面タイトルが見えない状態を、ルート先頭へ合わせるよう修正した。
- [P1 repaired] 遅延データを持つ画面が初回表示で空白に見えた。画面固有の読込中表示、`aria-busy`、完了後の自動除去、失敗時の既存再試行導線を統一した。
- [P1 repaired] データ取り込み画面に`POST / doPost`、`fill_blanks`等の実装用語が露出していた。業務上必要な「空欄だけ補完」「重複判定」「画面を閉じても継続」に置き換えた。
- [P1 repaired] エラー、運用、バックグラウンド画面の固定戻るボタンが本文へ重なっていた。固定要素を撤去し、画面ヘッダー内の文脈に合う戻り先へ統一した。
- [P2 repaired] 送信NG登録は何を入力すれば有効になるか不明確だった。入力例、いずれか1項目の必須条件、登録前の無効状態、登録結果メッセージを追加し、保存後の再読込をマスターだけへ限定した。

## Signed-in Chrome verification

- Version marker `v292` was visible on production; `isOverview is not defined` and escaped/raw HTML were absent.
- Loading state appeared immediately on the mail-target screen (`v292-live/01-email-leads-loading.png`), then cleared and rendered 1,924 targets (`v292-live/05-email-leads-loaded.png`).
- The collection screen used generic member/store/facility/exhibitor-list copy, contained no Napp-specific recommendation, and retained both source choices.
- Sync exposed no `POST /`, `doPost`, or `fill_blanks`; Send NG showed all input examples and a disabled submit until valid; operations had no `.background-center-button` and exposed a visible dashboard return action.
- The selected reference and production screenshot were reviewed in the same comparison artifact. Remaining visible differences are the unavoidable Google Apps Script host notice and the live Chrome viewport width; the task hierarchy, spacing system, controls, and action placement match the selected direction.

## Verification

- `node scripts/smoke-test.js`: passed (`v292 full UI audit and loading-state regression tests passed.`).
- All Apps Script `.gs` files and the single inline `Index.html` script compiled successfully.
- `git diff --check` and `clasp status`: passed; all nine Apps Script project files remained tracked.
- `clasp push`, Apps Script version creation `295`, and fixed production deployment update `@295`: passed.
- No external search, email delivery, form delivery, lead mutation, or Send NG registration was executed during verification.

final result: passed

# Design QA: 初期起動と画面読込の共通復旧 v291

## Source visual truth

- User-selected reference: `/var/folders/dt/65rjch0j08vc0l_nbx7pv2y00000gn/T/codex-clipboard-d03de244-a09e-4e9f-9555-7f990ea8207a.png` (1586 x 992).
- Repository copy: `docs/design-references/collection-source-reference-v281.png`.
- The v290 recovery surface is reused without changing the approved visual hierarchy.

## Findings and repairs

- [P1 repaired in code] A retry before initial app data finished loading previously called the deferred route loader, which immediately returned. It now reruns the complete startup request and restores the normal application state.
- [P1 repaired in code] Non-authorization startup errors now produce the same persistent in-context recovery action as later screen-load failures; authorization errors continue to use the dedicated Google consent gate.
- [P1 open] The signed-in production UI still needs visual and interaction verification for startup failure, route failure, keyboard focus, and responsive layout.

## Verification

- Startup and route retry branches, persistent error connection, all 20 route loaders, DOM notice semantics, client runtime evaluation, smoke suite, JavaScript compilation, and `git diff --check`: passed.
- Production deployment: fixed Web app `@294`, app marker `20260723_apps_script_full_workflow_v291_startup_section_recovery`.
- Full visual comparison: blocked; no rendered result is inferred from static or DOM-mock evidence.

final result: blocked

# Design QA: 画面データ読込エラーの復旧導線 v290

## Source visual truth

- User-selected reference: `/var/folders/dt/65rjch0j08vc0l_nbx7pv2y00000gn/T/codex-clipboard-d03de244-a09e-4e9f-9555-7f990ea8207a.png` (1586 x 992).
- Repository copy: `docs/design-references/collection-source-reference-v281.png`.
- New error recovery reuses the approved 8px bordered surface, compact icon/copy/action layout, and existing button hierarchy.

## Findings and repairs

- [P1 repaired in code] Deferred screen failures previously produced only a global error and console warning. Each affected route now shows a persistent in-context explanation and one retry action below its visible heading.
- [P1 repaired in code] Retry runs only the active screen's loader, removes stale failure copy before starting, and replaces it with the newest result if the request fails again.
- [P2 repaired in code] The recovery notice is announced as an alert and reflows to a full-width retry button below 720px.
- [P1 repaired in tests] All 20 routes must remain represented in the lazy-load controller, and the generated recovery notice must retain the route-specific retry target.
- [P1 open] Visual hierarchy, wrapping, focus movement, and retry behavior in the signed-in production UI still require the selected Chrome connection.

## Verification

- Route coverage, failure-notice DOM, alert semantics, retry target, client runtime evaluation, smoke suite, JavaScript compilation, and `git diff --check`: passed.
- Production deployment: fixed Web app `@293`, app marker `20260723_apps_script_full_workflow_v290_section_load_recovery`.
- Full visual comparison: blocked; no rendered result is inferred from static or DOM-mock evidence.

final result: blocked

# Design QA: 固有文言の空状態・クライアント実行契約 v289

## Source visual truth

- User-selected reference: `/var/folders/dt/65rjch0j08vc0l_nbx7pv2y00000gn/T/codex-clipboard-d03de244-a09e-4e9f-9555-7f990ea8207a.png` (1586 x 992).
- Repository copy: `docs/design-references/collection-source-reference-v281.png`.
- The approved navy sidebar, white workspace, blue action hierarchy, and existing icon library remain the visual target.

## Findings and repairs

- [P1 repaired in code] The exclusion table uses its own empty copy, so the previous enhancer rejected it before reading the table-specific configuration. Configured tables now receive their intended guidance regardless of the original empty label.
- [P1 repaired in tests] Every guided state must reference a rendered table and an icon from the existing library; stale IDs and blank icons now fail the regression suite.
- [P1 repaired in tests] The complete client declaration script now executes in a minimal DOM runtime and proves that routing, lazy loading, and key screen renderers remain callable at application scope.
- [P1 open] Signed-in screenshots, same-viewport reference comparison, keyboard interaction, responsive reflow, and console review still require the selected Chrome connection.

## Verification

- Custom exclusion empty copy, dynamically inserted table body, configured actions, and application-scope renderer checks: passed.
- `node scripts/smoke-test.js`, `node --check scripts/smoke-test.js`, inline JavaScript compilation, and `git diff --check`: passed.
- Production deployment: fixed Web app `@292`, app marker `20260723_apps_script_full_workflow_v289_empty_state_runtime_contract`.
- Full visual comparison: blocked; no pixel-level claim is inferred from static or mocked runtime evidence.

final result: blocked

# Design QA: 動的な空状態の反映・主要一覧の案内拡張 v288

## Source visual truth

- User-selected reference: `/var/folders/dt/65rjch0j08vc0l_nbx7pv2y00000gn/T/codex-clipboard-d03de244-a09e-4e9f-9555-7f990ea8207a.png` (1586 x 992).
- Repository copy: `docs/design-references/collection-source-reference-v281.png`.
- Existing navy/white/blue visual language and the selected reference's single-primary-action hierarchy are unchanged.

## Implementation target

- Production deployment: fixed Web app `@291`, app marker `20260723_apps_script_full_workflow_v288_dynamic_empty_state_coverage`.
- Required comparison: signed-in desktop at the reference viewport, covering dynamically rendered empty tables and the collection source-page route.
- Implementation screenshot: unavailable because the selected Chrome connection is not loaded in the current Codex process.

## Findings and repairs

- [P1 repaired in code] The observer receives inserted `thead`/`tbody` nodes, but the v287 enhancer only inspected the inserted node and descendant tables. It now resolves the nearest parent table, so post-load and post-filter empty states are actually enhanced.
- [P1 repaired in code] Major collection, background, sending, history, sync, deal, exclusion, and analytics tables now explain what an empty result means and expose one useful next action where applicable.
- [P2 repaired in code] The empty-state query now targets only the table cell's direct label, preventing nested copy spans from being treated as a new unenhanced state.
- [P1 open] Same-viewport rendered comparison, keyboard focus inspection, responsive wrapping, and console review still require the selected Chrome connection.

## Verification

- DOM regression: inserted `tbody` resolves its containing `sendingPlanTable` and receives the correct guided empty state and action.
- Static application contract: all 20 routed screens, UI handlers, API routes, labels, and literal DOM references remain covered by the smoke suite.
- `node scripts/smoke-test.js`, `node --check scripts/smoke-test.js`, inline JavaScript compilation, and `git diff --check`: passed.
- Fixed production deployment updated to `@291`.
- Full-view and focused-region visual comparison: blocked until Chrome control is loaded; no pixel-level result is inferred from static code.

final result: blocked

# Design QA: 全画面の案内付き空状態・動的アイコン v287

## Source visual truth

- User-selected reference: `/var/folders/dt/65rjch0j08vc0l_nbx7pv2y00000gn/T/codex-clipboard-d03de244-a09e-4e9f-9555-7f990ea8207a.png` (1586 x 992).
- Repository copy: `docs/design-references/collection-source-reference-v281.png`.
- Target language preserved: navy workflow sidebar, white content surface, blue primary actions, low-radius bordered cards, concise task-first copy.

## Implementation target

- Production deployment: fixed Web app `@290`, app marker `20260723_apps_script_full_workflow_v287_guided_empty_states_dynamic_icons`.
- Viewport/state required for comparison: signed-in desktop at the same 1586 x 992 content viewport, covering all 20 routes plus empty list states and the collection source-page route.
- Implementation screenshot: unavailable in the current run because the selected Chrome connection was configured after the current Codex process started.
- CSS viewport and density normalization: pending browser capture; no implementation pixels were inferred from code.

## Findings and repairs

- [P1 repaired in code] Dynamically rendered review command buttons retained `data-ui-icon` placeholders because icon hydration only ran against the initial DOM. The mutation observer now hydrates the inserted root and descendants.
- [P1 repaired in code] Empty tables across eight high-use surfaces only said that data was absent. They now explain what the state means and, where useful, provide one direct next action.
- [P2 repaired in code] Guided empty states now reflow from a three-column cue/copy/action layout to a stacked mobile action without changing the surrounding table structure.
- [P1 open] A same-viewport rendered comparison is still required to judge actual wrapping, table-cell height, icon size, focus states, and interaction behavior.

## Verification

- Full-view comparison evidence: blocked; no current signed-in implementation screenshot.
- Focused region comparison evidence: blocked for the same reason.
- Fonts and typography: source and CSS tokens inspected; rendered fidelity not yet proven.
- Spacing and layout rhythm: responsive CSS and table structure verified statically; rendered fidelity not yet proven.
- Colors and visual tokens: existing approved navy/white/blue tokens reused; rendered contrast still needs browser inspection.
- Image and icon fidelity: existing in-app icon library reused; dynamic hydration is covered by a DOM unit regression.
- Copy and content: empty-state text and direct actions are covered by regression assertions.
- Primary interactions tested: dynamic icon root hydration and review-empty-state action routing passed in the local DOM unit regression. Signed-in clicks remain pending.
- Console errors checked: blocked without the selected Chrome connection.

## Comparison history

- Pass 1: code and DOM regression identified and repaired dynamic icon hydration and unguided empty states. Browser-rendered comparison remains unavailable.

final result: blocked

# Structural QA: 動的入力と画面遷移 v286

## Scope and evidence

- Routed-screen contract: all 20 sections have a title, concise task description, and visible `h1`.
- Interaction contract: all 356 inline UI bindings resolve to declared client functions or known browser methods.
- Control-name audit: 114 inputs, 33 selects, and 12 textareas have an explicit or enclosing visible label after the dynamic-control repairs.
- Fixed deployment: `@289`, app marker `20260722_apps_script_full_workflow_v286_dynamic_control_accessibility`.

## Repairs

- Added screen-reader names to editable job-result email/form fields, genre and reason master fields, the fixed template-test recipient, and the source-page URL input.
- Added SPA route focus management so every screen change announces the destination heading, with a visible keyboard focus ring.
- Added task-center focus entry, redraw preservation, close return, and destination-heading handoff.
- Darkened success/warning tokens and the source URL placeholder while preserving the selected reference design's blue/white hierarchy.

## Verification and limitation

- `node scripts/smoke-test.js`, inline JavaScript compilation, DOM/action contracts, and `git diff --check`: passed.
- `clasp push` and fixed deployment update to `@289`: passed.
- Chrome control is still unavailable in this task. Under the Product Design audit contract, signed-in screenshots and same-viewport comparison remain unverified rather than inferred from static code.
- No external search, mail delivery, form delivery, or lead mutation was executed.

final result: structural and keyboard-accessibility coverage strengthened and deployed; signed-in visual audit still requires Chrome control

# App-wide QA: 共通操作とランタイムガード v285

## Scope and evidence

- Static accessibility inventory: 84 static buttons, 2 static links, and 51 form controls; every button/link has an accessible name, and the one unlabeled search control was repaired.
- Literal DOM reference audit: every string-based `getElementById` target resolves to a static DOM ID; the dead Gmail fallback was removed.
- Dialog audit: lead details, template edit, template test, and batch-send confirmation now share focus entry, focus trapping, Escape close, focus return, and background scroll locking.
- Fixed deployment: `@288`, app marker `20260722_apps_script_full_workflow_v285_dialog_accessibility_and_runtime_guard`.

## Repairs

- Replaced the source selector's incomplete ARIA tab semantics with a pressed-state button group matching its actual behavior.
- Moved dialog semantics from backdrops to the interactive panels and connected each panel to its visible title.
- Added an accessible name to the admin settings search, removed the nonexistent `gmailStatusPills` fallback, localized remaining English helper labels, and aligned success/warning colors to the existing accessible dark tokens.
- Fixed a dead runtime warning condition by retaining the configured value before clamping the effective batch budget to 330 seconds.

## Verification and limitation

- `node scripts/smoke-test.js`: passed with v285 dialog, DOM-reference, source-selector, and runtime-alert regressions.
- `Index.html` inline JavaScript compilation and `git diff --check`: passed; `clasp push` and fixed deployment update to `@288`: passed.
- Anonymous production reachability redirects normally to Google sign-in. The selected Chrome control runtime and `clasp run` permission are unavailable in this task, so the signed-in 20-screen image/interaction sweep and authenticated v285 API marker remain pending.
- No external search, mail delivery, form delivery, or lead mutation was executed.

final result: v285 deployed with common keyboard/accessibility and runtime-guard repairs; signed-in visual sweep pending Chrome control availability

# App-wide QA: 全20画面の整合性監査 v284

## Scope and evidence

- Static inventory: 20 page sections, 356 inline UI event bindings, and 68 literal client API actions.
- Production read audit: 24 read-only routes passed with the corrected server argument shapes.
- Runtime health: schema 7/7 ready, background worker healthy, storage healthy, unresolved error count 0.
- Fixed deployment: `@287`, app marker `20260722_apps_script_full_workflow_v284_app_wide_audit_cleanup`.

## Repairs

- Added the missing Web app dispatch for `getLeadListStats` and standardized unsupported global error tones.
- Replaced ambiguous or English-only page labels with consistent Japanese task names across headings, navigation, and document titles.
- Removed the false Apps Script version-quota alarm: a release label is now informational and is never treated as the count of stored versions. Old cached alerts are normalized on read.
- Avoided opening SpreadsheetApp during `getAppInfo` when `SPREADSHEET_ID` is already stored.
- Repaired the production schema with the existing safe setup path and classified only the exact historical/transient audit errors as resolved; future recurrences remain open.

## Verification

- `node scripts/smoke-test.js`: passed.
- `Index.html` inline JavaScript compilation: passed.
- Client API to Web app route parity: passed.
- `git diff --check`: passed.
- Authenticated production HTML: HTTP 200 with all updated page-title markers and intact source-page workbench markup.
- No external search, mail delivery, form delivery, or lead mutation was executed.

## Visual verification limitation

- The selected Codex Browser control runtime is not exposed in this task. A signed-in same-viewport screenshot pass across all 20 pages remains pending; the provided collection-page reference was implemented and runtime-verified separately in v281.

final result: code, API, schema, and production delivery verified; signed-in visual sweep pending Browser availability

# Runtime QA: 収集画面描画停止 v279

## Evidence

- User-provided Chrome screen showed `isOverview is not defined` above the page header on both Collection and Review routes.
- The Collection route stopped before rendering the workbench body; the Review route rendered partially but retained the global error.

## Root cause and repair

- A source-page estimate refresh block referenced collection-local variables from `renderSearchActivityPanel`.
- The block now runs only inside `renderCollectionCommandCenter`, after the active collection markup exists.
- Regression assertions ensure Search Activity and Job Results renderers do not reference `isOverview` or `activeTab`.

## Verification

- `node scripts/smoke-test.js`: passed with v279 render-scope assertions.
- `Index.html` inline JavaScript syntax compilation: passed.
- `git diff --check`: passed.
- Fixed Web app deployment updated to `@282`.
- Authenticated `getAppInfo` returned `20260722_apps_script_full_workflow_v279_collection_render_scope_fix`.
- A fresh user-browser screenshot is still required to confirm the signed-in rendered state after refresh.

final result: root cause fixed and deployed; signed-in visual confirmation pending refresh

# Design QA: 汎用一覧ページ収集ワークベンチ v278

## Source visual truth

- User-selected design: source-first URL collection layout.
- Repository reference: `docs/design-references/collection-universal-v278.png` (1586 x 992).
- Existing product constraints preserved: navy workflow sidebar, blue/white palette, line-icon library, existing collection routes, background processing, exclusion rules, and review workflow.

## Implementation

- Removed the visible nap-camp/camping preset and made the first choice `新しい一覧ページURL` or `保存済みURLを使う`.
- The primary flow is URL input, concise condition summary, optional detailed conditions, collection preview, then save or start.
- Classification defaults to `未分類`; batch size, full-page processing, search completion, and a reusable saved name remain optional.
- Saved sources now preserve batch size and search-completion settings in addition to URL, label, classification, and full-page mode.
- Generic server extraction is regression-tested against internal detail links and external official-site links. Full-page mode can continue up to 200 candidates through the existing cursor/background worker.
- Existing controls, APIs, duplicate/exclusion safety, contact discovery, saved-source monitoring, and background progress remain functional.

## Static and runtime evidence

- `node scripts/smoke-test.js`: passed with v278 generic-source assertions.
- `Index.html` inline JavaScript syntax compilation: passed.
- Source-page control ID uniqueness: passed.
- `git diff --check`: passed.
- `clasp push`: passed.
- Fixed Web app deployment updated to `@281` with app code `20260722_apps_script_full_workflow_v278_universal_source_collection`.
- Authenticated `getAppInfo` returned the v278 marker.
- Authenticated Web app HTML returned HTTP 200 and contained all six required generic-workbench markers.

## Visual verification limitation

- The user-selected Codex Browser control runtime is not exposed in this task, so a signed-in implementation screenshot and same-viewport side-by-side comparison could not be captured.
- Static structure, responsive CSS, saved-setting behavior, generic parsing, deployment metadata, and authenticated runtime markers are verified.

final result: v278 implemented and runtime-verified; rendered comparison pending Browser availability

# Design QA: 営業リスト収集ツール v277

## Source visual truth

- User-provided production screenshot: `docs/audits/v277-collection-focus/01-current-source-page.png` (3360 x 1856).
- Full audit: `docs/audits/v277-collection-focus/AUDIT.md`.
- Existing navy sidebar, blue/white visual language, icon library, controls, routes, and collection behavior are preserved.

## Audit findings addressed

- The first viewport prioritized three large status cells, a large method-change panel, and the alternative-method disclosure before the actual URL field.
- The selected method name and explanation repeated in the route bar and form heading.
- The backward action `方法を選び直す` competed visually with the forward collection task.
- URL, options, preview, and submit were stacked vertically despite the available desktop width, pushing the primary CTA below the fold.
- Automatic collection `OFF` appeared as a prominent status even though it does not block manual source-page collection.

## Implementation

- Active methods now use a compact breadcrumb-style row with a small `方法選択` back action and `手順 2 / 4` state.
- The active form renders immediately below that row; status cells and alternative methods move below the current task.
- Desktop forms use the left column for URL/keywords and options, with a sticky right-side preview and submit card so the primary action remains visible.
- The form collapses to one column below 980px; status cells collapse below 620px.
- Active-page heading, spacing, cards, textareas, and secondary status cells are compacted without changing existing IDs or collection APIs.
- Method changes move focus to the form panel so keyboard users receive the updated context.
- The v276 four-step overview, three-step form labels, optional settings, result banner, and saved-URL disclosure remain intact.
- Existing IDs and collection APIs are preserved; no search, mail, or sales-data operation was executed during verification.

## Static and runtime evidence

- `node scripts/smoke-test.js`: passed with v277 focus-mode regression assertions.
- `Index.html` inline JavaScript syntax compilation: passed.
- `git diff --check`: passed.
- `clasp push`: passed.
- Fixed Web app deployment updated to `@280` with app code `20260722_apps_script_full_workflow_v277_collection_focus_mode`.
- Authenticated `getAppInfo` returned the v277 marker.
- Authenticated Web app HTML returned HTTP 200 and contained the active-focus class and primary source-page action.

## Visual verification limitation

- The requested Codex Browser control runtime was not exposed in this task, so click-through behavior and a same-viewport rendered screenshot could not be captured.
- The deployed HTML, version marker, static structure, responsive breakpoints, and JavaScript regressions are verified. Final visual sign-off still requires a hard refresh in the signed-in browser.

final result: v277 deployed and runtime-verified; rendered screenshot pending Browser availability

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

# Design QA: 確認待ちの施設名・メール編集 v269

## Source visual truth

- User-provided production appshot: `Google Chrome Appshot 2026-07-20T10-50-48.236Z.png`.
- Existing review card, queue, typography, spacing, buttons, and color system are preserved.
- Requested behavior is limited to editing facility name and email without leaving the review screen.

## Implementation

- The existing edit action is relabeled `施設名・メールを編集` and opens a compact inline form in the selected review card.
- The form uses the existing field and button styles, requires the facility name, keeps email optional, and provides save/cancel actions.
- Saving calls the existing `updateLead` API, replaces the local row with the authoritative returned lead, and keeps the user in the review workflow.
- Table-mode review actions open the same inline editor instead of navigating to the full Sales List editor.

## Verification

- `node scripts/smoke-test.js`: passed.
- `Index.html` inline script syntax: passed.
- `git diff --check`: passed.
- Fixed deployment updated to `@271`; authenticated `getAppInfo` returned `20260720_apps_script_full_workflow_v269_review_edit_domain_dedupe`.
- Production domain-repair verification returned zero duplicate domains twice after cleanup.

## Visual comparison evidence

- The reference is available in the current conversation, but not as a readable local image file.
- Authenticated Chrome screenshot capture/control is not exposed in this task, so a same-viewport implementation screenshot and side-by-side comparison could not be produced.

## Findings

- [P1] Final visual sign-off remains blocked until the deployed review screen is hard-refreshed and captured in the authenticated Chrome session.
- Static form hierarchy, responsive one-column fallback, save/cancel behavior, and production API/version checks passed.

final result: blocked on authenticated production screenshot; implementation and runtime checks passed

# Design QA: 営業フロー・ステップボード v275

## Source visual truth

- User-selected design: option 2, `営業フロー・ステップボード`.
- Repository reference: `docs/design-reference-dashboard-v275.png`.
- Original generated source: `/Users/muramatsuyuuya/.codex/generated_images/019f8532-e84f-72a1-9e89-a1012412650b/exec-00339ec5-8baf-432a-a169-cb2cf6684432.png`.
- Existing product constraints preserved: navy workflow sidebar, established colors and icon library, 8px radius, top send-safety strip, existing routes, and existing detailed operational controls.

## Audit findings addressed

- The previous first viewport repeated send, API, and monthly metrics across multiple large card groups.
- The highest-volume work item, review pending, appeared below summary cards instead of leading the daily workflow.
- Healthy API status occupied primary space while the next operator action began below the fold.
- Mail controls, collection status, monthly summaries, and breakdown tables competed with the daily decision path.

## Implementation

- The first section now exposes five direct workflow steps: `今日 → 収集 → 確認 → 送信 → 成果`.
- The active bottleneck uses both text and emphasis, and each workflow card is a keyboard-accessible button with an accessible label.
- Review, error, and send work is consolidated into one prioritized task queue with direct actions.
- API health, the automatic-send window, and today's sent count use one compact operations column.
- Monthly new leads, replies, and deals use one compact outcome strip.
- Mail control, collection status, legacy KPI totals, and status/genre breakdowns remain available under `詳細な運用データ`.
- At narrow widths, the workflow remains horizontally scrollable, task controls stack, and outcome cards collapse to one column.

## Static and functional evidence

- `node scripts/smoke-test.js`: passed.
- `Index.html` inline script syntax compilation: passed.
- `git diff --check`: passed.
- New dashboard IDs are unique in static markup.
- Regression assertions cover the new workflow, task queue, operations, outcomes, detail disclosure, active-step accessibility, and responsive breakpoint.
- The fixed Web app deployment was updated in place to `@277` with app code v275.

## Visual comparison evidence

- The exact selected reference is stored in the repository.
- A rendered implementation screenshot could not be captured because the requested Codex in-app browser runtime is not exposed in this task.
- The user's visible Chrome was intentionally not used after the user requested that their screen remain untouched.
- Source-only and code-only review do not qualify as a visual comparison pass.

## Production checklist

- Hard-refresh the fixed Web app URL and confirm the first viewport matches the selected five-stage composition.
- Confirm `確認` shows the live pending count and is emphasized when pending work exists.
- Confirm each workflow step and task action opens the intended existing route.
- Confirm `送信時間外` remains visible in the global safety strip and in the operations column.
- Confirm the workflow scrolls horizontally without clipping at 900px and below.
- Open `詳細な運用データ` and confirm mail control, collection status, and both breakdown tables remain usable.

final result: blocked on same-viewport Codex Browser screenshot comparison; implementation and static checks passed

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

## v256 follow-up

- Operations support data is now loaded by screen instead of fetching histories, logs, and both job tables for every operations-related route.
- Histories use one request; progress and the task center use the two job requests; sync uses one log request; errors add debug details only on demand.
- The sending screen loads histories and jobs only, while Gmail disclosures load the selected history or lock data only.
- Admin startup no longer preloads logs or jobs; its logs disclosure loads sync-log summaries, debug details, and storage health together.
- The combined operations screen retains parallel loading and partial-failure fallback across all three data groups.
- Automated coverage verifies the three section loaders, route-specific wiring, combined loader, and removal of the previous all-routes bundle.
- Fixed deployment updated to `@257`; no live job, mail, sync, or sales-data mutation was run during verification.

## v257 follow-up

- Startup reuses the Serper/SearXNG summary already fetched by `getInitialData` when a dashboard placeholder is needed.
- Constant app metadata is shared for two minutes so rapid reloads do not reopen the backing Spreadsheet only to rebuild the same ID and URL.
- The metadata cache key includes both code version and Spreadsheet ID, and setup clears it after initializing the backing store.
- The first uncached call still opens the Spreadsheet, preserving detection of unavailable or unauthorized storage.
- Automated coverage verifies startup argument reuse, placeholder wiring, cache key, TTL, and setup invalidation.
- Fixed deployment updated to `@258`; no live search, mail, or sales-data mutation was run during verification.

## v258 follow-up

- Lead repair jobs now release the global script lock after at most twenty-five targets and one hundred rows of verification scope.
- Large repair runs are capped and resumable, preventing a maintenance pass from monopolizing review and send-NG updates.
- Every target row is revalidated by lead ID immediately before mutation so concurrent row movement cannot update another facility.
- Non-advertiser cleanup explicitly loads send, reply, deal, and archive safety fields before deciding that a lead is removable.
- Overreach restoration uses the current send-NG value rather than the pre-lock snapshot.
- Automated coverage verifies batch limits, sent-lead protection, and row-identity conflict handling.
- Fixed deployment updated to `@259`; no live search, mail, or sales-data mutation was run during verification.

## v259 follow-up

- NAP campsite genre repair now uses the same bounded twenty-five-target lock batches as the other lead maintenance tools.
- Each mutation revalidates lead ID, source, source ID, and current genre immediately before writing.
- Pending search-job payload repair runs under a separate lock and is capped at twenty-five jobs per pass.
- Empty or completed lead ranges can still repair pending job payloads without rescanning lead rows.
- Automated coverage verifies bounded locks, identity checks, job-lock separation, and removal of full-scan reads while locked.
- Fixed deployment updated to `@260`; no live search, mail, or sales-data mutation was run during verification.

## v260 follow-up

- Review decisions now locate the lead row once and reuse that exact row snapshot for conflict checks and mutation.
- Send-NG, no-action, approve, and undo requests no longer repeat the full lead ID lookup while holding the global lock.
- The shared found-row updater preserves derived fields, status side effects, timestamps, and cache invalidation for normal edits.
- Automated coverage retains idempotency, stale-action conflict, undo, and invalid-action checks while asserting one lookup per valid request.
- Fixed deployment updated to `@261`; no live mail, external search, or sales-data mutation was run during verification.

## v261 follow-up

- Form outreach recording now loads only NG-master and excluded-domain rules while holding the global lock.
- Mail history safety data is no longer scanned for a form-only action that never consumes it.
- Email eligibility retains the complete master and delivery-safety context, preserving duplicate-send protection.
- Automated coverage verifies the lightweight context fields and the absence of mail-history loading in the form-recording path.
- Fixed deployment updated to `@262`; no live form, mail, search, or sales-data mutation was run during verification.

## v262 follow-up

- Client API calls now release the busy state when Apps Script never returns a success or failure callback.
- Normal requests use a two-minute watchdog, while known search, migration, repair, and batch actions receive five minutes and thirty seconds.
- Timeout copy warns that the server-side result may already exist and asks the user to refresh before retrying, avoiding automatic duplicate mutations.
- Successful and failed requests clear the watchdog, and the existing completion guard ignores late callbacks.
- Automated coverage verifies both timeout tiers, timer cleanup, error code, and user guidance; inline JavaScript syntax also passes.
- Fixed deployment updated to `@263`; no live form, mail, search, or sales-data mutation was run during verification.
