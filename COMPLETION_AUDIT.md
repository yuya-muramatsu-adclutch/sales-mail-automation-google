# 完成監査メモ

最終更新: 2026-06-16

## デプロイ

- Script ID: `1IPcbftgkafJCBKkoIDnSBjw4fnQoOdXR8I0KjpUCLsq4MYp_7olPOk76`
- Web app v6: `https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec`
- Spreadsheet DB: `https://docs.google.com/spreadsheets/d/1IuJrWB7RGd2qIFDlhe5lfKaBnmUKN4RcnxdFFTuluZY/edit`
- Code version: `20260616_apps_script_full_workflow_v6`

## 計画書との対応

| 項目 | 状態 | 根拠 |
| --- | --- | --- |
| Google Sheets DB | 完了 | `setup()` で `Auto Sales List App DB` を作成済み |
| 主要タブ作成 | 完了 | 17タブ作成済み |
| Apps Script HTML Service画面 | 完了 | v6 Web app GETでHTML返却を確認済み |
| カスタムメニュー | 完了 | `onOpen()` / `showSidebar()` 実装済み |
| `leads` CRUD | 完了 | v6 `doPost` で作成・更新・検索・物理削除を確認済み |
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
| ダッシュボード | 完了 | 集計表示、CacheService、`dashboard_cache` 実装済み |
| CSVインポート | 完了 | 運用UIと `importLeadsFromCsv()` 実装済み |
| バッチ再開 | 完了 | `search_jobs` の `processed_count` と `advanceQueuedJobs()` 実装済み |
| Driveバックアップ | 完了 | `createSpreadsheetBackup()` 実装済み |
| `doPost` API | 完了 | v6でリード、テンプレート、マスター、検索、運用系アクションを公開 |

## 検証済み

- `clasp push -f` 成功
- `clasp deploy -d apps-script-full-workflow-v6-ui-actions-api` 成功
- `.gs` 全ファイルのNode構文チェック成功
- `node scripts/smoke-test.js` 成功
- `appsscript.json` JSON parse成功
- v6 Web app認証付きGETでHTML返却成功
- v6 Web app HTMLにメール送信UIとカレンダー登録UIが含まれることを確認
- v6 `doPost getInitialData` が `20260616_apps_script_full_workflow_v6` を返すことを確認
- v6 `doPost` のテンプレート/NG/除外/履歴読み取りAPI成功
- v6 `doPost` のリード作成・更新・検索・物理削除成功
- CRUDスモーク用一時リードは削除後0件であることを確認

## 運用時に確認する外部依存

- Serper実検索は、実APIキーを保存後に `testSerperApiKey()` と小規模ジョブで確認する。
- 実メール送信は、送信先・テンプレート・Gmail上限を確認してから1件で確認する。
- 実カレンダー登録は、テスト商談日時で1件作成して確認する。
- `clasp run` / `clasp logs` はGCP project / Apps Script Execution API設定に依存するため、現状の運用確認はWeb appとApps Script editorを正とする。
