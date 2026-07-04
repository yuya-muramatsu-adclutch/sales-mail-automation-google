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
- Web app deployment v11: `https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec`
- Spreadsheet DB: `https://docs.google.com/spreadsheets/d/1IuJrWB7RGd2qIFDlhe5lfKaBnmUKN4RcnxdFFTuluZY/edit`

初回はGoogleのOAuth承認が必要です。Web app URLを開くと承認リンクが表示されます。Apps Script editorを開いて `setup()` を手動実行して承認することもできます。承認後はWeb app URLまたはサイドバーから画面を利用できます。

## 初回承認後の確認結果

2026-06-16 01:12 JST時点で、Web appの初回承認後に `Auto Sales List App DB` が作成されていることを確認済みです。

- DB Spreadsheet ID: `1IuJrWB7RGd2qIFDlhe5lfKaBnmUKN4RcnxdFFTuluZY`
- 作成済みタブ: `leads`, `send_histories`, `email_templates`, `ng_masters`, `excluded_domains`, `genres`, `reasons`, `search_jobs`, `search_results`, `search_usage_logs`, `domain_cache`, `reply_logs`, `sync_logs`, `jobs`, `settings`, `dashboard_cache`, `raw_import`
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
- `app/page.tsx` / `components/LeadQuickViews.tsx` / `components/ListSearchFilters.tsx` / `components/LeadStatusLegend.tsx` / `app/forms/page.tsx` / `app/prospecting/page.tsx`: ダッシュボード、クイックビュー、フォーム送信、Serper収集画面の情報設計

持ち込まないもの:

- Supabase / Vercel / Next.js / GitHub Actions 依存
- RLS、PostgreSQLインデックス、生成列などSheetsに不要な実装
- Vercel用の短いバックグラウンド実行予算
