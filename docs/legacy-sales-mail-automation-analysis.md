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
- `lib/page-data.ts`, `lib/analytics.ts`, `lib/lead-status.ts`: ダッシュボード指標、ステータス、営業リスト絞り込みの考え方

## GAS版へ反映したUI

- 旧アプリの濃紺サイドバー、白パネル、8px角丸、薄いグレー背景、業務向けテーブル密度を `Index.html` へ反映。
- ダッシュボードを旧アプリの情報設計に寄せ、今日の送信キュー、API連携、重要指標、次の作業、今月の動き、運用サマリーを追加。
- 営業リストにジャンルバー、検索/ビュー/ステータス/ジャンル/並び替え、クイックビュー、リスト件数バー、KPIグリッド、色分け凡例を追加。
- フォーム送信リストを新規タブとして追加し、フォーム対象の一覧、本文プレビュー、コピー、対応状態更新を追加。
- Serper検索タブにAPI設定、日次/月次残量、検索ジョブ状況の概要カードを追加。

## GAS版へ反映した機能

- `listLeads()` に旧アプリのリストフィルタを移植: `email`, `form`, `excluded`, `send_ng`, `review`, `unsent`, `sent`, `reply`, `deal`, `no_contact`, `won`, `lost`。
- `listLeads()` に `genre`, `formStatus`, `sort` を追加。
- `listLeads()` の戻り値に `stats` と `filteredStats` を追加し、UI側のKPI表示に利用。
- `getDashboardStats()` にメール送信枠、Gmail残数、Serper日次/月次残数、検索ジョブ数、連携状態、今月指標を追加。
- 空文字を真扱いしていた `normalizeBooleanLike_()` を修正し、返信数や送信NG数の集計が過剰にならないようにした。

## そのまま移植しないもの

- Supabase、Vercel、Cron、Next.jsルーティング、React Server Components、RLS、PostgreSQL固有の高速検索。
- 旧アプリの重いバックグラウンドワーカーUIは、GASの6分制限に合わせて `search_jobs` と `advanceQueuedJobs()` の進捗表示へ読み替える。
- Gmail API OAuthの詳細管理画面は、現行MVPではApps Scriptの `MailApp` / `GmailApp` 承認モデルを正とする。

## 次に移す候補

- 旧アプリのバルク操作バーに近い、複数リード選択と一括ステータス更新。
- フォーム送信リストの送信日時/送信回数カウント。
- 検索ジョブ結果レビュー画面。
- テンプレート本番化の安全チェック表示。
