# 旧 sales-mail-automation 反映分析

最終更新: 2026-07-05

参照元: `/Users/muramatsuyuuya/Documents/自動営業システム`

## 分析した主要ファイル

- `app/globals.css`: 色、余白、パネル、テーブル、サイドバー、ダッシュボード、営業リスト、収集ツールのスタイル
- `components/AppFrame.tsx`: サイドバー、ナビグループ、ブランド表現、上部ショートカット
- `components/AppSafetyStrip.tsx`, `components/AppTopShortcutBar.tsx`, `components/AppRouteProgress.tsx`: 運用ステータスバー、よく使う操作、画面遷移フィードバック
- `components/BackgroundJobWidgets.tsx`, `components/BackgroundJobToasts.tsx`, `components/BackgroundJobCenter.tsx`: 共通ジョブ通知、進捗バー、戻る操作
- `app/page.tsx`: 営業ダッシュボード、今日の送信キュー、API連携、次の作業、今月の動き
- `app/leads/page.tsx`: 営業リスト、ジャンル、検索、クイックビュー、KPI、色分け、ページング
- `components/LeadQuickViews.tsx`: 作業/状態別の即時フィルタ
- `components/ListSearchFilters.tsx`: 検索、絞り込み、並び替え
- `components/LeadStatusLegend.tsx`: 行色分け凡例
- `components/MailSendingControlCard.tsx`: メール送信状態の見せ方
- `app/forms/page.tsx`: フォーム送信リスト、フォーム状態、テンプレート導線
- `app/prospecting/page.tsx`: Serperを使う営業リスト収集ツール
- `app/templates/page.tsx`: テンプレート管理、差出人バナー、安全チェック、テンプレート例
- `app/ng-master/page.tsx`, `app/exclusions/page.tsx`: 送信NG/除外ドメイン管理、集計、履歴テーブル
- `components/FormOutreachBoard.tsx`: フォーム送信対象テーブル、作業バー、本文プレビュー
- `components/ProspectingActivityPanel.tsx`, `components/ProspectingCollectionTool.tsx`, `components/AutoProspectingSettingsPanel.tsx`, `components/ProspectingBatchPanel.tsx`, `components/ExclusionSearchPanel.tsx`, `components/CareFacilityFileProspectingPanel.tsx`, `components/SourcePageProspectingPanel.tsx`: 営業リスト収集ツールの指標、収集ルート、実行カード、5モード操作UI
- `app/background-jobs/page.tsx`, `app/sync/page.tsx`, `app/admin/page.tsx`, `app/histories/page.tsx`: 運用、ジョブ、同期ログ、送信履歴、管理系の見せ方
- `app/background-jobs/activity/page.tsx`, `app/errors/page.tsx`: 直近実行結果、ジョブ別結果、運用エラー詳細の見せ方
- `app/email-leads/page.tsx`, `app/sending/page.tsx`, `app/deals/page.tsx`, `app/analytics/page.tsx`, `app/integrations/gmail/page.tsx`: メール送信リスト、送信プレビュー、商談、分析、Gmail連携の見せ方
- `components/EmailPreviewPanel.tsx`: テンプレート/営業先選択、差し込み後の件名・本文、送信不可理由、対象リスト自動送信の見せ方
- `components/TemplateTestRecipientManager.tsx`: テスト送信先の現在値、営業リストからの宛先選択、保存導線
- `components/JobResultsReviewTable.tsx`: 検索ジョブ結果のカテゴリ別レビュー、確認済み操作、メール/フォーム/URLの根拠表示
- `components/GmailConnectionCheck.tsx`, `components/GoogleCredentialsManager.tsx`, `components/MailSendLockPanel.tsx`: Gmail連携テスト、Google認証状態、送信ロック、本番前チェックの見せ方
- `components/SendWindowSettingsForm.tsx`, `components/GmailReplyCheckSettingsForm.tsx`, `components/EmailDiscoverySettingsForm.tsx`, `components/BackgroundWorkerSettingsForm.tsx`: 自動送信時間、返信自動チェック、メール自動取得、重い処理の設定UI
- `components/DuplicateLeadManager.tsx`, `app/errors/page.tsx`: 重複リスト管理、エラー詳細の運用UI
- `components/ListViewSettingsPanel.tsx`, `components/CustomFieldDefinitionForm.tsx`, `components/CustomFieldsInputs.tsx`: 表示項目設定、カスタム項目定義、リード詳細内のカスタム項目入力
- `components/TemplateTagMenu.tsx`, `components/TemplateActions.tsx`, `components/TemplateCreateForm.tsx`: テンプレート差し込みタグ、テンプレートサンプル、作成/編集フォーム
- `components/GenreManager.tsx`, `components/ReasonMasterManager.tsx`: 管理画面のジャンル追加/編集/削除、送信NG/失注/対応不要理由の追加/編集/有効無効管理
- `components/LeadEditForm.tsx`, `components/MeetingScheduleForm.tsx`: リード詳細のステータス編集、送信NG理由/メモ、フォーム対応、商談ステータス、Calendar登録、Meetリンク表示
- `components/QuickLeadEditButton.tsx`: 営業リスト上の履歴・編集ダイアログ、送信履歴カード、本文詳細、フォーム送信履歴の見せ方
- `app/api/display-settings/route.ts`, `app/api/custom-fields/route.ts`, `supabase/schema.sql`: `list_view_settings` / `custom_field_definitions` の保存APIとスキーマ
- `lib/page-data.ts`, `lib/analytics.ts`, `lib/lead-status.ts`: ダッシュボード指標、ステータス、営業リスト絞り込みの考え方

## GAS版へ反映したUI

- 旧アプリの濃紺サイドバー、白パネル、8px角丸、薄いグレー背景、業務向けテーブル密度を `Index.html` へ反映。
- ダッシュボードを旧アプリの情報設計に寄せ、今日の送信キュー、API連携、重要指標、次の作業、今月の動き、運用サマリーを追加。
- 営業リストにジャンルバー、検索/ビュー/ステータス/ジャンル/並び替え、クイックビュー、リスト件数バー、KPIグリッド、色分け凡例を追加。
- 営業リストを旧 `LeadsBulkTable` の情報設計に寄せ、CSV/手動追加ヘッダー、確認待ちガイド、固定バルク操作バー、`No.` / `操作` / `屋号` / `連絡先` / `ジャンル名` / `ステータス` / `送信状況` の列構成を追加。
- リード編集を旧アプリの「履歴・編集」導線に寄せ、一覧横の常設フォームではなく右側詳細ドロワーで開くように変更。
- フォーム送信リストを新規タブとして追加し、フォーム対象の一覧、本文プレビュー、コピー、対応状態更新を追加。
- Serper検索タブにAPI設定、日次/月次残量、検索ジョブ状況の概要カードを追加。
- テンプレート画面に差出人バナー、安全チェック、テンプレート例、テスト/本番/版数の一覧列を追加。
- 送信NG/除外画面に旧アプリ風の集計ヒーロー、状態Pill、理由/登録日列を追加。
- フォーム送信画面を旧 `FormOutreachBoard` に寄せ、対象サマリー、作業バー、リスト、本文プレビューの構成へ変更。
- 営業リスト収集ツールに旧 `ProspectingActivityPanel` / `ProspectingCollectionTool` の指標、収集ルート、コスト管理、使用量ログを追加。
- 管理/運用画面に準備状況、実行アクション、送信履歴、ジョブ一覧、同期ログを集約。
- 旧 `AppFrame` のサイドバー導線に合わせ、`バックグラウンド進捗`、`メール送信リスト`、`送信プレビュー`、`送信履歴`、`商談`、`分析`、`同期`、`Gmail連携`、`管理` を独立タブとして追加。
- 旧アプリの各ページをApps Script/Sheets運用に読み替え、送信予定、送信履歴、商談ステータス、営業ファネル、同期ルール、Gmail承認状態、本番公開前チェックを表示。
- 送信プレビューに旧 `EmailPreviewPanel` のテンプレート/営業先選択、差し込み後確認、送信不可理由、対象リスト自動送信カードを追加。テンプレート未登録の空状態でも同じ枠組みが見えるようにした。
- 送信プレビューに旧 `TemplateTestRecipientManager` のテスト送信先選択パネルを追加。
- 営業リスト収集ツールに旧 `JobResultsReviewTable` の結果一覧、結果カテゴリ、確認済み操作、メール/フォーム/URLの根拠表示を追加。
- Gmail連携に旧 `GmailConnectionCheck` と `MailSendLockPanel` の連携テスト、必要権限、送信ロック状態を追加。
- 管理に旧 `GoogleCredentialsManager` のGoogle/Gmail APIキー管理、OAuth/Refresh Token/送信元の状態表示をApps Script承認モデルへ読み替えて追加。
- 管理に旧 `SendWindowSettingsForm`, `GmailReplyCheckSettingsForm`, `EmailDiscoverySettingsForm`, `BackgroundWorkerSettingsForm` の自動運用設定を追加し、GAS版では `settings` シート、時間主導トリガー、`batch_runtime_budget_ms` に読み替えた。
- 管理に旧 `DuplicateLeadManager` の重複チェックUIを追加し、全営業リストをページ取得して会社名/メール/ドメイン一致を表示できるようにした。
- 管理に旧 `errors/page.tsx` のエラー詳細を追加し、GAS版では `sync_logs` の warn/error を表示するようにした。
- 営業リストに旧 `ListViewSettingsPanel` の開閉式「表示項目」UIを追加し、ジャンル別に列の表示/順番を `list_view_settings` シートへ保存できるようにした。
- 管理に旧 `CustomFieldDefinitionForm` のカスタム項目作成UIを追加し、`custom_field_definitions` シートへ保存できるようにした。
- リード詳細ドロワーに旧 `CustomFieldsInputs` 相当の入力欄を追加し、ジャンル別カスタム項目を `custom_fields_json` へ保存できるようにした。
- テンプレート画面に旧 `TemplateTagMenu` 相当の差し込みメニューを追加し、件名/本文へのタグ挿入、初回メール例、フォーム営業例、使用中タグ表示を追加した。
- 送信プレビューに差し込み後の本文だけでなく、使用タグごとの置換値プレビューを追加した。
- 旧 `AppFrame` の上部フレームに合わせ、運用ステータスバー、よく使う操作ショートカット、タブ切替進行バーを追加した。
- 旧 `BackgroundJobWidgets` 相当として、右下のジョブ通知スタック、進捗バー、閉じる操作、バックグラウンド進捗タブへの導線、全画面共通の戻るボタンを追加した。GAS版では `jobs` / `search_jobs` の現在値に読み替えて表示する。
- 旧 `ng-master` / `exclusions` / `background-jobs/activity` / `errors` のページ分割に合わせ、送信NG、除外ドメイン、直近実行結果、エラー詳細を独立タブとして追加した。
- 旧 `ProspectingCollectionTool` 系のタブ式操作に合わせ、営業リスト収集ツール内へ `0 自動運用`, `1 ジャンル×エリア`, `2 キーワード検索`, `3 ファイル収集`, `4 まとめサイトURL` の5モードパネルを追加した。GAS版では `settings`, `runSmallSearchJob`, `importLeadsFromCsv` に読み替えて実操作できるようにした。
- 管理に旧 `GenreManager` 相当のジャンル管理を追加し、追加、テーブル内編集、削除確認をUUID `id` 更新で操作できるようにした。GAS版では履歴整合性のため削除は `active=false` の安全な無効化に読み替える。
- 管理に旧 `ReasonMasterManager` 相当の選択肢管理を追加し、送信NG理由、失注理由、対応不要理由、辞退理由の追加、テーブル内編集、有効/無効切替を `reasons` シートへ保存できるようにした。
- リード詳細ドロワーに旧 `LeadEditForm` の「対応ステータス」セクションを追加し、自動ステータス説明、手動ステータス選択、フォーム対応、送信NG理由/メモ、商談ステータス、辞退理由を同じ流れで編集できるようにした。
- リード詳細ドロワーのカレンダー枠を旧 `MeetingScheduleForm` に寄せ、開始/終了日時、場所、商談メモ、Google Calendar登録ボタン、Meetリンク表示の構成へ変更した。
- リード詳細ドロワーに旧 `QuickLeadEditButton` の送信履歴セクションを追加し、ダイアログ内で送信日時、送信種別、件名、成功/失敗、本文詳細を確認できるようにした。
- リード詳細ドロワーに旧 `QuickLeadEditButton` のフォーム送信履歴セクションを追加し、`custom_fields_json` の `form_send_events`, `last_form_sent_at`, `form_send_count`, `last_form_body` から最新送信、状態、本文プレビュー、本文コピーを表示できるようにした。
- リード詳細ドロワー下部に旧 `QuickLeadEditButton` の危険操作セクションを追加し、除外ドメイン登録して営業対象から外す操作、営業先削除確認を同じ流れで実行できるようにした。

## GAS版へ反映した機能

- `listLeads()` に旧アプリのリストフィルタを移植: `email`, `form`, `excluded`, `send_ng`, `review`, `unsent`, `sent`, `reply`, `deal`, `no_contact`, `won`, `lost`。
- `listLeads()` に `genre`, `formStatus`, `sort` を追加。
- `listLeads()` の戻り値に `stats` と `filteredStats` を追加し、UI側のKPI表示に利用。
- `getDashboardStats()` にメール送信枠、Gmail残数、Serper日次/月次残数、検索ジョブ数、連携状態、今月指標を追加。
- 空文字を真扱いしていた `normalizeBooleanLike_()` を修正し、返信数や送信NG数の集計が過剰にならないようにした。
- GAS版で安全に実行できる範囲として、表示中リードの複数選択、確認待ち選択、選択リードのステータス更新、表示中リードCSV出力、個別公式サイト探索の導線を追加。
- `custom_field_definitions` と `list_view_settings` をSheets DBへ追加し、旧Supabase版のカスタム項目/表示項目設定をUUID付き行として保持。
- `genres` / `reasons` に管理画面からの追加・更新・無効化APIを追加し、旧アプリのマスター管理操作をSheets DB上で再現。
- リード保存時に `form_status`, `send_ng_reason`, `send_ng_memo`, `decline_reason` も更新できるようにし、旧アプリの詳細編集で扱っていたステータス補足情報をSheets DBへ反映。
- `listLeadSendHistories()` を追加し、旧 `/api/leads/[id]/send-histories` 相当としてリード単位の送信履歴を新しい順に取得できるようにした。
- `Email.gs` のテンプレート置換を日本語タグとカスタム項目に対応させ、`{{会社名}}`, `{{担当者名}}`, `{{WEBサイトURL}}`, `{{差出人名}}`, `{{カスタム項目キー}}` を送信時にも置換できるようにした。

## そのまま移植しないもの

- Supabase、Vercel、Cron、Next.jsルーティング、React Server Components、RLS、PostgreSQL固有の高速検索。
- 旧アプリの重いバックグラウンドワーカーAPIは、GASの6分制限に合わせて `search_jobs` と `advanceQueuedJobs()` の進捗表示へ読み替える。
- Gmail API OAuthの詳細管理画面は、現行MVPではApps Scriptの `MailApp` / `GmailApp` 承認モデルを正とする。

## 次に移す候補

- 検索結果レビューから営業リストへ新規追加する確定フロー。
- Gmail連携での実テストメール送信履歴と失敗理由の詳細表示。
- 送信プレビューの差し込み値に、空欄タグだけを強調する差分ハイライト。
