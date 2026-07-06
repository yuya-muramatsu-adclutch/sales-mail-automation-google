# 完成監査メモ

最終更新: 2026-07-06

## デプロイ

- Script ID: `1IPcbftgkafJCBKkoIDnSBjw4fnQoOdXR8I0KjpUCLsq4MYp_7olPOk76`
- Web app @117 / code v117: `https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec`
- Spreadsheet DB: `https://docs.google.com/spreadsheets/d/1IuJrWB7RGd2qIFDlhe5lfKaBnmUKN4RcnxdFFTuluZY/edit`
- Code version: `20260707_apps_script_full_workflow_v117_detail_card_two_column_spacing`

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
| 旧アプリ収集ツール詳細反映 | 完了 | 旧 `ProspectingCollectionTool` / `AutoProspectingSettingsPanel` / `ProspectingBatchPanel` / `ExclusionSearchPanel` / `CareFacilityFileProspectingPanel` / `SourcePageProspectingPanel` に合わせ、code v25で収集ツール内5モードUIを反映 |
| 旧アプリ管理マスター反映 | 完了 | 旧 `GenreManager` / `ReasonMasterManager` に合わせ、code v26でジャンル管理、選択肢管理、追加/編集/削除確認/有効無効操作を管理画面へ反映 |
| 旧アプリリード詳細反映 | 完了 | 旧 `LeadEditForm` / `MeetingScheduleForm` に合わせ、code v27で対応ステータス、送信NG理由/メモ、フォーム対応、辞退理由、商談ステータス、Calendar登録/Meet導線をリード詳細ドロワーへ反映 |
| 旧アプリクイック履歴反映 | 完了 | 旧 `QuickLeadEditButton` に合わせ、code v28でリード詳細ドロワー内の送信履歴カード、本文詳細、リード別履歴取得APIを反映 |
| 旧アプリフォーム履歴反映 | 完了 | 旧 `QuickLeadEditButton` に合わせ、code v29でリード詳細ドロワー内のフォーム送信履歴、最新送信/状態サマリー、本文コピー導線を反映 |
| 旧アプリ危険操作UI反映 | 完了 | 旧 `QuickLeadEditButton` に合わせ、code v30でリード詳細ドロワー下部の除外ドメイン登録、削除確認、営業対象から外す操作UIを反映 |
| 旧アプリ重複候補UI反映 | 完了 | 旧 `DuplicateResolutionDialog` に合わせ、code v31でリード詳細ドロワー内の重複候補確認、既存候補を残す/編集中の営業先を残す操作UIを反映 |
| 旧アプリフォーム送信状態反映 | 完了 | 旧 `FormOutreachBoard` に合わせ、code v32でフォーム送信リストの送信済みチェック、送信済み解除、フォーム送信イベント保存を反映 |
| 旧アプリ認証画面反映 | 完了 | 旧 `LoginForm` に合わせ、code v33で初回Google承認ゲート、承認リンク、承認後再読み込み導線を反映 |
| 旧アプリSerperキー管理反映 | 完了 | 旧 `SerperApiKeyManager` / `SerperSetupGuide` に合わせ、code v34でSerper APIキー管理、検索APIテスト、マスク済みキー一覧を反映 |
| 旧アプリ背景ジョブ監視UI反映 | 完了 | 旧 `BackgroundJobsOverview` に合わせ、code v35でバックグラウンド進捗KPI、表示フィルタ、カテゴリ別ジョブスロット、直近3日成果カードを反映 |
| 旧アプリ同期インポートUI反映 | 完了 | 旧 `SyncImportPanel` に合わせ、code v36でCSV/JSON同期、ファイル読込、文字コード推定、列マッピング、プレビューKPI、要確認行、先頭10件プレビューを反映 |
| 旧アプリ検索結果レビュー操作反映 | 完了 | 旧 `JobResultsReviewTable` に合わせ、code v37で検索結果カードの選択、一括確認、選択除外、メール/フォーム補正、営業リスト追加、レビュー状態保存を反映 |
| 旧アプリGmail返信/Calendar設定反映 | 完了 | 旧 `GmailReplyCheckPanel` / `CalendarAutoCreateSettingsForm` に合わせ、code v39で返信チェック結果サマリー、誤判定候補確認/復元、Calendar自動登録設定を反映 |
| 旧アプリ管理チェック/テンプレート操作反映 | 完了 | 旧 `AdminReadinessRunner` / `SchemaStatusPanel` / `TemplateProductionStatus` / `TemplateActions` に合わせ、code v40で本番前確認、DB追加項目チェック、テンプレート本番ON/OFF、行内テスト送信/削除操作を反映 |
| 旧アプリAppFrameナビ順序反映 | 完了 | 旧 `AppFrame` の `listNavItems` / `navItems` に合わせ、code v41でサイドバーのグループ順序を旧ナビ順へ調整し、追加内部ページをセカンダリ表示にした |
| 旧アプリAppFrameメニュー/アイコン再現 | 完了 | code v51で旧 `AppFrame` と同じ一次メニューだけをサイドバー表示に戻し、旧 `AppNavLink` / `AppTopShortcutBar` に寄せた線アイコン表示を追加 |
| 旧アプリダッシュボードカード再現 | 完了 | code v52で旧 `DashboardSignalCard` / `DashboardActionCard` / `DashboardCompactStat` に寄せ、重要指標、次の作業、今月の動き、検索概要へアイコン付きカード構造を追加 |
| 旧アプリ共通UI部品再現 | 完了 | code v53で旧 `StatusPill` / `DataTable` / `.button` / `.mini-button` / `.table-link-button` に寄せ、Pill色/枠線、テーブル密度、フォーカス行、行内操作ボタンを全メニュー共通へ反映 |
| 旧アプリ検索フィルタ/空状態再現 | 完了 | code v54で旧 `ListSearchFilters` / `DataTable` 空状態に寄せ、検索パネルのスライダーアイコン、適用/クリア導線、空テーブルの点線枠メッセージを反映 |
| 旧アプリページング/小リンク再現 | 完了 | code v55で旧 `LeadPagination` / `url-mini-link` / `button.primary` に寄せ、営業リストページング、URL小リンク、一次ボタン色を反映 |
| 旧アプリフォーム作業UI再現 | 完了 | code v56で旧 `FormOutreachBoard` の作業中バー、屋号コピー、フォームURLミニリンク、本文コピー、送信済み、次へ操作を反映 |
| 旧アプリリード詳細モーダル再現 | 完了 | code v57で旧 `QuickLeadEditButton` の中央モーダル、ヘッダーPill、閉じるアイコン、4列サマリーを反映 |
| 旧アプリテンプレート作成UI再現 | 完了 | code v58で旧 `TemplateCreateForm` のサンプル適用、保存済みテンプレート更新、別テンプレート作成、フォーム営業件名なし保存を反映 |
| 旧アプリ安全ステータス帯再現 | 完了 | code v59で旧 `AppSafetyStrip` のShield/Clock/Mail/Plugアイコン付きステータスチップを全メニュー共通ヘッダーへ反映 |
| 旧アプリ上部ショートカット再現 | 完了 | code v60で旧 `AppTopShortcutBar` と同じ6項目だけに戻し、更新/setupはサイドバー下部へ集約 |
| 旧アプリ送信プレビューアイコン再現 | 完了 | code v61で旧 `EmailPreviewPanel` のEye/Sendアイコンを差し込み確認Pill、1件送信、自動送信ボタンへ反映 |
| 旧アプリ送信履歴ヘッダー再現 | 完了 | code v62で旧 `HistoriesPage` のDownload/Sendアイコン付きCSV出力/送信プレビュー導線を反映 |
| 旧アプリ分析カードアイコン再現 | 完了 | code v63で旧 `AnalyticsPage` のListPlus/Send/Reply/Calendar/Check/Shield/Trend/Mailアイコンをサマリー、ファネル、リスク帯へ反映 |
| 旧アプリ管理/運用チェックアイコン再現 | 完了 | code v64で旧 `AdminPage` のDatabase/SearchCheck/ServerCog/Rocketアイコン付きステータスカードと本番チェック行を管理/運用/Gmail管理へ反映 |
| 旧アプリSerperセットアップアイコン再現 | 完了 | code v65で旧 `SerperSetupGuide` / `SerperApiKeyManager` のKey/Check/Refresh/Search/Serverアイコンを未設定ガイド、APIキー概要、収集実行プレビューへ反映 |
| 旧アプリメール自動取得カード再現 | 完了 | code v66で旧 `EmailDiscoverySettingsForm` のMailSearch/Clock/TimerReset/Historyステータス行と自動運用カードのアイコン付きヘッダーを反映 |
| 旧アプリGmail/Google認証UI再現 | 完了 | code v67で旧 `GmailConnectionCheck` / `GoogleCredentialsManager` / `MailSendLockPanel` のShield/Key/Refresh/Mail/Lock/Unlockアイコン付き状態行、Google認可導線、送信ロック表示を反映 |
| 旧アプリGmail返信チェックUI再現 | 完了 | code v68で旧 `GmailReplyCheckPanel` / `GmailReplyCheckSettingsForm` / `CalendarAutoCreateSettingsForm` のMessageCircleReply/Refresh/Rotate/Saveアイコン付き操作、注意帯、エラー行、誤判定候補カードを反映 |
| 旧アプリテンプレート操作ダイアログ再現 | 完了 | code v69で旧 `TemplateActions` の編集ダイアログ、テスト送信ダイアログ、送信先カード、差し込み元、プレビュー、保存/送信アクションを反映 |
| 旧アプリ検索結果レビューUI再現 | 完了 | code v70で旧 `JobResultsReviewTable` の5列カテゴリ、カードグリッド、一括確認、選択除外/確認済み、追加読み込み導線を反映 |
| 旧アプリバックグラウンド通知UI再現 | 完了 | code v71で旧 `BackgroundJobToasts` の線画アイコン、スピナー、追加先表示、結果/進捗導線を反映 |
| 旧アプリバックグラウンド進捗ページ再現 | 完了 | code v72で旧 `background-jobs/page.tsx` のListChecks導入パネル、ArrowLeft戻り導線、進捗説明本文を反映 |
| 旧アプリ自動収集進捗ダッシュボード再現 | 完了 | code v73で旧 `ProspectingProgressDashboard` の進捗ヒーロー、統計タイル、履歴セレクタ、追加リスト/検索別結果/除外・重複理由の詳細をGAS版 `search_jobs` / `search_results` へ読み替えて反映 |
| 旧アプリ除外ドメイン管理UI再現 | 完了 | code v74で旧 `ExcludedDomainManager` のサマリーPill、追加/編集フォーム、検索、状態フィルタ、編集/停止/有効化操作をGAS版 `excluded_domains` へ読み替えて反映 |
| クリック不能/初期化停止修正 | 完了 | code v75でApps Script HTML Serviceにより `https://` 文字列が分断され、`SyntaxError` で `showTab` などが未定義になる問題を修正。URLサンプルは `HTTPS_PROTOCOL_PREFIX` で組み立てる |
| 営業リストWEBリンク表示調整 | 完了 | code v76で営業リストのWEBリンクPillからcompact domain表示を外し、表示文言を `WEBサイト` だけに変更 |
| 営業リスト初期ロード軽量化 | 完了 | code v77で初期ロードを確認待ち100件に限定し、全件ビューは手動ボタンと進捗UIから読み込む構成に変更 |
| 営業リスト進捗UIレイアウト調整 | 完了 | code v78で全件読み込み進捗中の軽量ロードパネルが横幅不足で潰れないよう折り返し表示へ調整 |
| 旧アプリフレームUI復元 | 完了 | code v79で通常画面に重なっていた戻るボタンを支援画面限定にし、更新完了メッセージを自動消去して旧アプリに近い余白へ戻した |
| 動的パネル初期表示復元 | 完了 | code v80で初期ロード中の空カード/空フォーム作業パネルを非表示にし、主要ダッシュボード描画後はグローバルの読み込み表示を消して旧アプリに近い初期表示へ戻した |
| 送信履歴/同期UI復元 | 完了 | code v81で送信履歴ヘッダーの生テンプレート文字列表示をアイコン表示へ戻し、同期画面のカードが左に細く潰れないよう旧アプリ寄りの専用グリッドへ調整した |
| 同期グリッド優先度復元 | 完了 | code v82で後段の汎用 `.grid` に同期専用グリッドが上書きされないようセレクタを強め、同期インポートパネルの横幅崩れを実画面で復元 |
| 管理/運用チェック行復元 | 完了 | code v83で管理/運用の本番前チェック行を旧アプリ同様にラベルと詳細の縦積みに戻し、`Google Sheets5,441件` のような詰まり表示を解消 |
| メール送信リストテーブル復元 | 完了 | code v84でメール送信リストのテーブルを旧アプリの `table-email-leads` に寄せ、長い屋号/メールで右端の履歴操作が切れないよう列幅と省略表示を復元 |
| 営業リスト収集ツールUI復元 | 完了 | code v85で旧 `ProspectingCollectionTool` に合わせ、収集状況→収集メニューの順序、アイコン付き0〜4操作カード、状態バー、除外ドメイン導線を復元 |
| 営業リスト収集ツール上部密度調整 | 完了 | code v87で収集状況をコンパクト化し、空の直近検索テーブルを常時表示しないようにして操作カードがファーストビューへ近づくよう調整。空状態アイコンの巨大化も抑制 |
| 初回起動遅延改善 | 完了 | code v91で原因を `getInitialData()` の全件ダッシュボード集計、毎回の `setup()`、マスタ/設定/スキーマ/Serper集計、起動時の他メニュー全取得と特定。起動は軽量ダッシュボード + 確認待ちリストに限定し、詳細集計と各メニュー用データは背景/タブ表示時に遅延ロード。初回の確認待ち取得はquiet通信にして表示後のナビ操作をブロックしない |
| Gmail API連携設定 | 完了 | code v94で `MailApp` 用 `script.send_mail` と `GmailApp` 用 `https://mail.google.com/` をOAuth scopeへ追加し、Gmail連携画面から承認状態、Google認可URL、非送信の連携テストを確認できるようにした。認可リンクのアイコン巨大化と追加承認待ちの空パネル表示も修正 |
| Gmail承認状態判定修正 | 完了 | code v95で `NOT_REQUIRED` を `REQUIRED` の部分一致として扱い、承認後もGmail連携画面だけ要承認になる判定バグを修正 |
| 管理画面レイアウト改善 | 完了 | code v96で管理トップのカード密度を下げ、主要ステータス/本番前確認/自動運用サマリーを初期表示に集約。DB/Gmail詳細、マスター管理、ログ/メンテナンスはアコーディオン化 |
| 管理画面カード余白調整 | 完了 | code v97で管理ページ配下のカードpadding、見出し余白、ステータス項目、詳細アコーディオン、自動運用サマリーの間隔を調整し、旧gridが表示されても横詰まりしにくい指定を追加 |
| Gmail連携画面レイアウト改善 | 完了 | code v98でGmail連携ページの初期表示をサマリー中心に整理し、連携診断/テスト送信履歴/返信チェック/送信ロックをアコーディオン化。カードpadding、見出し余白、ステータス項目の間隔も調整 |
| 全体カード余白調整 | 進行中 | code v117で共通カード余白トークンを維持しつつ、空の `.exclusion-hero-panel` / 動的`.panel` / 統計グリッド / テンプレートタグパネル / テーブル枠などを非表示化。フォーム送信リストの空対象カード、ダッシュボードの高さ揃え、営業リスト表示項目アコーディオン、自動収集進捗/Serper設定ガイドのSVG巨大化に加え、Gmail連携の初期表示を3カードへ整理し、親子カードのpadding、説明文、Pill配置、レスポンシブ折り返しを調整。さらにダッシュボード上部API連携カードを読みやすい2列コンパクト表示にし、デスクトップでは詳細行を畳んで右カードの高さで左側に大きな空白が出る状態を詰めた。Gmail連携/管理の共通ステータスカードでラベルと詳細を縦積み固定にし、`Google Sheets5,441件` のようなテキスト詰まりを防ぐ余白・折り返し・Pill配置ガードを追加。管理/Gmailの詳細アコーディオン内カードを上揃えにして、子カードが同じ高さに引き伸ばされてボタンやPillの上に大きな空白が出る状態を抑制。管理詳細アコーディオンの子カード幅を広げ、広い画面でも2列ベースで並ぶようにして、4枚目だけが左下に残って右側に大きな空白が出る配置を抑制。管理タブの遅延データ取得を部分失敗に強くして、空の詳細アコーディオンだけが残る状態も抑制。主要/残り画面の実表示確認を継続 |
| 旧アプリメール送信制御カード反映 | 完了 | 旧 `MailSendingControlCard` に合わせ、code v42で `mail_sending_control` 設定、ダッシュボードの自動送信ON/OFF、送信停止時の安全バー/送信プレビュー表示を反映 |
| 旧アプリ送信プレビュー確認UI反映 | 完了 | 旧 `EmailPreviewPanel` に合わせ、code v43で対象リスト自動送信カード、確認ダイアログ、送信候補プレビュー、送信可否Pillを反映 |
| 旧アプリGmailテスト送信履歴反映 | 完了 | 旧Gmail連携画面に合わせ、code v44でテスト送信履歴、成功/失敗サマリー、失敗理由詳細、テンプレート画面導線を反映 |
| 差し込み値空欄タグ強調 | 完了 | code v45で送信プレビューの差し込み値カードに空欄タグ一覧、空欄数Pill、警告色カードを追加 |
| 送信本文差分確認UI反映 | 完了 | code v46でテンプレート原文、送信時本文、空欄タグの前後文脈を並べて確認できる本文差分パネルを追加 |
| 送信件名差分確認UI反映 | 完了 | code v47でテンプレート件名、送信時件名、件名内の空欄タグ文脈を並べて確認できる件名差分パネルを追加 |
| 旧アプリ送信履歴ページ詳細反映 | 完了 | code v48で履歴区分フィルタ、検索、絞り込み中Pill、本文/Gmail詳細、絞り込みCSV出力を送信履歴ページへ追加 |
| 旧アプリ分析ページ詳細反映 | 完了 | code v49でリスト追加経路、日別/月間分析、見るべき指標、メール文別返信率、テンプレート件名/本文プレビュー付き成果表を追加 |
| 分析ページ表示調整 | 完了 | code v50で送信成功率と追加経路フォールバック、サマリー色トーンを調整 |

## 検証済み

- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v66-email-discovery-icon-parity"` でVersion 66を作成済み
- 既存Web app URLを `clasp deploy -V 66 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 66へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@66 - apps-script-full-workflow-v66-email-discovery-icon-parity-on-existing-url` を指すことを確認
- code v66ローカルスモークで `automation-card-title`, `automation-status-grid`, `mailSearch`, `timerReset`, `history`, v66バージョンマーカーを確認済み
- `clasp version "apps-script-full-workflow-v67-gmail-connection-icon-parity"` でVersion 67を作成済み
- 既存Web app URLを `clasp deploy -V 67 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 67へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@67 - apps-script-full-workflow-v67-gmail-connection-icon-parity-on-existing-url` を指すことを確認
- code v67ローカルスモークで `keyRound`, `refreshCw`, `gmail-connection-status-grid`, `triangleAlert`, `lock` / `unlock`, v67バージョンマーカーを確認済み
- `clasp version "apps-script-full-workflow-v68-gmail-reply-panel-parity"` でVersion 68を作成済み
- 既存Web app URLを `clasp deploy -V 68 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 68へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@68 - apps-script-full-workflow-v68-gmail-reply-panel-parity-on-existing-url` を指すことを確認
- code v68ローカルスモークで `messageCircleReply`, `refreshCw`, `rotateCcw`, 返信チェック注意帯、誤判定候補カード、Calendar保存アイコン、v68バージョンマーカーを確認済み
- `clasp version "apps-script-full-workflow-v69-template-action-dialog-parity"` でVersion 69を作成済み
- 既存Web app URLを `clasp deploy -V 69 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 69へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@69 - apps-script-full-workflow-v69-template-action-dialog-parity-on-existing-url` を指すことを確認
- code v69ローカルスモークで `templateActionDialogHost`, `template-edit-dialog`, `template-test-dialog`, `template-test-recipient`, `runTemplateTestSend`, v69バージョンマーカーを確認済み
- `clasp version "apps-script-full-workflow-v70-job-results-review-parity"` でVersion 70を作成済み
- 既存Web app URLを `clasp deploy -V 70 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 70へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@70 - apps-script-full-workflow-v70-job-results-review-parity-on-existing-url` を指すことを確認
- code v70ローカルスモークで `jobResultRenderLimit`, `reviewAllEmailJobResults`, `reviewAllUrlJobResults`, `job-results-load-more`, `squarePen`, `xCircle`, v70バージョンマーカーを確認済み
- `clasp version "apps-script-full-workflow-v71-background-toast-parity"` でVersion 71を作成済み
- 既存Web app URLを `clasp deploy -V 71 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 71へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@71 - apps-script-full-workflow-v71-background-toast-parity-on-existing-url` を指すことを確認
- code v71ローカルスモークで `loaderCircle`, `background-toast-spin`, `background-toast-found-list`, `displayBackgroundJobLabel`, v71バージョンマーカーを確認済み
- `clasp version "apps-script-full-workflow-v72-background-page-header-parity"` でVersion 72を作成済み
- 既存Web app URLを `clasp deploy -V 72 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 72へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@72 - apps-script-full-workflow-v72-background-page-header-parity-on-existing-url` を指すことを確認
- code v72ローカルスモークで `background-guide-panel`, `listChecks`, `arrowLeft`, v72バージョンマーカーを確認済み
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v73-prospecting-progress-dashboard"` でVersion 73を作成済み
- 既存Web app URLを `clasp deploy -V 73 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 73へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@73 - apps-script-full-workflow-v73-prospecting-progress-dashboard-on-existing-url` を指すことを確認
- code v73ローカルスモークで `prospectingProgressDashboard`, `renderProspectingProgressDashboard`, `prospecting-progress-stat`, `prospecting-details-section`, v73バージョンマーカーを確認済み
- `clasp version "apps-script-full-workflow-v74-excluded-domain-manager"` でVersion 74を作成済み
- 既存Web app URLを `clasp deploy -V 74 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 74へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@74 - apps-script-full-workflow-v74-excluded-domain-manager-on-existing-url` を指すことを確認
- code v74ローカルスモークで `excluded-domain-manager`, `exclusion-workbench`, `excludedDomainSearch`, `renderExcludedDomainManager`, v74バージョンマーカーを確認済み
- Chrome実機でクリックしても画面が動かない状態を確認。DevToolsログで `SyntaxError: Invalid or unexpected token` と `ReferenceError: showTab is not defined` を確認し、デプロイ済みスクリプトの構文チェックで `website_url: ... 'https:` が分断されていることを特定
- `clasp version "apps-script-full-workflow-v75-url-literal-boot-fix"` でVersion 75を作成済み
- 既存Web app URLを `clasp deploy -V 75 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 75へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@75 - apps-script-full-workflow-v75-url-literal-boot-fix-on-existing-url` を指すことを確認
- code v75ローカルスモークで `HTTPS_PROTOCOL_PREFIX`, 生 `https://` 不在, v75バージョンマーカーを確認済み
- Chrome実機で `20260705_apps_script_full_workflow_v75_url_literal_boot_fix` 表示、初期データ読み込み完了、`dashboard -> leads -> exclusions` のクリック遷移を確認済み
- `clasp version "apps-script-full-workflow-v76-website-link-label-only"` でVersion 76を作成済み
- 既存Web app URLを `clasp deploy -V 76 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 76へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@76 - apps-script-full-workflow-v76-website-link-label-only-on-existing-url` を指すことを確認
- code v76ローカルスモークで `WEBサイト` 表示、compact domain非表示、v76バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v62-history-header-icon-parity"` でVersion 62を作成済み
- 既存Web app URLを `clasp deploy -V 62 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 62へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@62 - apps-script-full-workflow-v62-history-header-icon-parity-on-existing-url` を指すことを確認
- code v62ローカルスモークで `legacyUiIcon('download')`, `legacyUiIcon('send')`, v62バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v61-email-preview-icon-parity"` でVersion 61を作成済み
- 既存Web app URLを `clasp deploy -V 61 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 61へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@61 - apps-script-full-workflow-v61-email-preview-icon-parity-on-existing-url` を指すことを確認
- code v61ローカルスモークで `legacyUiIcon('eye')`, `legacyUiIcon('send')`, v61バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v60-top-shortcut-parity"` でVersion 60を作成済み
- 既存Web app URLを `clasp deploy -V 60 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 60へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@60 - apps-script-full-workflow-v60-top-shortcut-parity-on-existing-url` を指すことを確認
- code v60ローカルスモークで `toolbar-shortcut`, `data-shortcut-tab="emailLeads"`, `utility-action` 非表示, v60バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v59-safety-strip-icon-parity"` でVersion 59を作成済み
- 既存Web app URLを `clasp deploy -V 59 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 59へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@59 - apps-script-full-workflow-v59-safety-strip-icon-parity-on-existing-url` を指すことを確認
- code v59ローカルスモークで `shieldCheck`, `clock3`, `mailCheck`, `plug`, v59バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v58-template-create-parity"` でVersion 58を作成済み
- 既存Web app URLを `clasp deploy -V 58 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 58へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@58 - apps-script-full-workflow-v58-template-create-parity-on-existing-url` を指すことを確認
- code v58ローカルスモークで `template-create-panel`, `templateSubmitButton`, `startNewTemplate`, `updateTemplateFormState`, v58バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v57-quick-lead-dialog-parity"` でVersion 57を作成済み
- 既存Web app URLを `clasp deploy -V 57 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 57へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@57 - apps-script-full-workflow-v57-quick-lead-dialog-parity-on-existing-url` を指すことを確認
- code v57ローカルスモークで `quick-lead-dialog`, `quick-dialog-header-actions`, `leadDialogStatusPills`, v57バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v56-form-work-action-parity"` でVersion 56を作成済み
- 既存Web app URLを `clasp deploy -V 56 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 56へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@56 - apps-script-full-workflow-v56-form-work-action-parity-on-existing-url` を指すことを確認
- code v56ローカルスモークで `facility-copy-button`, `copyFormLeadFacilityName`, `formUrlMiniLink`, `selectNextFormLead`, v56バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v55-pagination-link-button-parity"` でVersion 55を作成済み
- 既存Web app URLを `clasp deploy -V 55 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 55へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@55 - apps-script-full-workflow-v55-pagination-link-button-parity-on-existing-url` を指すことを確認
- code v55ローカルスモークで `lead-pagination-pages`, `chevronFirst`, `url-mini-link`, `button.primary`, v55バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v54-filter-empty-state-parity"` でVersion 54を作成済み
- 既存Web app URLを `clasp deploy -V 54 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 54へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@54 - apps-script-full-workflow-v54-filter-empty-state-parity-on-existing-url` を指すことを確認
- code v54ローカルスモークで `LEGACY_UI_ICON_SVGS`, `hydrateLegacyUtilityIcons`, `list-filter-panel-icon`, `list-filter-actions`, `data-table-empty-cell`, v54バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v53-status-table-button-parity"` でVersion 53を作成済み
- 既存Web app URLを `clasp deploy -V 53 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 53へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@53 - apps-script-full-workflow-v53-status-table-button-parity-on-existing-url` を指すことを確認
- code v53ローカルスモークで `legacy-component-parity`, `status-pill`, `overscroll-behavior-inline: contain`, `table-link-button.primary-action`, v53バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v52-dashboard-card-icons"` でVersion 52を作成済み
- 既存Web app URLを `clasp deploy -V 52 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 52へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@52 - apps-script-full-workflow-v52-dashboard-card-icons-on-existing-url` を指すことを確認
- code v52ローカルスモークで `DASHBOARD_ICON_KEYS`, `dashboard-signal-icon`, `dashboardIcon(iconKey)`, v52バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v51-legacy-navigation-parity"` でVersion 51を作成済み
- 既存Web app URLを `clasp deploy -V 51 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 51へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@51 - apps-script-full-workflow-v51-legacy-navigation-parity-on-existing-url` を指すことを確認
- code v51ローカルスモークで `NAV_ICON_SVGS`, `hydrateLegacyNavigationIcons`, 旧AppFrameの一次メニュー順序、支援画面IDを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v50-analytics-template-breakdown-polish"` でVersion 50を作成済み
- 既存Web app URLを `clasp deploy -V 50 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 50へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@50 - apps-script-full-workflow-v50-analytics-template-breakdown-polish-on-existing-url` を指すことを確認
- code v50ローカルスモークで `analyticsTemplateTable`, `buildClientAnalyticsData`, `buildClientAnalyticsTemplateRows`, `メール文別返信率`, `mail-copy-cell` を確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v49-analytics-template-breakdown"` でVersion 49を作成済み
- 既存Web app URLを `clasp deploy -V 49 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 49へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@49 - apps-script-full-workflow-v49-analytics-template-breakdown-on-existing-url` を指すことを確認
- code v49ローカルスモークで `analyticsTemplateTable`, `buildClientAnalyticsData`, `buildClientAnalyticsTemplateRows`, `メール文別返信率`, `mail-copy-cell` を確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v48-send-history-filters"` でVersion 48を作成済み
- 既存Web app URLを `clasp deploy -V 48 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 48へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@48 - apps-script-full-workflow-v48-send-history-filters-on-existing-url` を指すことを確認
- code v48ローカルスモークで `historyFilterPanel`, `filteredSendHistories`, `exportFilteredSendHistoriesCsv`, `本文/Gmail`, `絞り込み中` を確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v47-template-subject-diff-preview"` でVersion 47を作成済み
- 既存Web app URLを `clasp deploy -V 47 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 47へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@47 - apps-script-full-workflow-v47-template-subject-diff-preview-on-existing-url` を指すことを確認
- code v47ローカルスモークで `template-subject-diff-panel`, `renderTemplateSubjectDiffPreview`, `件名差分`, `テンプレート件名`, `送信時件名` を確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v46-template-body-empty-context-diff"` でVersion 46を作成済み
- 既存Web app URLを `clasp deploy -V 46 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 46へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@46 - apps-script-full-workflow-v46-template-body-empty-context-diff-on-existing-url` を指すことを確認
- code v46ローカルスモークで `template-body-diff-panel`, `template-empty-token`, `template-filled-token`, `renderTemplateBodyDiffPreview`, `collectEmptyTemplateContexts`, `本文差分` を確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v45-template-variable-empty-highlight"` でVersion 45を作成済み
- 既存Web app URLを `clasp deploy -V 45 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 45へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@45 - apps-script-full-workflow-v45-template-variable-empty-highlight-on-existing-url` を指すことを確認
- code v45ローカルスモークで `template-variable-empty-list`, `空欄タグ`, `空欄なし`, `template-variable-card ${item.empty ? 'empty' : ''}` を確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v44-gmail-test-history-panel"` でVersion 44を作成済み
- 既存Web app URLを `clasp deploy -V 44 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 44へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@44 - apps-script-full-workflow-v44-gmail-test-history-panel-on-existing-url` を指すことを確認
- code v44ローカルスモークで `gmailTestSendHistoryPanel`, `renderGmailTestSendHistoryPanel`, `Gmailテスト送信履歴`, `send_type: 'テスト送信'`, `error_message: errorMessage` を確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v43-email-preview-confirm-dialog"` でVersion 43を作成済み
- 既存Web app URLを `clasp deploy -V 43 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 43へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@43 - apps-script-full-workflow-v43-email-preview-confirm-dialog-on-existing-url` を指すことを確認
- code v43ローカルスモークで `dialog-backdrop`, `send-target-preview`, `emailBatchConfirmOpen`, `openEmailBatchConfirm`, `runConfirmedEmailBatch` を確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v42-mail-sending-control-dashboard"` でVersion 42を作成済み
- 既存Web app URLを `clasp deploy -V 42 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 42へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@42 - apps-script-full-workflow-v42-mail-sending-control-dashboard-on-existing-url` を指すことを確認
- code v42ローカルスモークで `dashboardMailSendingControl`, `toggleMailSendingControl`, `mail_sending_control`, `setMailSendingControl`, `dashboardProspectingStatus` を確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v41-appframe-nav-parity"` でVersion 41を作成済み
- 既存Web app URLを `clasp deploy -V 41 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 41へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@41 - apps-script-full-workflow-v41-appframe-nav-parity-on-existing-url` を指すことを確認
- code v41ローカルスモークで旧 `AppFrame` のサイドバー順序、セカンダリナビ、v41バージョンマーカーを確認済み
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v40-admin-readiness-template-actions"` でVersion 40を作成済み
- 既存Web app URLを `clasp deploy -V 40 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 40へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@40 - apps-script-full-workflow-v40-admin-readiness-template-actions-on-existing-url` を指すことを確認
- code v40ローカルスモークで `adminReadinessRunnerPanel`, `schemaStatusPanel`, `renderTemplateActionCell`, `setEmailTemplateProduction`, `getSchemaStatus` が含まれることを確認
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
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
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v25-collection-tool-panels"` でVersion 24を作成済み
- 既存Web app URLを `clasp deploy -V 24 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 24へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@24 - apps-script-full-workflow-v25-collection-tool-panels-on-existing-url` を指すことを確認
- code v25ローカルスモークで `collection-tab-panel`, `autoCollectionEnabled`, `submitCollectionAreaSearch`, `submitCollectionKeywordSearch`, `importCollectionCsv`, `saveSourcePageCollectionSettings` が含まれることを確認
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v26-admin-master-managers"` でVersion 25を作成済み
- 既存Web app URLを `clasp deploy -V 25 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 25へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@25 - apps-script-full-workflow-v26-admin-master-managers-on-existing-url` を指すことを確認
- code v26ローカルスモークで `genreManagerPanel`, `reasonMasterManagerPanel`, `renderGenreManagerPanel`, `renderReasonMasterManagerPanel`, `saveGenreFromForm`, `saveReasonFromForm` が含まれることを確認
- 匿名 `doPost getAppInfo` はGoogle側401、`clasp run getAppInfo` は実行権限不足のためライブ関数応答の直接確認は未実施
- `clasp push -f` 成功
- `clasp version "apps-script-full-workflow-v27-lead-detail-controls"` でVersion 26を作成済み
- 既存Web app URLを `clasp deploy -V 26 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 26へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@26 - apps-script-full-workflow-v27-lead-detail-controls-on-existing-url` を指すことを確認
- code v27ローカルスモークで `leadStatusControlPanel`, `renderLeadStatusControlPanel`, `quick-status-layout`, `status-lock-box`, `leadSendNgReason`, `leadFormStatus`, `meeting-form`, `leadMeetLink` が含まれることを確認
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v28-quick-history-panel"` でVersion 27作成済み
- 既存Web app URLを `clasp deploy -V 27 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 27へ再デプロイ済み
- code v28ローカルスモークで `leadHistoryPanel`, `quick-history-section`, `quick-history-item`, `loadLeadSendHistoriesForDialog`, `renderLeadHistoryPanel`, `listLeadSendHistories` が含まれることを確認
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v29-form-history-panel"` でVersion 28作成済み
- 既存Web app URLを `clasp deploy -V 28 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 28へ再デプロイ済み
- code v29ローカルスモークで `leadFormHistoryPanel`, `quick-form-history-summary`, `formHistoryItemsClient`, `copyLeadFormHistoryBody` が含まれることを確認
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v30-lead-danger-zone"` でVersion 29作成済み
- 既存Web app URLを `clasp deploy -V 29 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 29へ再デプロイ済み
- code v30ローカルスモークで `leadDangerPanel`, `renderLeadDangerPanel`, `excludeSelectedLeadDomainAndArchive`, `archiveSelectedLeadFromDangerZone` が含まれることを確認
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v31-duplicate-resolution"` でVersion 30作成済み
- 既存Web app URLを `clasp deploy -V 30 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 30へ再デプロイ済み
- code v31ローカルスモークで `leadDuplicatePanel`, `loadLeadDuplicateCandidatesForDialog`, `renderLeadDuplicatePanel`, `keepCurrentLeadFromDuplicatePanel`, `listLeadDuplicateCandidates` が含まれることを確認
- `node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v32-form-send-state-parity"` でVersion 32作成済み
- 既存Web app URLを `clasp deploy -V 32 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 32へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@32 - apps-script-full-workflow-v32-form-send-state-on-existing-url` を指すことを確認
- code v32ローカルスモークで `form-sent-check`, `toggleFormLeadSent`, `markFormLeadSent`, `unmarkFormLeadSent`, `markLeadFormSent`, `unmarkLeadFormSent` が含まれることを確認
- `.gs` 全ファイルのNode構文チェック成功、`node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v33-auth-gate-ui"` でVersion 33作成済み
- 既存Web app URLを `clasp deploy -V 33 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 33へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@33 - apps-script-full-workflow-v33-auth-gate-ui-on-existing-url` を指すことを確認
- code v33ローカルスモークで `authGate`, `login-card`, `renderAuthorizationGate` が含まれることを確認
- `.gs` 全ファイルのNode構文チェック成功、`node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v34-serper-key-manager"` でVersion 34作成済み
- 既存Web app URLを `clasp deploy -V 34 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 34へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@34 - apps-script-full-workflow-v34-serper-key-manager-on-existing-url` を指すことを確認
- code v34ローカルスモークで `serperKeyManagerPanel`, `api-key-summary`, `listSerperApiKeyManager`, `saveSerperApiKeyEntry`, `updateSerperApiKeyEntry`, `deleteSerperApiKeyEntry` が含まれることを確認
- `.gs` 全ファイルのNode構文チェック成功、`node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v35-background-overview-ui"` でVersion 35作成済み
- 既存Web app URLを `clasp deploy -V 35 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 35へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@35 - apps-script-full-workflow-v35-background-overview-ui-on-existing-url` を指すことを確認
- code v35ローカルスモークで `backgroundOverviewPanel`, `background-overview-kpis`, `renderLegacyBackgroundOverview`, `setBackgroundOverviewView` が含まれることを確認
- `.gs` 全ファイルのNode構文チェック成功、`node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v36-sync-import-panel-ui"` でVersion 36作成済み
- 既存Web app URLを `clasp deploy -V 36 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 36へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@36 - apps-script-full-workflow-v36-sync-import-panel-ui-on-existing-url` を指すことを確認
- code v36ローカルスモークで `syncImportPanel`, `sync-preview-metrics`, `renderLegacySyncImportPanel`, `handleSyncImportFile`, `runLegacySyncImport` が含まれることを確認
- `.gs` 全ファイルのNode構文チェック成功、`node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v37-job-results-review-actions"` でVersion 37作成済み
- 既存Web app URLを `clasp deploy -V 37 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 37へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@37 - apps-script-full-workflow-v37-job-results-review-actions-on-existing-url` を指すことを確認
- code v37ローカルスモークで `addJobResultLead`, `reviewSelectedJobResults`, `excludeJobResult`, `toggleAllVisibleJobResults`, `addSearchResultToLead`, `reviewSearchResults` が含まれることを確認
- `.gs` 全ファイルのNode構文チェック成功、`node scripts/smoke-test.js` 成功、`git diff --check` 成功
- `clasp push -f` 成功、`clasp version "apps-script-full-workflow-v39-gmail-reply-calendar-panels"` でVersion 39作成済み
- 既存Web app URLを `clasp deploy -V 39 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 39へ再デプロイ済み
- `clasp deployments` で既存Web app URLが `@39 - apps-script-full-workflow-v39-gmail-reply-calendar-panels-on-existing-url` を指すことを確認
- code v39ローカルスモークで `gmailReplyCheckPanel`, `adminGmailReplyCheckPanel`, `calendarAutoCreateSettingsPanel`, `scanReplyFalsePositives`, `listReplyFalsePositiveCandidates` が含まれることを確認
- `.gs` 全ファイルのNode構文チェック成功、`node scripts/smoke-test.js` 成功、`git diff --check` 成功

## 運用時に確認する外部依存

- Serper実検索は、実APIキーを保存後に `testSerperApiKey()` と小規模ジョブで確認する。
- 実メール送信は、送信先・テンプレート・Gmail上限を確認してから1件で確認する。
- 実カレンダー登録は、テスト商談日時で1件作成して確認する。
- `clasp run` / `clasp logs` はGCP project / Apps Script Execution API設定に依存するため、現状の運用確認はWeb appとApps Script editorを正とする。
