# Auto Sales List App - Google Sheets / Apps Script

Google SheetsをDBとして使う自動営業リストアプリのApps Script版です。

## 現在の実装範囲

- `setup()` によるSpreadsheet初期化
- 主要シートのヘッダー自動生成
- 既存Next/Supabase版のリード項目・日本語ステータス体系に寄せた `leads` スキーマ
- `settings` の初期値投入
- `genres` / `reasons` の初期マスター投入
- `leads` シートのCRUD
- HTML Service画面
- メールテンプレート管理
- 送信NG / 除外ドメイン管理
- Gmail / MailApp送信、送信履歴保存
- Gmail返信チェック
- Google Calendar商談登録
- CSVインポート
- Serper APIキー保存、接続テスト、小規模検索ジョブ
- 検索結果、検索使用量、ドメインキャッシュ保存
- `CacheService` と `dashboard_cache` によるダッシュボードキャッシュ
- `DriveApp` によるSpreadsheetバックアップ作成
- `doPost` JSON API入口
- Apps Script時間主導トリガー作成
- `LockService` による書き込み系処理の同時実行ガード
- `sync_logs` へのエラーログ保存
- 旧Next/Supabase版のUIに寄せたサイドバー、パネル、テーブル、ステータス表示
- 旧Next/Supabase版の営業リストUIに寄せたクイックビュー、ジャンル、KPI、色分け凡例、フォーム送信リスト
- 旧Next/Supabase版の営業リストに寄せた選択バー、No/操作/屋号/連絡先/ジャンル/ステータス/送信状況テーブル、詳細編集モーダル
- 旧Next/Supabase版の `QuickLeadEditButton` に寄せた中央モーダル、ヘッダーPill、4列サマリーのリード詳細編集UI
- 旧Next/Supabase版のテンプレート、送信NG/除外、フォーム送信、営業リスト収集、管理/運用メニューに寄せたパネル、集計、履歴テーブル
- 旧Next/Supabase版のサイドバー構成に寄せた `バックグラウンド進捗` / `メール送信リスト` / `送信プレビュー` / `送信履歴` / `商談` / `分析` / `同期` / `Gmail連携` / `管理` タブ
- 旧Next/Supabase版の送信プレビュー、検索結果レビュー、Gmail連携テスト、送信ロック、Google認証管理に寄せた詳細パネル
- 旧Next/Supabase版の管理画面に寄せた自動運用設定、重複リスト管理、エラー詳細パネル
- 旧Next/Supabase版の `ListViewSettingsPanel` に寄せた営業リスト表示項目設定
- 旧Next/Supabase版の `CustomFieldDefinitionForm` / `CustomFieldsInputs` に寄せたカスタム項目定義とリード詳細入力
- 旧Next/Supabase版の `TemplateTagMenu` に寄せたテンプレート差し込みメニュー、サンプル文面、差し込み値プレビュー
- 旧Next/Supabase版の `TemplateCreateForm` に寄せたサンプル適用、保存済みテンプレート更新、別テンプレート作成、フォーム営業件名なし許可
- 旧Next/Supabase版の `AppSafetyStrip` / `AppTopShortcutBar` / `AppRouteProgress` に寄せた運用ステータスバー、上部ショートカット、タブ切替進行バー
- 旧Next/Supabase版の `AppFrame` に寄せたサイドバーのリスト/運用グループ順序
- 旧Next/Supabase版の `AppNavLink` / `AppTopShortcutBar` に寄せた線アイコン表示と一次メニューのみのサイドバー構成
- 旧Next/Supabase版の `BackgroundJobWidgets` / `BackgroundJobToasts` / `BackgroundJobCenter` に寄せた共通ジョブ通知と戻るボタン
- 旧Next/Supabase版の `BackgroundJobToasts` に寄せた線画アイコン、進捗通知、追加先表示、通知アクション
- 旧Next/Supabase版の `background-jobs/page.tsx` に寄せたバックグラウンド進捗ヘッダー、収集設定への戻り導線、進捗の見方パネル
- 旧Next/Supabase版の `ProspectingProgressDashboard` に寄せた自動収集の進捗、追加リスト、検索別結果、除外・重複理由パネル
- 旧Next/Supabase版のメニュー構成に寄せた `送信NG` / `除外ドメイン` の独立タブと、`直近実行結果` / `エラー詳細` の支援画面
- 旧Next/Supabase版の `ProspectingCollectionTool` / `AutoProspectingSettingsPanel` / `ProspectingBatchPanel` / `ExclusionSearchPanel` / `CareFacilityFileProspectingPanel` / `SourcePageProspectingPanel` に寄せた営業リスト収集ツール内5モードUI
- 旧Next/Supabase版の `GenreManager` / `ReasonMasterManager` に寄せた管理画面のジャンル管理、選択肢管理UI
- 旧Next/Supabase版の `LeadEditForm` / `MeetingScheduleForm` に寄せたリード詳細のステータス、送信NG理由、商談/Calendar登録UI
- 旧Next/Supabase版の `QuickLeadEditButton` に寄せたリード詳細内の送信履歴カード、フォーム送信履歴カード
- 旧Next/Supabase版の `QuickLeadEditButton` に寄せたリード詳細下部の除外ドメイン登録、削除確認UI
- 旧Next/Supabase版の `DuplicateResolutionDialog` に寄せたリード詳細内の重複候補確認、残す営業先選択UI
- 旧Next/Supabase版の `FormOutreachBoard` に寄せたフォーム送信リストの送信済みチェック、送信済み解除、フォーム送信イベント保存
- 旧Next/Supabase版の `FormOutreachBoard` に寄せた作業中バー、屋号コピー、フォームURLミニリンク、本文コピー、送信済み、次へ操作
- 旧Next/Supabase版の `LoginForm` に寄せた初回Google承認ゲート
- 旧Next/Supabase版の `SerperApiKeyManager` / `SerperSetupGuide` に寄せたSerper APIキー管理、検索テスト、マスク済みキー一覧
- 旧Next/Supabase版の `AdminReadinessRunner` / `SchemaStatusPanel` に寄せた本番前確認、DB追加項目チェック
- 旧Next/Supabase版の `TemplateProductionStatus` / `TemplateActions` に寄せたテンプレート本番ON/OFF、テスト送信、削除操作
- 旧Next/Supabase版の `MailSendingControlCard` に寄せたダッシュボードの自動送信ON/OFFカード
- 旧Next/Supabase版の `DashboardSignalCard` / `DashboardActionCard` / `DashboardCompactStat` に寄せたアイコン付きダッシュボードカード
- 旧Next/Supabase版の `StatusPill` / `DataTable` / `table-link-button` / `mini-button` に寄せた共通Pill、テーブル、操作ボタンの見た目
- 旧Next/Supabase版の `ListSearchFilters` / `DataTable` 空状態に寄せた検索フィルタ、クリア導線、スライダーアイコン、空テーブル表示
- 旧Next/Supabase版の `LeadPagination` / `url-mini-link` / `button.primary` に寄せたページング、URL小リンク、一次ボタン色
- 旧Next/Supabase版の `JobResultsReviewTable` に寄せた検索結果レビューの5列カテゴリ、カードグリッド、一括確認、追加読み込み導線

## ファイル

- `appsscript.json`: Apps Script manifest
- `Code.gs`: setupとleads CRUD
- `Repository.gs`: 共通シートCRUD
- `Masters.gs`: テンプレート、NG、除外ドメイン
- `Email.gs`: メール送信と送信対象判定
- `Serper.gs`: Serper検索、キャッシュ、使用量ログ
- `Operations.gs`: 返信チェック、カレンダー、CSV、トリガー
- `WebApp.gs`: HTML Service入口、`doPost`、ダッシュボードAPI
- `Index.html`: アプリ画面
- `scripts/smoke-test.js`: ローカル検証
- `docs/legacy-sales-mail-automation-analysis.md`: 旧アプリ分析とGAS版への反映方針

## 初回セットアップ

1. Apps Scriptプロジェクトにこのリポジトリの `Code.gs` と `appsscript.json` を配置します。
2. すべての `.gs` ファイルと `Index.html` を同じApps Scriptプロジェクトに配置します。
3. Googleスプレッドシートにバインドした場合は、そのシートを開いて `setup()` を実行します。
4. スタンドアロンのApps Scriptとして実行した場合は、`setup()` が新規Spreadsheetを作成して `SPREADSHEET_ID` をScript Propertiesに保存します。

`setup()` の戻り値に `spreadsheetUrl` が含まれます。

画面はWebアプリとしてデプロイするか、スプレッドシートの `Auto Sales > Open app sidebar` から開けます。

## 作成済みApps Script

- Script ID: `1IPcbftgkafJCBKkoIDnSBjw4fnQoOdXR8I0KjpUCLsq4MYp_7olPOk76`
- Apps Script editor: `https://script.google.com/d/1IPcbftgkafJCBKkoIDnSBjw4fnQoOdXR8I0KjpUCLsq4MYp_7olPOk76/edit`
- Web app deployment @85 / code v85: `https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec`
- Spreadsheet DB: `https://docs.google.com/spreadsheets/d/1IuJrWB7RGd2qIFDlhe5lfKaBnmUKN4RcnxdFFTuluZY/edit`

初回はGoogleのOAuth承認が必要です。Web app URLを開くと承認リンクが表示されます。Apps Script editorを開いて `setup()` を手動実行して承認することもできます。承認後はWeb app URLまたはサイドバーから画面を利用できます。

## 初回承認後の確認結果

2026-06-16 01:12 JST時点で、Web appの初回承認後に `Auto Sales List App DB` が作成されていることを確認済みです。

- DB Spreadsheet ID: `1IuJrWB7RGd2qIFDlhe5lfKaBnmUKN4RcnxdFFTuluZY`
- 作成済みタブ: `leads`, `send_histories`, `email_templates`, `ng_masters`, `excluded_domains`, `genres`, `reasons`, `custom_field_definitions`, `list_view_settings`, `search_jobs`, `search_results`, `search_usage_logs`, `domain_cache`, `reply_logs`, `sync_logs`, `jobs`, `settings`, `dashboard_cache`, `raw_import`
- `leads` は45列のヘッダー生成済み
- `settings` はGmail日次送信上限、Serper日次/月次/リード別上限、バッチ実行時間上限を初期投入済み
- v9 Web app URLは認証付きGETでHTML返却を確認済み
- v9 Web app `doPost` 経由の `getInitialData` / `listEmailTemplates` / `listNgMasters` / `listExcludedDomains` / `listSheetRecords` スモークテスト成功済み
- v9 Web app `doPost` 経由の `createLead` / `updateLead` / `listLeads` / `deleteLead` スモークテスト成功済み
- CRUDスモーク用の一時リードは物理削除済みで、`leads` に残存していないことを確認済み
- v7でリード詳細からのメール送信、カレンダー登録、テンプレート/マスター/運用系 `doPost` アクションを利用可能
- v7で起動時の承認事前判定を廃止し、`getInitialData()` 成功時は承認画面を出さないよう修正済み
- v8で起動時の承認事前判定修正、リード詳細アクション、旧Supabase版からの営業リスト移行APIを反映済み
- 旧Supabase版 `sales_leads` 5,441件を `leads` タブへ移行済み
- v9でダッシュボード集計を全リード対象に修正し、リード一覧に総件数表示とページングを追加済み
- v10で旧Next/Supabase版に寄せたサイドバー型UI、業務パネル、ステータス色分け、モバイル用テーブルラベルを反映済み
- v10 Web app `doPost` 経由の `getInitialData` でバージョン `20260704_apps_script_full_workflow_v10_design_alignment` と `leadsTotal=5441` を確認済み
- v10 Web app HTMLにサイドバー、ナビ、セクションヘッダー、ステータス行色分けのUIマーカーが含まれることを確認済み
- v11で旧Next/Supabase版を追加分析し、ダッシュボード、営業リストのクイックビュー/KPI、フォーム送信リスト、Serper検索概要を反映済み
- v11 Web app `doPost` 経由の `getInitialData` でバージョン `20260704_apps_script_full_workflow_v11_legacy_ui_deep_port`、`leadsTotal=5441`、`sendTargets=2016`、`formTargets=1161` を確認済み
- v11 `listLeads({filter:"email"})` が `total=2016`、`listLeads({filter:"form", formStatus:"active"})` が `total=1065` を返すことを確認済み
- v12で営業リスト画面を旧 `LeadsBulkTable` に寄せ、CSV/手動追加ヘッダー、確認待ちガイド、固定バルク操作バー、旧列構成、詳細ドロワーを反映済み
- v12 Web app `doPost` 経由の `getInitialData` でバージョン `20260704_apps_script_full_workflow_v12_leads_ui_fidelity`、`leadsTotal=5441`、`sendTargets=2016`、`formTargets=1161`、`reviewTargets=1136` を確認済み
- v12 Web app HTMLに `leadBulkActionBar`, `leadDetailDialog`, `prospecting-review-guide`, `table-link-button`, `lead-select-cell` が含まれることを確認済み
- v12 Chrome確認で営業リストの列が `No.`, `操作`, `屋号`, `連絡先`, `ジャンル名`, `ステータス`, `送信状況` になり、詳細ドロワーが開くことを確認済み
- v13でテンプレート、送信NG/除外、フォーム送信、営業リスト収集ツール、管理/運用タブを旧Next/Supabase版に寄せた画面構成へ反映済み
- v13 Web app HTMLに `templateSafetyPanel`, `mastersHero`, `formOutreachSummary`, `collectionCommandCenter`, `searchActivityPanel`, `opsReadinessPanel`, `jobTable`, `syncLogTable` が含まれることを確認済み
- v13 Chrome確認でテンプレート/NG・除外/フォーム送信/営業リスト収集ツール/管理・運用の各タブが旧アプリ風の業務パネルとテーブルを表示することを確認済み
- v14で旧Next/Supabase版のサイドバー導線へ寄せ、`backgroundJobs`, `emailLeads`, `sending`, `histories`, `deals`, `analytics`, `sync`, `gmail`, `admin` タブを追加済み
- v14 Web app `doPost` 経由の `getInitialData` でバージョン `20260704_apps_script_full_workflow_v14_nav_parity_ui`、`leadsTotal=5441`、`emailTotal=2016`、`dealTotal=4` を確認済み
- v14 Chrome確認で追加9タブをクリックし、旧アプリ風の見出し、集計、テーブル、運用パネルが表示されることを確認済み
- v18で旧Next/Supabase版の `EmailPreviewPanel`, `TemplateTestRecipientManager`, `JobResultsReviewTable`, `GmailConnectionCheck`, `MailSendLockPanel`, `GoogleCredentialsManager` に寄せた詳細UIを追加済み
- v18 Web app `doPost` 経由の `getAppInfo` / `getInitialData` でバージョン `20260704_apps_script_full_workflow_v18_preview_review_gmail_ui`、`leadsTotal=5441`、`sendTargets=2016`、`formTargets=1161` を確認済み
- v18 Chrome確認で `送信プレビュー`, `営業リスト収集ツール`, `Gmail連携`, `管理` タブをクリックし、差し込みプレビュー、検索結果カテゴリ、Gmail連携テスト、送信ロック、Google/Gmail APIキー管理の表示を確認済み
- v19で旧Next/Supabase版の `SendWindowSettingsForm`, `GmailReplyCheckSettingsForm`, `EmailDiscoverySettingsForm`, `BackgroundWorkerSettingsForm`, `DuplicateLeadManager`, `errors/page.tsx` に寄せた管理UIを追加済み
- v19 Web app `doPost` 経由の `getAppInfo` / `getInitialData` でバージョン `20260704_apps_script_full_workflow_v19_admin_settings_ui`、`leadsTotal=5441`、`settings=9` を確認済み
- v19 Chrome確認で管理タブの `自動運用設定`, `重複リスト管理`, `エラー詳細` を確認し、重複チェックが全5,441件から22グループ/22件を検出することを確認済み
- v20で旧Next/Supabase版の `ListViewSettingsPanel`, `CustomFieldDefinitionForm`, `CustomFieldsInputs`, `/api/display-settings`, `/api/custom-fields` に寄せた表示項目設定とカスタム項目定義を追加済み
- v20は `clasp deploy -V 20` で既存Web app URLへ反映済み。ローカルスモークで `leadListViewSettingsPanel`, `customFieldDefinitionPanel`, `renderListViewSettingsPanel`, `renderCustomFieldDefinitionPanel` を確認済み
- Apps Script Version 21 / code v22で旧Next/Supabase版の `TemplateTagMenu`, `AppSafetyStrip`, `AppTopShortcutBar`, `AppRouteProgress` に寄せたテンプレート差し込みメニュー、運用ステータスバー、上部ショートカット、タブ切替進行バーを追加済み
- Version 21は `clasp deploy -V 21 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `templateTagMenuPanel`, `appSafetyStrip`, `appRouteProgress`, `toolbar-shortcut` を確認済み
- Apps Script Version 22 / code v23で旧Next/Supabase版の `BackgroundJobWidgets`, `BackgroundJobToasts`, `BackgroundJobCenter` に寄せた右下ジョブ通知、進捗バー、全画面共通の戻るボタンを追加済み
- Version 22は `clasp deploy -V 22 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `backgroundToastStack`, `background-center-button`, `renderBackgroundJobWidgets` を確認済み
- Apps Script Version 23 / code v24で旧Next/Supabase版の `ng-master`, `exclusions`, `background-jobs/activity`, `errors` のページ分割に寄せ、`送信NG`, `除外ドメイン`, `直近実行結果`, `エラー詳細` を独立タブ化済み
- Version 23は `clasp deploy -V 23 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `sendNgHero`, `exclusionsHero`, `backgroundActivityTable`, `errorDetailsTable` を確認済み
- Apps Script Version 24 / code v25で旧Next/Supabase版の `ProspectingCollectionTool` 系UIに寄せ、営業リスト収集ツール内に `0 自動運用`, `1 ジャンル×エリア`, `2 キーワード検索`, `3 ファイル収集`, `4 まとめサイトURL` の5モードパネルを追加済み
- Version 24は `clasp deploy -V 24 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `collection-tab-panel`, `autoCollectionEnabled`, `submitCollectionAreaSearch`, `importCollectionCsv`, `saveSourcePageCollectionSettings` を確認済み
- Apps Script Version 25 / code v26で旧Next/Supabase版の `GenreManager` / `ReasonMasterManager` に寄せ、管理画面にジャンル管理と選択肢管理を追加済み
- Version 25は `clasp deploy -V 25 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `genreManagerPanel`, `reasonMasterManagerPanel`, `saveGenreFromForm`, `saveReasonFromForm` を確認済み
- Apps Script code v27で旧Next/Supabase版の `LeadEditForm` / `MeetingScheduleForm` に寄せ、リード詳細ドロワーへ自動ステータス説明、送信NG理由/メモ、フォーム対応、辞退理由、商談ステータス、Calendar登録/MeetリンクUIを追加済み
- Version 26は `clasp deploy -V 26 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `leadStatusControlPanel`, `renderLeadStatusControlPanel`, `meeting-form`, `leadMeetLink` を確認済み
- Apps Script code v28で旧Next/Supabase版の `QuickLeadEditButton` に寄せ、リード詳細ドロワーへ送信履歴カード、本文詳細、リード別送信履歴取得APIを追加済み
- Version 27は `clasp deploy -V 27 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `leadHistoryPanel`, `quick-history-section`, `listLeadSendHistories` を確認済み
- Apps Script code v29で旧Next/Supabase版の `QuickLeadEditButton` に寄せ、リード詳細ドロワーへフォーム送信履歴、最新送信/状態サマリー、本文コピー導線を追加済み
- Version 28は `clasp deploy -V 28 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `leadFormHistoryPanel`, `quick-form-history-summary`, `copyLeadFormHistoryBody` を確認済み
- Apps Script code v30で旧Next/Supabase版の `QuickLeadEditButton` に寄せ、リード詳細ドロワー下部へ除外ドメイン登録、削除確認、営業対象から外す操作UIを追加済み
- Version 29は `clasp deploy -V 29 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `leadDangerPanel`, `renderLeadDangerPanel`, `excludeSelectedLeadDomainAndArchive` を確認済み
- Apps Script code v31で旧Next/Supabase版の `DuplicateResolutionDialog` に寄せ、リード詳細ドロワーへ重複候補確認、既存候補を残す/編集中の営業先を残す操作UIを追加済み
- Apps Script code v32で旧Next/Supabase版の `FormOutreachBoard` に寄せ、フォーム送信リストへ送信済みチェック、送信済み解除、フォーム送信イベント保存を追加済み
- Apps Script code v33で旧Next/Supabase版の `LoginForm` に寄せ、初回承認/認証エラー時のGoogle承認ゲートを追加済み
- Apps Script code v34で旧Next/Supabase版の `SerperApiKeyManager` / `SerperSetupGuide` に寄せ、Serper APIキー管理、検索APIテスト、マスク済みキー一覧を追加済み
- Apps Script code v35で旧Next/Supabase版の `BackgroundJobsOverview` に寄せ、バックグラウンド進捗KPI、表示フィルタ、カテゴリ別ジョブスロット、直近3日成果カードを追加済み
- Apps Script code v36で旧Next/Supabase版の `SyncImportPanel` に寄せ、CSV/JSON同期、ファイル読込、文字コード推定、列マッピング、プレビューKPI、要確認行、先頭10件プレビューを追加済み
- Apps Script code v37で旧Next/Supabase版の `JobResultsReviewTable` に寄せ、検索結果カードの選択、一括確認、選択除外、メール/フォーム補正、営業リスト追加、レビュー状態保存を追加済み
- Apps Script code v39で旧Next/Supabase版の `GmailReplyCheckPanel` / `CalendarAutoCreateSettingsForm` に寄せ、返信チェック結果サマリー、誤判定候補確認/復元、Calendar自動登録設定を追加済み
- Apps Script code v40で旧Next/Supabase版の `AdminReadinessRunner` / `SchemaStatusPanel` / `TemplateProductionStatus` / `TemplateActions` に寄せ、管理画面の安全な本番前確認、DB追加項目チェック、テンプレート本番ON/OFF、行内テスト送信/削除操作を追加済み
- Apps Script code v41で旧Next/Supabase版の `AppFrame` に寄せ、サイドバーのグループ順序を `リスト` / `運用` と旧ナビ順へ合わせ、追加内部ページをセカンダリ表示に調整済み
- Apps Script code v43で旧Next/Supabase版の `EmailPreviewPanel` に寄せ、対象リスト自動送信カード、対象確認ダイアログ、送信候補プレビュー、Gmail/自動送信停止/送信時間の可否表示を追加済み
- Apps Script code v44で旧Next/Supabase版のGmail連携画面に寄せ、Gmailテスト送信履歴、成功/失敗サマリー、失敗理由詳細、テンプレート画面への導線を追加済み
- Apps Script code v45で送信プレビューの差し込み値確認を強化し、空欄タグだけを警告カード/一覧で強調するUIを追加済み
- Apps Script code v46で送信プレビュー本文の差分確認を追加し、テンプレート原文/送信時本文/空欄タグの前後文脈を並べて確認できるようにした
- Apps Script code v47で送信プレビュー件名の差分確認を追加し、テンプレート件名/送信時件名/件名内の空欄タグ文脈を並べて確認できるようにした
- Apps Script code v48で旧Next/Supabase版の送信履歴ページに寄せ、履歴区分フィルタ、検索、絞り込み中Pill、本文/Gmail詳細、絞り込みCSV出力を追加済み
- Apps Script code v49で旧Next/Supabase版の分析ページに寄せ、リスト追加経路、日別/月間分析、見るべき指標、メール文別返信率、テンプレート件名/本文プレビュー付き成果表を追加済み
- Apps Script code v50で分析ページの送信成功率と追加経路フォールバック、サマリー色トーンを調整済み
- Version 50は `clasp deploy -V 50 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `analyticsTemplateTable`, `buildClientAnalyticsData`, `メール文別返信率` を確認済み
- Apps Script code v51で旧Next/Supabase版の `AppFrame` / `AppNavLink` / `AppTopShortcutBar` に寄せ、サイドバーを旧アプリと同じ一次メニューだけに戻し、ナビ/ショートカットを線アイコン表示へ変更済み
- Version 51は `clasp deploy -V 51 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `NAV_ICON_SVGS`, `hydrateLegacyNavigationIcons`, 旧AppFrameの一次メニュー順序を確認済み
- Apps Script code v52で旧Next/Supabase版の `DashboardSignalCard` / `DashboardActionCard` / `DashboardCompactStat` に寄せ、重要指標、次の作業、今月の動き、検索概要カードをアイコン付きカード構造へ変更済み
- Version 52は `clasp deploy -V 52 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `DASHBOARD_ICON_KEYS`, `dashboard-signal-icon`, `dashboardIcon(iconKey)` を確認済み
- Apps Script code v53で旧Next/Supabase版の `StatusPill`, `DataTable`, `.button`, `.mini-button`, `.table-link-button` に寄せ、Pill色/枠線、テーブル密度/フォーカス行、行内操作ボタンを全メニュー共通で再現済み
- Version 53は `clasp deploy -V 53 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `status-pill`, `legacy-component-parity`, `overscroll-behavior-inline: contain`, `table-link-button.primary-action` を確認済み
- Apps Script code v54で旧Next/Supabase版の `ListSearchFilters` / `DataTable` 空状態に寄せ、営業リスト、フォーム送信、送信履歴の検索パネルをスライダーアイコン付きの適用/クリア導線へ変更し、空テーブル表示を点線枠のメッセージへ変更済み
- Version 54は `clasp deploy -V 54 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `LEGACY_UI_ICON_SVGS`, `hydrateLegacyUtilityIcons`, `list-filter-panel-icon`, `data-table-empty-cell` を確認済み
- Apps Script code v55で旧Next/Supabase版の `LeadPagination` に寄せ、営業リストのページングを先頭/前/ページ番号/次/最後の `mini-button` 構成に変更済み。`url-mini-link` と一次ボタン色も旧アプリ寄せへ調整済み
- Version 55は `clasp deploy -V 55 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `lead-pagination-pages`, `chevronFirst`, `url-mini-link`, `button.primary` を確認済み
- Apps Script code v56で旧Next/Supabase版の `FormOutreachBoard` に寄せ、フォーム送信リストの作業中バー、屋号コピー、フォームURLミニリンク、本文コピー、送信済み、次へ操作を旧アイコン付きボタン構成へ変更済み
- Version 56は `clasp deploy -V 56 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `facility-copy-button`, `copyFormLeadFacilityName`, `formUrlMiniLink`, `selectNextFormLead` を確認済み
- Apps Script code v57で旧Next/Supabase版の `QuickLeadEditButton` に寄せ、営業リストの詳細編集を右ドロワーから中央 `quick-lead-dialog` モーダルへ変更し、ヘッダーPill、閉じるアイコン、4列サマリーを反映済み
- Version 57は `clasp deploy -V 57 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `quick-lead-dialog`, `quick-dialog-header-actions`, `leadDialogStatusPills` を確認済み
- Apps Script code v58で旧Next/Supabase版の `TemplateCreateForm` に寄せ、テンプレート作成フォームのサンプル適用ボタン、保存済みテンプレート更新、別テンプレート作成、フォーム営業用の件名なし保存を反映済み
- Version 58は `clasp deploy -V 58 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `template-create-panel`, `templateSubmitButton`, `startNewTemplate`, `updateTemplateFormState` を確認済み
- Apps Script code v59で旧Next/Supabase版の `AppSafetyStrip` に寄せ、全メニュー共通の上部安全ステータス帯をShield/Clock/Mail/Plugの線画アイコン付きチップ構成へ変更済み
- Version 59は `clasp deploy -V 59 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `shieldCheck`, `clock3`, `mailCheck`, `plug` を確認済み
- Apps Script code v60で旧Next/Supabase版の `AppTopShortcutBar` に寄せ、上部ショートカットをリスト/進捗/収集/フォーム/送信/メールの6項目だけに戻し、更新/setupはサイドバー下部へ集約済み
- Version 60は `clasp deploy -V 60 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `toolbar-shortcut`, `data-shortcut-tab="emailLeads"`, `utility-action` 非表示を確認済み
- Apps Script code v61で旧Next/Supabase版の `EmailPreviewPanel` に寄せ、送信プレビューの「差し込み後を確認」PillにEyeアイコン、1件送信/自動送信ボタンにSendアイコンを追加済み
- Version 61は `clasp deploy -V 61 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `legacyUiIcon('eye')`, `legacyUiIcon('send')` を確認済み
- Apps Script code v62で旧Next/Supabase版の `HistoriesPage` に寄せ、送信履歴ヘッダーのCSV出力/送信プレビュー導線をDownload/Sendアイコン付きボタンへ変更済み
- Version 62は `clasp deploy -V 62 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `legacyUiIcon('download')`, `legacyUiIcon('send')` を確認済み
- Apps Script code v63で旧Next/Supabase版の `AnalyticsPage` に寄せ、分析サマリー、営業ファネル、リスク帯をListPlus/Send/Reply/Calendar/Check/Shield/Trend/Mailアイコン付きカードへ変更済み
- Version 63は `clasp deploy -V 63 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `legacyUiIcon('listPlus')`, `legacyUiIcon('shieldAlert')`, `legacyUiIcon('trendingDown')` を確認済み
- Apps Script code v64で旧Next/Supabase版の `AdminPage` に寄せ、管理/運用のステータスカード、本番チェック、Google/Gmail管理、送信ロック、DB追加項目チェックをDatabase/SearchCheck/ServerCog/Rocketアイコン付き行へ変更済み
- Version 64は `clasp deploy -V 64 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `settings-status-item with-icon`, `legacyUiIcon('rocket')`, `serverCog` を確認済み
- Apps Script code v65で旧Next/Supabase版の `SerperSetupGuide` / `SerperApiKeyManager` に寄せ、Serper未設定ガイド、残量確認/検索APIテスト、収集ツール実行プレビューをKey/Check/Refresh/Search/Serverアイコン付き表示へ変更済み
- Version 65は `clasp deploy -V 65 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `legacyUiIcon('keyRound')`, `legacyUiIcon('refreshCw')`, `legacyUiIcon('serverCog')` を確認済み
- Apps Script code v66で旧Next/Supabase版の `EmailDiscoverySettingsForm` に寄せ、自動運用設定カードのアイコン付きヘッダーと、メール自動取得のMailSearch/Clock/TimerReset/Historyステータス行を追加済み
- Apps Script code v67で旧Next/Supabase版の `GmailConnectionCheck` / `GoogleCredentialsManager` / `MailSendLockPanel` に寄せ、Gmail連携テスト、Google認証サマリー、送信ロックのアイコン付き状態行と認可導線を追加済み
- Apps Script code v68で旧Next/Supabase版の `GmailReplyCheckPanel` / `GmailReplyCheckSettingsForm` / `CalendarAutoCreateSettingsForm` に寄せ、返信チェック注意帯、返信チェック/誤判定修正ボタン、エラー行、Calendar保存ボタンをアイコン付きUIへ変更済み
- Apps Script code v69で旧Next/Supabase版の `TemplateActions` に寄せ、テンプレート一覧の編集・テスト送信を中央ダイアログ化し、送信先カード、差し込み元、送信内容プレビュー、保存/テスト送信アクションを反映済み
- Version 69は `clasp deploy -V 69 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `templateActionDialogHost`, `template-edit-dialog`, `template-test-dialog`, `template-test-recipient`, `runTemplateTestSend` を確認済み
- Apps Script code v70で旧Next/Supabase版の `JobResultsReviewTable` に寄せ、検索結果レビューの5列カテゴリフィルタ、360pxカードグリッド、一括確認、選択除外/確認済みアイコン、追加読み込みを反映済み
- Version 70は `clasp deploy -V 70 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `jobResultRenderLimit`, `reviewAllEmailJobResults`, `job-results-load-more`, `squarePen`, `xCircle` を確認済み
- Apps Script code v71で旧Next/Supabase版の `BackgroundJobToasts` に寄せ、CheckCircle/XCircle/Loader線画アイコン、スピナー、追加先表示、結果/進捗を見る操作を反映済み
- Version 71は `clasp deploy -V 71 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `loaderCircle`, `background-toast-spin`, `background-toast-found-list`, `displayBackgroundJobLabel` を確認済み
- Apps Script code v72で旧Next/Supabase版の `background-jobs/page.tsx` に寄せ、進捗ページのArrowLeft/ListChecksアイコン、収集設定への戻り導線、進捗の見方パネル本文を反映済み
- Version 72は `clasp deploy -V 72 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `background-guide-panel`, `listChecks`, `arrowLeft` を確認済み
- Apps Script Version 73 / code v73で旧Next/Supabase版の `ProspectingProgressDashboard` に寄せ、営業リスト収集ツールに自動収集の進捗、追加リスト、検索別結果、除外・重複理由の詳細パネルを追加済み
- Version 73は `clasp deploy -V 73 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `prospectingProgressDashboard`, `renderProspectingProgressDashboard`, `prospecting-progress-stat`, `prospecting-details-section` を確認済み
- Apps Script Version 74 / code v74で旧Next/Supabase版の `ExcludedDomainManager` に寄せ、除外ドメインタブにサマリーPill、追加/編集フォーム、検索、状態フィルタ、編集/停止/有効化操作を追加済み
- Version 74は `clasp deploy -V 74 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `excluded-domain-manager`, `exclusion-workbench`, `excludedDomainSearch`, `renderExcludedDomainManager` を確認済み
- Apps Script Version 75 / code v75でApps Script HTML Serviceが `https://` 文字列をuserCodeAppPanel内で分断し、メインスクリプトが `SyntaxError` で停止する問題を修正済み
- Version 75は `clasp deploy -V 75 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `HTTPS_PROTOCOL_PREFIX` と `Index.html` 内の生 `https://` 不在を確認済み。Chrome実機で `dashboard -> leads -> exclusions` のクリック遷移も確認済み
- Apps Script Version 76 / code v76で営業リストのWEBリンクPillからドメイン表示を外し、表示文言を `WEBサイト` だけに変更済み
- Version 76は `clasp deploy -V 76 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `WEBサイト` 表示とcompact domain非表示を確認済み
- Apps Script Version 77 / code v77で営業リストの初期ロードを確認待ち100件に限定し、全件ビューは手動ボタンから進捗バー付きで読み込むように変更済み
- Version 77は `clasp deploy -V 77 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `leadLoadPanel`, `loadInitialReviewLeads`, `leadLoadProgressBar` を確認済み
- Apps Script Version 78 / code v78で全件読み込み進捗中の軽量ロードパネルが横幅不足で潰れないよう、進捗行を折り返すレイアウトへ調整済み
- Apps Script Version 79 / code v79で通常画面に戻るボタンが重ならないよう支援画面だけの表示に戻し、更新完了メッセージを自動消去して旧アプリのフレームに近づけた
- Apps Script Version 80 / code v80で初期ロード中の空カード/空フォーム作業パネルを非表示にし、主要ダッシュボード描画後はグローバルの読み込み表示を消して旧アプリに近い初期表示へ戻した
- Apps Script Version 81 / code v81で送信履歴ヘッダーの生テンプレート文字列表示をアイコン表示へ戻し、同期画面のカードが左に細く潰れないよう旧アプリ寄りの専用グリッドへ調整済み
- Apps Script Version 82 / code v82で後段の汎用 `.grid` に同期専用グリッドが上書きされないようセレクタを強め、同期インポートパネルの横幅崩れを実画面で復元
- Apps Script Version 83 / code v83で管理/運用の本番前チェック行を旧アプリ同様にラベルと詳細の縦積みに戻し、`Google Sheets5,441件` のような詰まり表示を解消
- Apps Script Version 84 / code v84でメール送信リストのテーブルを旧アプリの `table-email-leads` に寄せ、長い屋号/メールで右端の履歴操作が切れないよう列幅と省略表示を復元
- Apps Script Version 91 / code v91で初回起動遅延の原因だった `getInitialData()` の全件ダッシュボード集計、毎回の `setup()`、マスタ/設定/スキーマ/Serper集計、起動時の他メニュー一括取得を分離。初回は軽量ダッシュボード + 確認待ちリストのみで起動し、各メニューは開いた時に遅延ロード。初回の確認待ち取得はquiet通信にして、表示後のナビ操作をブロックしないようにしました
- Apps Script Version 94 / code v94でGmail API連携の不足scopeを修正。`MailApp` 用 `https://www.googleapis.com/auth/script.send_mail` と `GmailApp` 用 `https://mail.google.com/` を追加し、Gmail連携画面から承認状態、Google認可URL、メールを送らない連携テストを確認可能にしました。認可リンクのアイコン巨大化と、追加承認待ちでパネルが空になる表示も実画面で修正済み
- Apps Script Version 95 / code v95でGmail承認後も `NOT_REQUIRED` が `REQUIRED` の部分一致として扱われ、Gmail連携画面だけ要承認表示が残る判定バグを修正。承認状態は完全一致で `REQUIRED` の時だけ要承認にします
- Apps Script Version 96 / code v96で管理画面の初期表示をコンパクト化。主要ステータスと本番前確認、自動運用サマリーだけを上部に残し、Google/DB連携、マスター管理、ログ/メンテナンスはアコーディオンへ整理しました
- Apps Script Version 97 / code v97で管理画面カードの余白を追加調整。`#admin` 配下のカードpadding、見出し、ステータス項目、本番前確認、自動運用サマリーの間隔を広げ、古いgrid表示が残った場合も縦積みで崩れにくくしました
- Apps Script Version 98 / code v98でGmail連携ページの初期表示をコンパクト化。Gmail/Calendar/送信枠/トリガー/返信自動チェックのサマリーだけを上部に残し、連携診断、テスト送信履歴、返信チェック、送信ロック/利用手順はアコーディオンへ整理。カード余白と見出し/本文の間隔も調整しました
- Apps Script Version 99 / code v99でアプリ全体のカード余白トークンを追加。`.panel.stack`、`.panel-body`、テーブル入りカード、親カード内の子カードに共通のpadding/gap/折り返し補正を入れ、カードとテキスト、親カードと子カードの詰まりを全体で起きにくくしました
- Apps Script Version 100 / code v100で全体カード余白調整の副作用防止を追加。共通`.panel-body`余白を維持しつつ、バックグラウンド進捗の横並びガイドなど個別レイアウトが崩れないよう明示的な上書きを追加しました
- Apps Script Version 101 / code v101で空のヒーローパネルが余白だけのカードとして残る問題を修正。送信NGなど、データ読み込み前に空の `.exclusion-hero-panel` は非表示にしてカードとテキストの流れを詰めました
- Apps Script Version 102 / code v102で同期プレビュー、テンプレートタグ、収集ステータス、フォーム/検索系の子カードに長文折り返しガードを追加。親カード内で長いURLや変数名が入ってもカード幅を押し広げないようにしました
- Apps Script Version 103 / code v103で空の動的パネルと統計グリッドを非表示化。バックグラウンド進捗などでデータ描画前に余白だけのカードが一瞬残る初期表示崩れを抑制しました
- Apps Script Version 104 / code v104でテンプレート作成フォームの空タグパネルなど、動的に後から埋まる子カード/ステータス帯の空表示を追加で非表示化。本文下に余白だけの細いカードが残る崩れを修正しました
- Apps Script Version 105 / code v105で空のテーブルラッパーと送信プレビューの送信予定/送信制限カードを追加ガード。読込前に罫線だけの細い枠やタイトルだけのカードが残る表示を抑制しました
- Apps Script Version 106 / code v106でフォーム送信リストの空対象カードに読み込み/空状態を明示し、ダッシュボードの左右カードの無理な高さ揃えと営業リスト表示項目アコーディオンの見え方を調整しました
- Apps Script Version 87 / code v87で営業リスト収集ツール上部の収集状況をコンパクト化し、空の直近検索テーブルを折りたたみ/空状態にして収集メニューがすぐ見える密度へ調整。空状態アイコンの巨大化も抑制済み
- Apps Script Version 85 / code v85で営業リスト収集ツールを旧アプリの `ProspectingCollectionTool` に寄せ、収集状況→収集メニューの順序、アイコン付き0〜4操作カード、状態バー、除外ドメイン導線を復元
- Version 68は `clasp deploy -V 68 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `messageCircleReply`, `refreshCw`, `rotateCcw`, 返信チェック注意帯、誤判定候補カード、Calendar保存アイコンを確認済み
- Version 67は `clasp deploy -V 67 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `keyRound`, `refreshCw`, `gmail-connection-status-grid`, `triangleAlert`, `lock` / `unlock` を確認済み
- Version 66は `clasp deploy -V 66 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `automation-card-title`, `automation-status-grid`, `mailSearch`, `timerReset`, `history` を確認済み
- Version 49は `clasp deploy -V 49 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `analyticsTemplateTable`, `buildClientAnalyticsData`, `メール文別返信率` を確認済み
- Version 48は `clasp deploy -V 48 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `historyFilterPanel`, `filteredSendHistories`, `本文/Gmail` を確認済み
- Version 47は `clasp deploy -V 47 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `template-subject-diff-panel`, `件名差分`, `テンプレート件名` を確認済み
- Version 46は `clasp deploy -V 46 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `template-body-diff-panel`, `template-empty-token`, `本文差分` を確認済み
- Version 45は `clasp deploy -V 45 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `template-variable-empty-list`, `空欄タグ`, `空欄なし` を確認済み
- Version 44は `clasp deploy -V 44 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `gmailTestSendHistoryPanel`, `renderGmailTestSendHistoryPanel`, `Gmailテスト送信履歴` を確認済み
- Version 43は `clasp deploy -V 43 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `dialog-backdrop`, `send-target-preview`, `openEmailBatchConfirm`, `runConfirmedEmailBatch` を確認済み
- Version 41は `clasp deploy -V 41 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで旧AppFrameのナビ順序を確認済み
- Version 40は `clasp deploy -V 40 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `adminReadinessRunnerPanel`, `schemaStatusPanel`, `renderTemplateActionCell`, `setEmailTemplateProduction`, `getSchemaStatus` を確認済み
- Version 30は `clasp deploy -V 30 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` で既存Web app URLへ反映済み。ローカルスモークで `leadDuplicatePanel`, `renderLeadDuplicatePanel`, `listLeadDuplicateCandidates` を確認済み

`clasp run` と `clasp logs` は、Apps Script Execution API / GCP project設定の影響でCLI側だけ失敗する場合があります。Web appとApps Script editorの実行経路は別なので、運用確認はWeb app URLまたはApps Script editorから行います。

## 営業リスト移行

2026-07-04に `/Users/muramatsuyuuya/Documents/自動営業システム` のSupabase `sales_leads` から新アプリの `leads` タブへ移行済みです。

- 移行件数: 5,441件
- 移行先: `Auto Sales List App DB` の `leads`
- ID: 旧 `sales_leads.id` を保持
- ジャンル: `genres.name` を `genre` に展開
- 理由: `reasons.name` を `send_ng_reason` / `no_action_reason` / `lost_reason` に展開
- `send_count`: 旧 `send_histories` の件数から算出
- `custom_fields` / `source_payload`: JSON文字列として保持
- 移行ログ: `sync_logs` に `Lead migration finished. migrated=5441, expected=5441`

再実行または置き換えが必要な場合:

```bash
node scripts/migrate-sales-leads.js --dry-run
node scripts/migrate-sales-leads.js --replace
```

## leads CRUD

Apps ScriptエディタまたはHTML Serviceから呼び出せる関数:

```javascript
const lead = createLead({
  company_name: '株式会社Example',
  website_url: 'https://example.com',
  form_url: 'https://example.com/contact',
  email: 'sales@example.com',
  address: '東京都',
  genre: '美容',
  source: 'manual',
  notes: 'Initial test lead',
});

const page = listLeads({
  search: 'example',
  status: '未対応',
  limit: 50,
  offset: 0,
});

const updated = updateLead(lead.id, {
  status: '対応中',
});

const archived = deleteLead(lead.id);
```

`deleteLead(id)` はデフォルトでソフト削除です。物理削除が必要な場合のみ `deleteLead(id, { hardDelete: true })` を使います。

## 重要な実装方針

- 外部APIには行番号を渡さず、更新・削除対象は必ず `id` で検索します。
- 書き込み系の `createLead` / `updateLead` / `deleteLead` / `setup` は `LockService` で直列化します。
- `company_name` は新規作成時の必須項目です。
- `normalized_company_name`、`email_domain`、`website_domain` は保存前に自動計算します。
- `status` は既存アプリの日本語ステータスを使います。
- `status` 変更時は既存アプリに合わせて `reply_checked`、`deal_status`、`form_status`、`send_ng` などを連動更新します。
- `email`、`source + source_id`、`normalized_company_name + website_domain` の重複は初期状態で抑止します。必要な場合のみ `allow_duplicate: true` を指定します。
- APIキーはシートやHTMLに直接出さず、`saveSerperApiKey(apiKey)` でScript Propertiesに保存します。
- Gmail送信とSerper検索は `settings` の日次/月次上限を必ず確認します。
- Serper検索は日次/月次/1リード上限を確認します。
- 大量処理は `search_jobs` に進捗を保存し、`advanceQueuedJobs()` で分割実行します。
- バッチ処理は `batch_runtime_budget_ms` を見て、Apps Scriptの6分制限に近づく前に中断・再開します。
- 運用タブの `バックアップ作成` でSpreadsheet DBのDriveコピーを作成できます。

## 検証

ローカルで構文と純粋ロジックを確認:

```bash
for f in *.gs; do node --check --input-type=commonjs - < "$f" || exit 1; done
node scripts/smoke-test.js
```

Google側で確認する関数:

1. `setup()`
2. `getInitialData()`
3. `createLead({...})`
4. `listLeads({ limit: 10 })`
5. `saveEmailTemplate({...})`
6. `saveSerperApiKey("...")`
7. `testSerperApiKey()`
8. `runSmallSearchJob({ job_type: "lead_official_site", leadId: "...", maxItems: 1 })`

Web appの `doPost` は次の形のJSONを受け付けます。

```json
{
  "action": "listLeads",
  "data": { "limit": 10 }
}
```

## 既存アプリから参考にした箇所

参照元: `/Users/muramatsuyuuya/Documents/自動営業システム`

- `supabase/schema.sql`: `sales_leads`、`send_histories`、`email_templates`、NG/理由マスターの項目
- `lib/lead-status.ts`: 日本語ステータス、送信除外ステータス、ステータス変更時の副作用
- `lib/types.ts`: リード入力の別名、送信履歴、テンプレートの型
- `lib/domain.ts`: ドメイン正規化の考え方
- `lib/company-normalize.ts`: 会社名正規化の考え方
- `app/globals.css` / `components/AppFrame.tsx` / `app/leads/page.tsx`: サイドバー、パネル、テーブル、ステータスPill、営業リスト画面のUIトーン
- `app/page.tsx` / `components/LeadQuickViews.tsx` / `components/ListSearchFilters.tsx` / `components/LeadStatusLegend.tsx` / `app/forms/page.tsx` / `app/prospecting/page.tsx` / `app/templates/page.tsx` / `app/ng-master/page.tsx` / `app/exclusions/page.tsx` / `app/background-jobs/page.tsx` / `app/admin/page.tsx`: ダッシュボード、クイックビュー、フォーム送信、Serper収集、テンプレート、NG/除外、運用画面の情報設計
- `components/EmailPreviewPanel.tsx` / `components/TemplateTestRecipientManager.tsx` / `components/JobResultsReviewTable.tsx` / `components/GmailConnectionCheck.tsx` / `components/GoogleCredentialsManager.tsx` / `components/MailSendLockPanel.tsx`: 送信前確認、テスト送信先、検索結果レビュー、Gmail/Google認証状態、送信ロックのUI構成
- `components/ExcludedDomainManager.tsx`: 除外ドメイン一覧、サマリーPill、追加/編集フォーム、検索、状態フィルタ、操作列のUI構成
- `components/SendWindowSettingsForm.tsx` / `components/BackgroundWorkerSettingsForm.tsx` / `components/DuplicateLeadManager.tsx` / `app/errors/page.tsx`: 自動運用設定、重複リスト管理、エラー詳細のUI構成
- `components/TemplateTagMenu.tsx` / `components/AppSafetyStrip.tsx` / `components/AppTopShortcutBar.tsx` / `components/AppRouteProgress.tsx`: 差し込みタグ操作、運用ステータス、上部ショートカット、画面遷移フィードバックのUI構成
- `components/BackgroundJobWidgets.tsx` / `components/BackgroundJobToasts.tsx` / `components/BackgroundJobCenter.tsx`: 共通ジョブ通知、進捗バー、戻るボタンのUI構成

持ち込まないもの:

- Supabase / Vercel / Next.js / GitHub Actions 依存
- RLS、PostgreSQLインデックス、生成列などSheetsに不要な実装
- Vercel用の短いバックグラウンド実行予算
