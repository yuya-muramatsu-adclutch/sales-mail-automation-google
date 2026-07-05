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
- 旧Next/Supabase版の営業リストに寄せた選択バー、No/操作/屋号/連絡先/ジャンル/ステータス/送信状況テーブル、詳細ドロワー
- 旧Next/Supabase版のテンプレート、送信NG/除外、フォーム送信、営業リスト収集、管理/運用メニューに寄せたパネル、集計、履歴テーブル
- 旧Next/Supabase版のサイドバー構成に寄せた `バックグラウンド進捗` / `メール送信リスト` / `送信プレビュー` / `送信履歴` / `商談` / `分析` / `同期` / `Gmail連携` / `管理` タブ
- 旧Next/Supabase版の送信プレビュー、検索結果レビュー、Gmail連携テスト、送信ロック、Google認証管理に寄せた詳細パネル
- 旧Next/Supabase版の管理画面に寄せた自動運用設定、重複リスト管理、エラー詳細パネル
- 旧Next/Supabase版の `ListViewSettingsPanel` に寄せた営業リスト表示項目設定
- 旧Next/Supabase版の `CustomFieldDefinitionForm` / `CustomFieldsInputs` に寄せたカスタム項目定義とリード詳細入力
- 旧Next/Supabase版の `TemplateTagMenu` に寄せたテンプレート差し込みメニュー、サンプル文面、差し込み値プレビュー
- 旧Next/Supabase版の `AppSafetyStrip` / `AppTopShortcutBar` / `AppRouteProgress` に寄せた運用ステータスバー、上部ショートカット、タブ切替進行バー
- 旧Next/Supabase版の `AppFrame` に寄せたサイドバーのリスト/運用グループ順序
- 旧Next/Supabase版の `BackgroundJobWidgets` / `BackgroundJobToasts` / `BackgroundJobCenter` に寄せた共通ジョブ通知と戻るボタン
- 旧Next/Supabase版のメニュー構成に寄せた `送信NG` / `除外ドメイン` / `直近実行結果` / `エラー詳細` の独立タブ
- 旧Next/Supabase版の `ProspectingCollectionTool` / `AutoProspectingSettingsPanel` / `ProspectingBatchPanel` / `ExclusionSearchPanel` / `CareFacilityFileProspectingPanel` / `SourcePageProspectingPanel` に寄せた営業リスト収集ツール内5モードUI
- 旧Next/Supabase版の `GenreManager` / `ReasonMasterManager` に寄せた管理画面のジャンル管理、選択肢管理UI
- 旧Next/Supabase版の `LeadEditForm` / `MeetingScheduleForm` に寄せたリード詳細のステータス、送信NG理由、商談/Calendar登録UI
- 旧Next/Supabase版の `QuickLeadEditButton` に寄せたリード詳細内の送信履歴カード、フォーム送信履歴カード
- 旧Next/Supabase版の `QuickLeadEditButton` に寄せたリード詳細下部の除外ドメイン登録、削除確認UI
- 旧Next/Supabase版の `DuplicateResolutionDialog` に寄せたリード詳細内の重複候補確認、残す営業先選択UI
- 旧Next/Supabase版の `FormOutreachBoard` に寄せたフォーム送信リストの送信済みチェック、送信済み解除、フォーム送信イベント保存
- 旧Next/Supabase版の `LoginForm` に寄せた初回Google承認ゲート
- 旧Next/Supabase版の `SerperApiKeyManager` / `SerperSetupGuide` に寄せたSerper APIキー管理、検索テスト、マスク済みキー一覧
- 旧Next/Supabase版の `AdminReadinessRunner` / `SchemaStatusPanel` に寄せた本番前確認、DB追加項目チェック
- 旧Next/Supabase版の `TemplateProductionStatus` / `TemplateActions` に寄せたテンプレート本番ON/OFF、テスト送信、削除操作

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
- Web app deployment @41 / code v41: `https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec`
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
- `components/SendWindowSettingsForm.tsx` / `components/BackgroundWorkerSettingsForm.tsx` / `components/DuplicateLeadManager.tsx` / `app/errors/page.tsx`: 自動運用設定、重複リスト管理、エラー詳細のUI構成
- `components/TemplateTagMenu.tsx` / `components/AppSafetyStrip.tsx` / `components/AppTopShortcutBar.tsx` / `components/AppRouteProgress.tsx`: 差し込みタグ操作、運用ステータス、上部ショートカット、画面遷移フィードバックのUI構成
- `components/BackgroundJobWidgets.tsx` / `components/BackgroundJobToasts.tsx` / `components/BackgroundJobCenter.tsx`: 共通ジョブ通知、進捗バー、戻るボタンのUI構成

持ち込まないもの:

- Supabase / Vercel / Next.js / GitHub Actions 依存
- RLS、PostgreSQLインデックス、生成列などSheetsに不要な実装
- Vercel用の短いバックグラウンド実行予算
