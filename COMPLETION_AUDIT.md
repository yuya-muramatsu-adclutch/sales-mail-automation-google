# 完成監査メモ

最終更新: 2026-07-05

## デプロイ

- Script ID: `1IPcbftgkafJCBKkoIDnSBjw4fnQoOdXR8I0KjpUCLsq4MYp_7olPOk76`
- Web app @23 / code v24: `https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec`
- Spreadsheet DB: `https://docs.google.com/spreadsheets/d/1IuJrWB7RGd2qIFDlhe5lfKaBnmUKN4RcnxdFFTuluZY/edit`
- Code version: `20260705_apps_script_full_workflow_v24_menu_parity`

## 計画書との対応

| 項目 | 状態 | 根拠 |
| --- | --- | --- |
| Google Sheets DB | 完了 | `setup()` で `Auto Sales List App DB` を作成済み |
| 主要タブ作成 | 完了 | 19タブ作成済み |
| Apps Script HTML Service画面 | 完了 | v9 Web app GETでHTML返却を確認済み |
| カスタムメニュー | 完了 | `onOpen()` / `showSidebar()` 実装済み |
| `leads` CRUD | 完了 | v9 `doPost` で作成・更新・検索・物理削除を確認済み |
| ID更新ルール | 完了 | 更新・削除は `findRowById_()` 経由 |
| UUID | 完了 | `appendSheetRecord_()` / `createLead()` でUUID付与 |
| LockService | 完了 | 書き込み系関数で `withScriptLock_()` 使用 |
| エラーログ | 完了 | `sync_logs` と `appendSyncError_()` 実装済み |
| メールテンプレート管理 | 完了 | UIと `saveEmailTemplate()` / `listEmailTemplates()` 実装済み |
| Gmail/MailApp送信 | 完了 | `sendLeadEmail()` 実装、リード詳細UIから実行可能 |
| 送信履歴 | 完了 | `send_histories` へ保存 |
| 送信NG/除外ドメイン | 完了 | UIとマスター関数実装済み |
| Serper APIキー保存 | 完了 | PropertiesService保存、UIから登録可能 |
| Serper検索ジョブ | 完了 | 小規模ジョブ、検索結果、使用量ログ、ドメインキャッシュ実装済み |
| 検索上限 | 完了 | 日次/月次/リード別上限を `settings` から確認 |
| Gmail送信上限 | 完了 | アプリ日次上限とMailApp残数を確認 |
| 返信チェック | 完了 | `checkRepliesForLeads()` と運用UI実装済み |
| Google Calendar登録 | 完了 | `createCalendarEventForLead()` とリード詳細UI実装済み |
| ダッシュボード | 完了 | 全5,441件対象の集計表示、CacheService、`dashboard_cache` 実装済み |
| CSVインポート | 完了 | 運用UIと `importLeadsFromCsv()` 実装済み |
| バッチ再開 | 完了 | `search_jobs` の `processed_count` と `advanceQueuedJobs()` 実装済み |
| Driveバックアップ | 完了 | `createSpreadsheetBackup()` 実装済み |
| `doPost` API | 完了 | v8でリード、テンプレート、マスター、検索、運用系アクションを公開 |
| 旧アプリからの営業リスト移行 | 完了 | Supabase `sales_leads` 5,441件を `leads` へ移行済み |
| リード一覧ページング | 完了 | 総件数5,441件を表示し、500/1000/2000件単位でページ移動可能 |
| 旧アプリUI寄せ | 完了 | 旧Next/Supabase版のサイドバー、パネル、テーブル、ステータス色分けへ寄せたv10 UIを反映 |
| 旧アプリ詳細反映 | 完了 | ダッシュボード、クイックビュー、ジャンル/KPI、フォーム送信リスト、Serper検索概要をv11で反映 |
| 営業リスト忠実再現 | 完了 | 旧 `LeadsBulkTable` の選択バー、列構成、確認待ちガイド、詳細ドロワーをv12で反映 |
| 他メニューUI忠実再現 | 完了 | テンプレート、送信NG/除外、フォーム送信、営業リスト収集、管理/運用をv13で旧アプリ構成に寄せて反映 |
| 旧アプリナビ導線反映 | 完了 | 旧 `AppFrame` のリスト/運用メニューに合わせ、v14で追加9タブを反映 |
| 旧アプリ詳細パネル反映 | 完了 | 旧 `EmailPreviewPanel` / `JobResultsReviewTable` / Gmail連携系パネルに合わせ、v18で送信前確認、検索結果カテゴリ、Gmailテスト、送信ロック、Google認証管理を反映 |
| 旧アプリ管理UI反映 | 完了 | 旧 `SendWindowSettingsForm` / `BackgroundWorkerSettingsForm` / `DuplicateLeadManager` / エラー詳細に合わせ、v19で自動運用設定、重複リスト管理、エラー詳細を反映 |
| 旧アプリ表示項目/カスタム項目反映 | 完了 | 旧 `ListViewSettingsPanel` / `CustomFieldDefinitionForm` / `CustomFieldsInputs` に合わせ、v20でジャンル別表示項目設定、カスタム項目定義、リード詳細入力を反映 |
| 旧アプリテンプレート差し込みUI反映 | 完了 | 旧 `TemplateTagMenu` に合わせ、code v22で差し込みタグメニュー、サンプル文面、差し込み値プレビュー、日本語/カスタム変数を反映 |
| 旧アプリAppFrame反映 | 完了 | 旧 `AppSafetyStrip` / `AppTopShortcutBar` / `AppRouteProgress` に合わせ、code v22で運用ステータスバー、上部ショートカット、タブ切替進行バーを反映 |
| 旧アプリ共通ジョブUI反映 | 完了 | 旧 `BackgroundJobWidgets` / `BackgroundJobToasts` / `BackgroundJobCenter` に合わせ、code v23で右下ジョブ通知、進捗バー、全画面共通の戻るボタンを反映 |
| 旧アプリメニュー分割反映 | 完了 | 旧 `ng-master` / `exclusions` / `background-jobs/activity` / `errors` に合わせ、code v24で送信NG、除外ドメイン、直近実行結果、エラー詳細を独立タブ化 |

## 検証済み

- `clasp push -f` 成功
- `clasp deploy -d apps-script-full-workflow-v7-auth-preflight-fix` 成功
- 既存Web app URLを `clasp deploy -V 7 -i ...` でv7へ再デプロイ済み
- `.gs` 全ファイルのNode構文チェック成功
- `node scripts/smoke-test.js` 成功
- `appsscript.json` JSON parse成功
- v7 Web app認証付きGETでHTML返却成功
- v7 Web app HTMLにメール送信UIとカレンダー登録UIが含まれることを確認
- v7 Web appの起動処理が承認事前判定より先に `getInitialData()` を呼ぶことを確認
- v7 `doPost getInitialData` が `20260704_apps_script_full_workflow_v7` を返すことを確認
- v7 `doPost` のテンプレート/NG/除外/履歴読み取りAPI成功
- v7 `doPost` のリード作成・更新・検索・物理削除成功
- CRUDスモーク用一時リードは削除後0件であることを確認
- `clasp deploy -d apps-script-full-workflow-v8-lead-migration-api` 成功
- 既存Web app URLを `clasp deploy -V 8 -i ...` でv8へ再デプロイ済み
- `node scripts/migrate-sales-leads.js --dry-run` 成功
- `node scripts/migrate-sales-leads.js` 成功
- 移行結果: `migratedRows=5441`, `expectedRows=5441`, `targetTotal=5441`
- `leads` タブは最大行5442で、ヘッダー1行 + データ5,441件であることを確認
- `sync_logs` に移行完了ログが記録されていることを確認
- `clasp deploy -d apps-script-full-workflow-v9-lead-pagination-counts` 成功
- 既存Web app URLを `clasp deploy -V 9 -i ...` でv9へ再デプロイ済み
- v9 `listLeads({limit:500})` が `total=5441`, `items.length=500` を返すことを確認
- v9 `listLeads({limit:1000})` が `total=5441`, `items.length=1000` を返すことを確認
- v9 `listLeads({limit:500, offset:500})` が2ページ目500件を返すことを確認
- v9 `getDashboardStats({bypassCache:true})` が `leadsTotal=5441`, `statusSum=5441` を返すことを確認
- v9 Web app HTMLに `leadPager`, `leadLimit`, `renderLeadPager` が含まれることを確認
- `clasp deploy -d apps-script-full-workflow-v10-design-alignment` 成功
- 既存Web app URLを `clasp deploy -V 10 -i ...` でv10へ再デプロイ済み
- v10 Web app HTMLに `sidebar`, `tab nav-item active`, `section-header`, `row-send-ng`, `activeViewTitle`, `MVP Operations` が含まれることを確認
- v10 `doPost getInitialData` が `20260704_apps_script_full_workflow_v10_design_alignment` と `leadsTotal=5441` を返すことを確認
- v10 `listLeads({limit:500, offset:0})` が `total=5441`, `items.length=500`, `limit=500` を返すことを確認
- `clasp deploy -d apps-script-full-workflow-v11-legacy-ui-deep-port` 成功
- 既存Web app URLを `clasp deploy -V 11 -i ...` でv11へ再デプロイ済み
- v11 Web app HTMLに `dashboard-hero-grid`, `dashboard-signal-grid`, `lead-quick-views`, `lead-kpi-grid`, `form-work-panel`, `searchOverview`, `フォーム送信リスト` が含まれることを確認
- v11 `doPost getInitialData` が `20260704_apps_script_full_workflow_v11_legacy_ui_deep_port`, `leadsTotal=5441`, `sendTargets=2016`, `formTargets=1161` を返すことを確認
- v11 `listLeads({limit:100, filter:"email"})` が `total=2016`, `items.length=100`, `stats.sendable=2016` を返すことを確認
- v11 `listLeads({limit:50, filter:"form", formStatus:"active"})` が `total=1065`, `items.length=50` を返すことを確認
- `clasp deploy -d apps-script-full-workflow-v12-leads-ui-fidelity` 成功
- 既存Web app URLを `clasp deploy -V 12 -i ...` でv12へ再デプロイ済み
- v12 Web app HTMLに `leadBulkActionBar`, `leadDetailDialog`, `prospecting-review-guide`, `table-link-button`, `lead-select-cell`, `leadGenreFilter`, `leadEditGenre` が含まれることを確認
- v12 `doPost getInitialData` が `20260704_apps_script_full_workflow_v12_leads_ui_fidelity`, `leadsTotal=5441`, `sendTargets=2016`, `formTargets=1161`, `reviewTargets=1136` を返すことを確認
- v12 `listLeads({limit:100, filter:"email"})` が `total=2016`, `items.length=100` を返すことを確認
- v12 `listLeads({limit:50, filter:"form", formStatus:"active"})` が `total=1065`, `items.length=50` を返すことを確認
- v12 `listLeads({limit:50, filter:"review"})` が `total=1136`, `items.length=50` を返すことを確認
- Chrome確認で営業リストタブが `section active` になり、表示列が `No.`, `操作`, `屋号`, `連絡先`, `ジャンル名`, `ステータス`, `送信状況` になることを確認
- Chrome確認で `履歴・編集` から `lead-detail-backdrop open` の詳細ドロワーが開くことを確認
- `clasp deploy -d apps-script-full-workflow-v13-full-menu-ui-fidelity` 成功
- 既存Web app URLを `clasp deploy -V 13 -i ...` でv13へ再デプロイ済み
- v13 Web app HTMLに `templateSafetyPanel`, `templateSenderBanner`, `mastersHero`, `formOutreachSummary`, `form-board-grid`, `searchActivityPanel`, `collectionCommandCenter`, `searchUsageTable`, `opsReadinessPanel`, `opsStatusGrid`, `jobTable`, `syncLogTable` が含まれることを確認
- v13 `doPost getInitialData` が `20260704_apps_script_full_workflow_v13_full_menu_ui_fidelity`, `leadsTotal=5441`, `sendTargets=2016`, `formTargets=1161`, `reviewTargets=1136` を返すことを確認
- Chrome確認でテンプレート、送信NG/除外、フォーム送信、営業リスト収集ツール、管理/運用タブの旧アプリ風パネルと履歴/ジョブテーブル表示を確認
- `clasp deploy -d apps-script-full-workflow-v14-nav-parity-ui` 成功
- 既存Web app URLを `clasp deploy -V 14 -i ...` でv14へ再デプロイ済み
- v14 Web app HTMLに `backgroundJobs`, `emailLeads`, `sendingPlanTable`, `sendHistoryScreenTable`, `dealTable`, `analyticsFunnel`, `syncScreenTable`, `gmailStatusPills`, `adminReadinessPanel` が含まれることを確認
- v14 `doPost getInitialData` が `20260704_apps_script_full_workflow_v14_nav_parity_ui`, `leadsTotal=5441` を返し、`listLeads({filter:"email"})` が `total=2016`、`listLeads({filter:"deal"})` が `total=4` を返すことを確認
- Chrome確認で `バックグラウンド進捗`, `メール送信リスト`, `送信プレビュー`, `送信履歴`, `商談`, `分析`, `同期`, `Gmail連携`, `管理` の追加9タブをクリックし、旧アプリ風の表示を確認
- `clasp deploy -d apps-script-full-workflow-v18-preview-review-gmail-ui` 成功
- 既存Web app URLを `clasp deploy -V 18 -i ...` でv18へ再デプロイ済み
- v18 Web app HTMLに `emailPreviewPanel`, `templateTestRecipientPanel`, `jobResultsReviewPanel`, `gmailConnectionCheckPanel`, `mailSendLockPanel`, `googleCredentialSummaryPanel`, `結果カテゴリ`, `対象リスト自動送信` が含まれることを確認
- v18 `doPost getAppInfo` が `20260704_apps_script_full_workflow_v18_preview_review_gmail_ui` を返し、`getInitialData` が `leadsTotal=5441`, `sendTargets=2016`, `formTargets=1161` を返すことを確認
- v18 `listLeads({filter:"email"})` が `total=2016`, `items.length=10` を返すことを確認
- v18 Chrome確認で `送信プレビュー`, `営業リスト収集ツール`, `Gmail連携`, `管理` をクリックし、差し込みプレビュー、テンプレートテスト送信先、検索結果カテゴリ、Gmail連携テスト、送信ロック、Google/Gmail APIキー管理、本番公開前チェックの表示を確認
- v18 live配信scriptを抽出し、`node --check /tmp/live-appscript-v18-current.js` が成功することを確認
- `clasp deploy -d apps-script-full-workflow-v19-admin-settings-ui` 成功
- 既存Web app URLを `clasp deploy -V 19 -i ...` でv19へ再デプロイ済み
- v19 Web app HTMLに `adminAutomationSettingsPanel`, `duplicateLeadManagerPanel`, `adminErrorDetailsPanel`, `renderAdminAutomationSettingsPanel`, `loadDuplicateCandidates`, `renderAdminErrorDetailsPanel` が含まれることを確認
- v19 `doPost getAppInfo` が `20260704_apps_script_full_workflow_v19_admin_settings_ui` を返し、`getInitialData` が `leadsTotal=5441`, `sendTargets=2016`, `settings=9` を返すことを確認
- v19 Chrome確認で管理タブに `自動運用設定`, `自動送信時間`, `Gmail返信自動チェック`, `メール自動取得`, `バックグラウンド実行`, `重複リスト管理`, `エラー詳細` が表示されることを確認
- v19 Chrome確認で `重複チェック` が全5,441件を読み込み、22グループ/22件の重複候補を表示することを確認
- v19 live配信scriptを抽出し、`node --check /tmp/live-appscript-v19.js` が成功することを確認
- `clasp deploy -d apps-script-full-workflow-v20-list-view-custom-fields` 成功
- 既存Web app URLを `clasp deploy -V 20 -i ...` でv20へ再デプロイ済み
- v20ローカルスモークで `leadListViewSettingsPanel`, `customFieldDefinitionPanel`, `renderListViewSettingsPanel`, `renderCustomFieldDefinitionPanel`, `saveListViewSettings`, `saveCustomFieldDefinitionFromForm` が含まれることを確認
- v20で `custom_field_definitions` / `list_view_settings` シート定義、`saveCustomFieldDefinition` / `updateCustomFieldDefinition` / `saveListViewSettings` のAPI公開を確認
- v20 Chrome確認ではGoogleの再承認画面が表示されたため、承認後に実画面表示を確認する
- `clasp push -f` 成功
- `clasp deploy -d apps-script-full-workflow-v22-app-frame-shortcuts` はversioned deployments上限20件により新規Deployment作成は不可だったが、Apps Script Version 21 `apps-script-full-workflow-v22-app-frame-shortcuts` は作成済み
- 既存Web app URLを `clasp deploy -V 21 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 21へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@21 - apps-script-full-workflow-v22-app-frame-shortcuts-on-existing-url` を指すことを確認
- code v22ローカルスモークで `templateTagMenuPanel`, `renderTemplateVariablePreview`, `appSafetyStrip`, `appRouteProgress`, `toolbar-shortcut` が含まれることを確認
- code v22で `Email.gs` の日本語テンプレート変数 `会社名` と `custom_fields_json` 由来の差し込み対応を確認
- `.gs` 全ファイルのNode構文チェック成功、`node scripts/smoke-test.js` 成功、`git diff --check` 成功
- 未認証 `curl` ではGoogleログインへリダイレクトされるため、ライブ画面の目視確認はログイン済みブラウザで行う
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v23-background-job-widgets"` でVersion 22を作成済み
- 既存Web app URLを `clasp deploy -V 22 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 22へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@22 - apps-script-full-workflow-v23-background-job-widgets-on-existing-url` を指すことを確認
- code v23ローカルスモークで `backgroundToastStack`, `background-center-button`, `renderBackgroundJobWidgets`, `goBackFromBackgroundCenter`, `dismissBackgroundToast` が含まれることを確認
- `.gs` 全ファイルのNode構文チェック成功、`node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v24-menu-parity"` でVersion 23を作成済み
- 既存Web app URLを `clasp deploy -V 23 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 23へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@23 - apps-script-full-workflow-v24-menu-parity-on-existing-url` を指すことを確認
- code v24ローカルスモークで `sendNgHero`, `exclusionsHero`, `backgroundActivityTable`, `errorDetailsTable`, `renderBackgroundActivityScreen`, `renderErrorDetailsScreen` が含まれることを確認
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功

## 運用時に確認する外部依存

- Serper実検索は、実APIキーを保存後に `testSerperApiKey()` と小規模ジョブで確認する。
- 実メール送信は、送信先・テンプレート・Gmail上限を確認してから1件で確認する。
- 実カレンダー登録は、テスト商談日時で1件作成して確認する。
- `clasp run` / `clasp logs` はGCP project / Apps Script Execution API設定に依存するため、現状の運用確認はWeb appとApps Script editorを正とする。
