# 旧 sales-mail-automation 反映分析

最終更新: 2026-07-04

参照元: `/Users/muramatsuyuuya/Documents/自動営業システム`

## 分析した主要ファイル

- `app/globals.css`: 色、余白、パネル、テーブル、サイドバー、ダッシュボード、営業リスト、収集ツールのスタイル
- `components/AppFrame.tsx`: サイドバー、ナビグループ、ブランド表現、上部ショートカット
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
- `components/ProspectingActivityPanel.tsx`, `components/ProspectingCollectionTool.tsx`: 営業リスト収集ツールの指標、収集ルート、実行カード
- `app/background-jobs/page.tsx`, `app/sync/page.tsx`, `app/admin/page.tsx`, `app/histories/page.tsx`: 運用、ジョブ、同期ログ、送信履歴、管理系の見せ方
- `app/email-leads/page.tsx`, `app/sending/page.tsx`, `app/deals/page.tsx`, `app/analytics/page.tsx`, `app/integrations/gmail/page.tsx`: メール送信リスト、送信プレビュー、商談、分析、Gmail連携の見せ方
- `components/EmailPreviewPanel.tsx`: テンプレート/営業先選択、差し込み後の件名・本文、送信不可理由、対象リスト自動送信の見せ方
- `components/TemplateTestRecipientManager.tsx`: テスト送信先の現在値、営業リストからの宛先選択、保存導線
- `components/JobResultsReviewTable.tsx`: 検索ジョブ結果のカテゴリ別レビュー、確認済み操作、メール/フォーム/URLの根拠表示
- `components/GmailConnectionCheck.tsx`, `components/GoogleCredentialsManager.tsx`, `components/MailSendLockPanel.tsx`: Gmail連携テスト、Google認証状態、送信ロック、本番前チェックの見せ方
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

## GAS版へ反映した機能

- `listLeads()` に旧アプリのリストフィルタを移植: `email`, `form`, `excluded`, `send_ng`, `review`, `unsent`, `sent`, `reply`, `deal`, `no_contact`, `won`, `lost`。
- `listLeads()` に `genre`, `formStatus`, `sort` を追加。
- `listLeads()` の戻り値に `stats` と `filteredStats` を追加し、UI側のKPI表示に利用。
- `getDashboardStats()` にメール送信枠、Gmail残数、Serper日次/月次残数、検索ジョブ数、連携状態、今月指標を追加。
- 空文字を真扱いしていた `normalizeBooleanLike_()` を修正し、返信数や送信NG数の集計が過剰にならないようにした。
- GAS版で安全に実行できる範囲として、表示中リードの複数選択、確認待ち選択、選択リードのステータス更新、表示中リードCSV出力、個別公式サイト探索の導線を追加。

## そのまま移植しないもの

- Supabase、Vercel、Cron、Next.jsルーティング、React Server Components、RLS、PostgreSQL固有の高速検索。
- 旧アプリの重いバックグラウンドワーカーUIは、GASの6分制限に合わせて `search_jobs` と `advanceQueuedJobs()` の進捗表示へ読み替える。
- Gmail API OAuthの詳細管理画面は、現行MVPではApps Scriptの `MailApp` / `GmailApp` 承認モデルを正とする。

## 次に移す候補

- 旧アプリのメール本文プレビューで使っているテンプレート変数の詳細説明と差分ハイライト。
- 検索結果レビューから営業リストへ新規追加する確定フロー。
- Gmail連携での実テストメール送信履歴と失敗理由の詳細表示。
