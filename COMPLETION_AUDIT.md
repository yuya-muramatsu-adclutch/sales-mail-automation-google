# 完成監査メモ

最終更新: 2026-07-19

## デプロイ

- Script ID: `1IPcbftgkafJCBKkoIDnSBjw4fnQoOdXR8I0KjpUCLsq4MYp_7olPOk76`
- Web app @251 / production code v250: `https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec`
- Spreadsheet DB: `https://docs.google.com/spreadsheets/d/1IuJrWB7RGd2qIFDlhe5lfKaBnmUKN4RcnxdFFTuluZY/edit`
- Apps Script HEAD / repository code: `20260719_apps_script_full_workflow_v250_serper_usage_projection`

## v250 Serper使用量集計の一回・必要列取得

- Serper管理情報の表示で、今日と今月の使用量を計算するたびに `search_usage_logs` 全列を2回読む処理を廃止した。
- 管理情報では作成日時・credits・request_countの3列を1回だけ読み、同じ配列から日次・月次を集計する。
- 他の呼出元が単独で使用量を集計する場合も、作成日時・営業先ID・credits・request_countの4列だけを取得する。
- 日付・月・営業先IDの絞り込み、credits優先・request_countフォールバック・1件フォールバックの集計条件は変更しない。
- 1,002件の履歴で集計値を維持すること、フォールバック読取の列と回数、管理情報が同じ配列を日次・月次へ渡すことを回帰テストした。
- `Index.html` 内JavaScript構文確認、`node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 251を固定Web app URLへ再デプロイ済み。
- `clasp deployments` で固定デプロイが `@251` であることを確認した。Serper APIの実検索や使用量ログ追加は検証中に実行していない。

## v249 ダッシュボードキャッシュの完全一致取得

- ダッシュボードの永続キャッシュを読むたびに `dashboard_cache` 全行・全列を転送せず、`dashboard_stats_v5` の完全一致行だけを取得する。
- 通常読取は集計JSON・期限・新旧判定に必要な5列だけを読み、他のキャッシュキーに保存された大きな集計JSONを読み込まない。
- 更新時の既存確認は現行v5と旧v4のキーだけを対象にし、ID・キー・作成日時・更新日時の4列だけを読む。
- 最新v5行の優先、期限切れ除外、旧v4行への更新フォールバック、10秒の書込ロック、CacheServiceとの二段キャッシュは維持する。
- 複数v5行から最新値を復元すること、読取・書込の完全一致引数、最新v5行の更新を回帰テストした。
- `Index.html` 内JavaScript構文確認、`node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 250を固定Web app URLへ再デプロイ済み。
- `clasp deployments` で固定デプロイが `@250` であることを確認した。実データのキャッシュ再集計や営業データ変更は検証中に実行していない。

## v248 検索ドメインキャッシュの完全一致取得

- 1件のキャッシュキーを確認するたびに `domain_cache` 全行・全列を読まず、`cache_key` が完全一致する行だけを取得する。
- キャッシュ読取は復元・期限判定・優先順位に必要な10列、書込時の既存確認はID・キー・作成日時・更新日時の4列だけを読む。
- キャッシュ結果に含める `source_json` は維持し、該当キー以外の大きな検索結果JSONをApps Scriptへ転送しない。
- 期限切れ除外、最新更新行の優先、既存行更新と新規行追加、短時間ロックの動作は変更しない。
- 完全一致検索へ渡す列、複数一致時の最新行選択、書込ロック、既存ID更新を回帰テストした。
- `Index.html` 内JavaScript構文確認、`node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 249を固定Web app URLへ再デプロイ済み。
- `clasp deployments` で固定デプロイが `@249` であることを確認した。外部検索や実データのキャッシュ更新は検証中に実行していない。

## v247 まとめサイト収集の既存営業先索引を軽量化

- まとめサイト型のバックグラウンド収集は、既存営業先との重複索引作成で全列ではなく9列だけを読む。
- `source_payload_json`、カスタム項目、メモ、住所、メール、フォーム、状態詳細、商談情報を索引作成から除外した。
- 追加元ID、詳細URL、既存WEBサイトURL、正規化施設名の索引キーと、アーカイブ済み営業先の除外は維持する。
- 検索後に判明した公式URLを受け取っても照合に使っていなかった既存不具合を修正し、既存WEBサイトURLと一致する場合は重複として追加しない。
- 巨大JSONを含む全文データと9列データで索引キーと営業先IDが一致すること、追加元ID・詳細URL・公式URL・施設名の各照合、アーカイブ除外を回帰テストした。
- `Index.html` 内JavaScript構文確認、`node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 248を固定Web app URLへ再デプロイ済み。
- `clasp deployments` で固定デプロイが `@248` であることを確認した。外部サイトへの実収集は検証中に実行していない。

## v246 重複候補検索の軽量化

- 営業先の編集画面で実行する重複候補検索は、営業先全列ではなく判定・表示に必要な12列だけを読む。
- `source_payload_json`、カスタム項目、メモ、住所、送信NG詳細、商談詳細、Calendar情報を全件比較から除外した。
- メール一致、ドメイン一致、会社名＋ドメイン一致の判定、アーカイブ済み除外、送信回数が多い順の候補表示は変更しない。
- 連続列だけをRangeへまとめ、離れた状態・送信回数・アーカイブ列の間にある詳細列を巻き込まない。
- 巨大JSONを含む全文データと12列データで、候補件数・候補ID・重複理由・並び順が一致する回帰テストを追加した。
- `Index.html` 内JavaScript構文確認、`node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 247を固定Web app URLへ再デプロイ済み。
- `clasp deployments` で固定デプロイが `@247` であることを確認した。ログイン済み編集画面の体感速度は運用確認対象とする。

## v245 返信誤判定候補の安全性・軽量化

- 営業リスト軽量化後も復元時の競合確認を維持するため、返信誤判定候補だけ `last_gmail_thread_id` を追加取得する。
- 候補ページは状態内訳を使わないため `includeStats: false` とし、不要なNG・除外マスター取得と全件集計を行わない。
- 返信ログ8列すべてではなく、候補判定と表示に必要な6列だけを読む。IDとthread_idは一覧判定から除外した。
- 取得した返信ログのうち、現在の候補ページにない営業先はメモリ集計へ入れない。
- 自動返信だけの営業先を候補に残すこと、人間の返信がある営業先を除外すること、最新GmailスレッドIDが復元候補へ保持されることを回帰テストした。
- `Index.html` 内JavaScript構文確認、`node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 246を固定Web app URLへ再デプロイ済み。
- `clasp deployments` で固定デプロイが `@246` であることを確認した。Gmail実データを変更する復元操作は実行していない。

## v244 完全自動送信ジョブ開始判定の軽量化

- 10分ごとの完全自動送信は、重複実行防止の開始判定で `jobs` 全25列ではなく7列だけを読む。
- 候補結果、payload、cursor、検索内容、エラー本文など、開始判定に不要な大きな列を定期トリガーから除外した。
- 有効な実行中ジョブの再利用、10分以上止まったジョブの失敗終了、新規ジョブ開始の条件は変更しない。
- 連続列だけをRangeへまとめ、非選択のJSON列を広いRangeに巻き込まない。
- 有効ジョブ時に新規作成しないこと、停止ジョブだけを失敗へ更新して新規作成すること、取得列と巨大列の除外を回帰テストした。
- `Index.html` 内JavaScript構文確認、`node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 245を固定Web app URLへ再デプロイ済み。
- `clasp deployments` で固定デプロイが `@245` であることを確認した。実運用トリガー時間は継続観測対象とする。

## v243 営業リスト初期表示の軽量化

- 営業リストの通常取得は全列ではなく、検索・絞り込み・状態内訳・保存ビュー・CSV出力に必要な26列だけを読む。
- 巨大な `source_payload_json`、送信NG詳細、商談詳細、Calendar・Meet情報などを一覧の初期表示から除外した。
- カスタム項目、メモ、住所は保存ビュー・検索・CSVとの互換性を保つため一覧の基本列に残した。
- メール・フォーム・商談・重複チェックは、共通列に画面固有の必要列だけを追加する。未許可の列名は無視し、任意列取得にはしない。
- 編集画面は一覧の部分データを使わず、選択したIDの最新完全レコードを取得してから開く。連続クリックや閉じた後の遅延応答も表示しない。
- 手動メール候補一覧も同じ軽量取得へ切り替え、収集元JSONをメールプレビュー画面へ転送しない。
- 選択列の間にある巨大列を巻き込まないよう、営業リストでは連続列だけをRangeにまとめる。
- 軽量列、追加列の許可、検索・並び順、巨大列の非返却、画面別追加列、完全詳細取得を回帰テストした。
- `Index.html` 内JavaScript構文確認、`node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 244を固定Web app URLへ再デプロイ済み。
- `clasp deployments` で固定デプロイが `@244` であることを確認した。匿名HTTP確認はGoogle認証境界で到達できないため、ログイン済み画面の体感速度は運用確認対象とする。

## v242 完全自動送信の候補抽出軽量化

- 完全自動送信の候補計画は営業先45列すべてではなく、対象判定・テンプレート振分・並び順に必要な17列だけを読む。
- 大きなJSON、メモ、住所、施設名、フォーム進捗など候補選定で未使用の項目を、10分ごとの自動送信トリガーから除外した。
- 選択列は小さな間隔をまとめた3つのRangeで取得し、セル転送量とSpreadsheet API呼出回数の両方を抑える。
- 送信対象・除外対象、同一メールアドレスの重複除外、更新日時順、ジャンル別ラウンドロビン、テンプレート別グループは従来どおり維持する。
- 実際のメール送信準備は選択された営業先IDから最新レコードを再取得し、ロック内で送信可否を再判定する既存の安全策を変更しない。
- 全文営業先と17列に射影した営業先で候補順・除外・グループが一致する回帰テストを追加した。
- `node scripts/smoke-test.js`、全Apps Script構文確認、`git diff --check`、`clasp push` が成功。Version 243を固定Web app URLへ再デプロイ済み。

## v241 ダッシュボード営業先データの軽量化

- ダッシュボード再集計は営業先45列すべてではなく、送信・フォーム・確認待ち・返信・商談・分析に必要な18列だけを返す。
- `custom_fields_json`、`source_payload_json`、メモ、住所、施設名など、集計に不要な大きな列を通常の画面更新から除外した。
- 選択列の間に1〜2列だけ挟まる場合は1つのRangeへまとめ、営業先データを3つのRangeで取得してSpreadsheet API呼出回数を抑える。
- Rangeには結合用の間隔列を含む場合があるが、返却レコードには指定18列だけを設定し、未指定項目を画面・キャッシュへ露出しない。
- 全状態内訳、送信可能数、フォーム対象、確認待ち、返信、送信NG、商談、月次・ジャンル分析が全文営業先と一致する回帰テストを追加した。
- `node scripts/smoke-test.js`、全Apps Script構文確認、`git diff --check`、`clasp push` が成功。Version 242を固定Web app URLへ再デプロイ済み。

## v240 完全自動送信・返信確認の履歴軽量化

- 完全自動送信の実行計画、日次上限、再送防止、送信中予約、配送結果復旧は、送信履歴19列ではなく必要な7列だけを読む。
- 送信成功後の営業先 `send_count` / `last_sent_at` 復旧は、全履歴を再読込せず、対象の営業先IDに一致する行と必要列だけを取得する。
- Gmail返信確認と誤検知診断も7列の軽量履歴で最新送信日時を構築し、本文・件名・エラー詳細を定期トリガーへ転送しない。
- リード詳細の送信履歴画面は本文表示を維持しつつ、全営業先の履歴ではなく対象IDに一致する行だけを全文取得する。
- 送信履歴インポートの重複確認はID列だけを読み、既存本文を全件転送しない。
- 選択列付きの完全一致検索を共通化し、該当行だけ・隣接列だけを読むこと、巨大本文の有無で安全判定が変わらないことを回帰テストで確認した。
- `node scripts/smoke-test.js`、全Apps Script構文確認、`git diff --check`、`clasp push` が成功。Version 241を固定Web app URLへ再デプロイ済み。

## v239 ダッシュボード送信履歴の軽量化

- ダッシュボード再集計で送信履歴19列すべてを読まず、送信数・予約・再送防止・分析に必要な10列だけを読む。
- 履歴本文、件名、エラー詳細、会社名、施設名、Gmail IDなど、日常の集計に不要な大きな列をSpreadsheet転送から除外した。
- テンプレート別分析の件名・本文プレビューは、同時に読み込んでいる現在のメールテンプレート定義から補完する。
- 送信成功数、失敗数、送信中予約、日次・月次件数、営業先の送信回数不整合、返信率・商談率の判定条件は変更しない。
- 大きな本文・エラー詳細を含む全文履歴と、10列に射影した軽量履歴で分析結果が完全一致する回帰テストを追加した。
- `node scripts/smoke-test.js`、全Apps Script構文確認、`git diff --check`、`clasp push` が成功。Version 240を固定Web app URLへ再デプロイ済み。

## v238 保存済みサイト調査状況の軽量化

- 保存済みURLの調査状況集計は、検索ジョブ全20列ではなく、URL照合・状態・進捗・エラー・日時に必要な14列だけを読む。
- 集計結果を5分間キャッシュし、収集画面を開き直しても大きなquery_jsonを繰り返し読み込まない。
- `search_jobs` またはURL設定を含む `settings` 更新時にキャッシュを自動破棄し、保存・進捗更新後の表示を古いままにしない。
- 画面の「更新」はキャッシュを明示的に無視し、最新の調査状態を取得する。
- 全件調査完了、過去完了後の再調査中、調査失敗、未実行をテストし、再調査中は現在のactive jobと進捗を優先することを確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 239を固定Web app URLへ再デプロイ済み。

## v237 ダッシュボード集計の必要列読込

- ダッシュボード再集計で `search_jobs` はstatus列だけ、`search_usage_logs` はcreated_at・credits・request_countだけを読む。
- `sync_logs` はlevelと追加・重複・除外件数の列だけを読み、message・stack・context_jsonなど大きな本文列を転送しない。
- 必要列が隣接している場合は1つのRangeへ結合し、セル数の削減でSpreadsheet API呼出回数が過度に増えないようにした。
- 欠けている旧互換列は無視し、存在する列だけで従来のフォールバック集計を維持する。
- 非選択のクエリ本文を取得しないこと、隣接3列を1Rangeにまとめること、日次・月次の検索利用数が従来と一致することを回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 238を固定Web app URLへ再デプロイ済み。

## v236 実行中ジョブだけを読む軽量化

- `search_jobs` / `jobs` のステータス列を完全一致検索し、queued・running・preparingの該当行だけを読み込む共通関数を追加した。
- バックグラウンド進行、停止検索ジョブ復旧、CSV準備停止復旧、重複ジョブ防止、状態確認、キャンプジャンル修復を軽量読込へ統一した。
- 完了・失敗済み履歴は、バックグラウンド処理のたびに全列転送しない。履歴自体は削除せず保持する。
- 状態列の検索後に実行対象行を再確認するため、同時更新やTextFinderの誤一致を処理対象へ含めない。
- queued／runningだけを取得すること、指定値の重複排除、該当行以外の全列を読まないこと、バックグラウンド処理コードに全履歴読込が残らないことを回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 237を固定Web app URLへ再デプロイ済み。

## v235 保存容量の安全な可視化

- 管理画面の「ログ / メンテナンス」を開いた時だけ、検索結果、検索利用履歴、同期ログ、検索／取込ジョブ、CSV取込一時行の行数を取得する。
- 通常起動時には保存容量を読まず、10分キャッシュを使うことで管理画面の連続表示によるSpreadsheetアクセスを抑える。
- シート全件を読み込まず `getLastRow()` だけで判定し、注意・要整理の目安を画面へ表示する。
- 営業先、送信履歴、返信履歴は自動削除しない保護対象として表示し、再送防止・返信・商談の証跡を維持する。
- この機能から既存データの削除は行わない。整理が必要な場合も、Driveバックアップと保持期間の合意を先に求める。
- 閾値判定、キャッシュ時のSpreadsheet再読込なし、保護対象3シート、遅延読込UIを回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 236を固定Web app URLへ再デプロイ済み。

## v234 書込後の不要なSpreadsheet再読込削減

- 共通の1件追加処理は、書込前に全ヘッダーへ展開した保存レコードを返し、追加直後のID再検索を廃止する。
- 共通の1件更新処理は、ロック内で読み込んだ既存行へ更新値を反映したレコードを返し、書込後の同一ID再検索を廃止する。
- 行検索結果へ取得済みヘッダーを保持し、営業先更新・削除・フォーム送信状態・メール送信後更新で同じヘッダー行を再取得しない。
- フォーム送信済み／取消は、書込後に `getLeadById` で全件検索せず、保存した最新レコードをそのまま画面へ返す。
- 書込前の行再確認・Script Lock・キャッシュ無効化は維持し、古い画面データによる上書き防止と次リクエストの鮮度を保つ。
- 追加後のID検索0回、更新時の行検索1回、更新時のヘッダー再取得0回、返却レコードと実書込行の一致を回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 235を固定Web app URLへ再デプロイ済み。

## v233 アプリ全体の短時間ロック方針

- Script Lockの共通既定を30秒×1回から6秒×最大5回へ変更し、設定保存・マスター更新などオプション未指定の処理も一時競合から自動回復する。
- 営業先編集、検索API設定、メール送信準備、テスト送信予約・確定、完全自動送信ジョブ管理の長時間単発待機を短時間再試行へ統一する。
- Gmail返信反映・誤検知復旧、Calendar予約・確定・取消、CSV取込、停止ジョブ回収、データ移行も同じ方針へ変更する。
- メール配送・Calendar API呼び出しは引き続きロック外で行い、予約保存前のメール送信禁止、Calendar確定失敗時のイベント削除を維持する。
- CSV準備は既存の500行単位、検索結果確認は25件単位の分割を維持し、1回のロックで大量処理を抱えない。
- 明示的な90秒待機が全Apps Scriptコードから消えていること、共通既定の競合再試行、メール・CSV・返信・移行のロック設定を回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 234を固定Web app URLへ再デプロイ済み。

## v232 検索・補完処理の短時間ロック分割

- 検索結果の一括確認を最大500件の単一ロックから25件単位へ分割し、各まとまりの完了後にScript Lockを解放する。
- 検索結果追加、検索ジョブ開始・所有権更新、連絡先補完、ドメインキャッシュ、検索API設定保存の90秒単発待機を6秒×最大5回の短時間再試行へ変更する。
- 1回の長時間待機でApps Script実行時間を消費せず、確認操作とバックグラウンド検索が互いに長時間停止させる状態を軽減する。
- 一括確認は各レコードの現在状態をロック取得後に再読込し、すでに確認済み・追加中・除外済みの状態を上書きしない。
- 26件の一括確認が2ロックへ分割されること、短時間再試行設定、確認済み再実行、競合保持を回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 233を固定Web app URLへ再デプロイ済み。

## v231 同一URLの重複登録防止

- 新規営業先の重複判定候補へ公式サイト／フォームのドメインを追加し、施設名の表記が違っても同一URLなら登録を止める。
- URL比較では `http/https`、`www`、末尾スラッシュ、フラグメント、UTM・広告クリックID等の計測パラメータ差を吸収する。
- URLの実パスと業務上必要なクエリは残し、同一ドメイン配下の別施設や、同じフォームサービス上の別フォームIDを誤って重複扱いしない。
- 既存のメール一致、追加元ID一致、会社名＋ドメイン一致の判定は維持する。
- サイト収集の事前インデックスにも同じURL正規化を使い、作成直前と作成処理の二段階で判定基準をそろえる。
- 表記差を含む同一公式URL、共有ドメインの別施設、同一フォーム、別フォームIDを回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 232を固定Web app URLへ再デプロイ済み。

## v230 公式サイト内の連絡先探索強化

- 問い合わせページに加え、同一公式ドメインの会社概要・運営会社・施設概要も優先候補にし、トップページから最大4ページまで限定巡回する。
- 高優先ページが一時的に取得失敗しても残りの候補を継続し、1ページの障害で連絡先探索全体を終了しない。
- Cloudflareの `data-cfemail`、`data-user` / `data-domain` 属性、URLエンコードされた `mailto:` を復号して有効なメールだけ採用する。
- Microsoft Forms、フォームメーラー、formOK、HubSpot共有フォームを既知の外部問い合わせフォームとして追加する。
- 問い合わせフォーム判定をフォーム単位に限定し、サイト内検索・メルマガ・ログイン・予約フォームを誤登録しない。
- 会社概要の補助巡回は公式サイトと同一ドメインだけに限定し、無関係な外部会社ページへの探索拡大を防止する。
- 途中取得失敗からの継続、難読化メール、外部フォーム、ニュースレター誤検出防止、外部弱候補の除外、4ページ上限を決定論的HTMLで回帰確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 231を固定Web app URLへ再デプロイ済み。
- 実サイトへの外部取得と実メール送信は検証時に行っていない。

## v229 SearXNG・Serper検索フェイルオーバー

- SearXNGが正常応答でも検索結果0件の場合、Serper予備キーが利用可能なときだけ追加検索し、連絡先・公式サイトの未検出を削減。
- SearXNGで1件以上取得できた場合はSerperを呼ばず、不要なAPIクレジット消費を防止。
- Serper補完が一時障害で失敗しても、正常だったSearXNGの0件結果を維持し、検索ジョブ全体を不必要に停止しない。
- 公式サイト補完の開始条件を「Serperキーあり」から「SearXNGまたはSerperが利用可能」へ変更し、SearXNGだけの構成でも補完を実行。
- SearXNGで公式URLを補完した場合は `source_page_searxng`／「PC検索で公式URLを補完」と記録し、Serper利用と区別して可視化。
- SearXNG設定値が壊れていてもSerperが利用可能なら予備検索へ進み、一方の設定不備で全検索を停止しない。
- HTTP 400/401/403/404など恒久エラーを再試行不可、408/425/429・5xx・接続失敗を再試行可能として型付き判定し、設定不備による無限再試行を防止。
- 非空SearXNG優先、0件Serper補完、補完失敗時の0件維持、単独SearXNG構成、恒久/一時エラー分類、全プロバイダー未設定を回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 230を固定Web app URLへ再デプロイ済み。

## v228 メール送信結果の自動復旧と可視化

- メール送信APIの結果が確定した直後、送信履歴とは別のScript Propertiesへ予約ID・成功/失敗・送信時刻を一時保存。
- 履歴や営業先更新がロック競合・一時エラーで失敗しても一時記録を残し、次回の完全自動送信が送信履歴と営業先の送信回数・最終送信日時を自動復旧。
- 通常の履歴確定ロックを90秒1回待機から6秒×最大5回の短時間再試行へ変更し、画面操作・収集処理との長時間競合を回避。
- 復旧時の送信回数は成功履歴から再計算するため、同じ一時記録を複数回処理しても加算されず、返信・商談など送信後の状態も上書きしない。
- 履歴と営業先の更新が両方完了した場合だけ一時記録を削除し、復旧失敗時は次回のため保持。
- 完全自動送信の対象計画を作る前に最大20件を復旧し、復旧後の履歴で日次上限と対象を再計算。
- 自動送信の戻り値とジョブ完了メッセージに履歴復旧件数を含め、復旧が動いたことを進捗画面から確認可能にした。
- ダッシュボードの本日残数も「成功数＋送信予約数」を差し引き、実際の送信判定と一致させた。
- 成功・失敗結果の復旧、送信回数の再計算、返信状態の保護、復旧失敗時の保持、通常送信時の一時記録削除を回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 229を固定Web app URLへ再デプロイ済み。

## v226 バックグラウンドワーカーの二重起動防止

- 時間トリガーと手動再開が重なっても、ワーカー全体の短時間所有権を最初に取得し、2本目はジョブ・移行・集計を一切開始せず安全に待機。
- 所有権の取得・解放時だけScript Lockを使い、実処理中は長時間ロックを保持しないため、確認操作や設定保存への影響を抑制。
- 実行時間に90秒の余裕を加えた有効期限を設定し、Apps Scriptの異常終了で所有権が残っても次回実行が自動回収。
- 正常終了だけでなくトップレベル例外でも `finally` で所有権を解放し、ワーカー状態を `failed` に更新して「実行中」の残留を防止。
- ヘルス情報へ実行元・開始・期限・期限切れ状態を追加し、所有権トークンは画面/APIへ返さない。
- 手動の全体修復で事前の重複回収処理を行わず、所有権取得後のワーカー内に一本化。
- 通常完了、重複起動の即時スキップ、例外時の解放、期限切れ回収、誤トークンによる解放拒否、ヘルス情報の秘匿を回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 227を固定Web app URLへ再デプロイ済み。

## v225 参照データAPIのキャッシュ化

- 起動後に読むジャンル・理由・設定・カスタム項目・表示設定・全シート構成・検索設定を、コードバージョン単位で10分キャッシュ。
- ジャンルを有効分と全件で2回読んでいた処理を1回へ統合し、有効ジャンルをメモリ上で抽出。
- スキーマ確認へ取得済み設定を渡し、`settings` シートの重複読み取りを削減。
- 営業リストや送信履歴の更新では参照キャッシュを維持し、ジャンル・理由・設定・カスタム項目・表示設定の変更時だけ即時無効化。
- Serperキー、残量、PC検索設定、接続状態の変更でも参照キャッシュを無効化し、管理画面へ古い設定を残さない。
- 2回目のAPI呼び出しでシート・スキーマを再読込しないこと、関連変更だけで無効化されること、明示再取得が機能することを回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 226を固定Web app URLへ再デプロイ済み。

## v224 起動時データ移行のバックグラウンド化

- `getInitialData()` が画面を開くたびに実行していたv215品質移行を廃止し、Script Propertiesの完了状態だけを返す軽量処理へ変更。
- 品質移行は最大2万行の確認と最大2,000件の更新を行い得るため、通常起動・画面更新から切り離して起動待ちとロック競合を防止。
- 10分間隔の自動メール処理からも移行を除去し、送信停止中・送信時間外の判定を移行処理より先に実行できる構成へ修正。
- 未完了の移行だけを既存 `advanceQueuedJobs` で実行し、残り実行時間が150秒未満なら安全に次回へ延期。
- 移行完了キーを `PROPERTY_KEYS` へ集約し、起動API・バックグラウンド処理が同じ状態を参照。
- 起動APIとメールトリガーに移行実行が残っていないこと、150秒の実行時間予約、完了状態の読み取りを回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 225を固定Web app URLへ再デプロイ済み。

## v223 ダッシュボード集計のバックグラウンド化

- 通常の起動後更新は `cacheOnly=true` で保存済み集計だけを取得し、キャッシュ失効時にも画面操作から営業リスト全件集計を開始しない。
- `dashboard_cache` 以外の業務データが更新されたときは、Script Propertiesへ再集計が必要な時刻だけを記録する。
- 既存の10分間隔 `advanceQueuedJobs` が、処理時間を90秒以上確保できる場合だけ、未作成・変更後・30分経過のダッシュボード集計を更新する。
- 全件集計中は長時間のScript Lockを保持せず、保存時の短いロックだけを使うため、確認操作や収集処理との競合を増やさない。
- 有効期限内の永続キャッシュも通常取得で再利用し、CacheServiceの10分キャッシュが消えた直後の不要な全件再集計を防止。
- キャッシュ専用取得がシート全件を読まないこと、変更・更新・期限切れ判定、実行時間予約を回帰テストで確認。
- `node scripts/smoke-test.js`、`git diff --check`、`clasp push` が成功。Version 224を固定Web app URLへ再デプロイ済み。
- 未認証HTTP取得はGoogleログインへ遷移するため、認証済み画面の体感速度と次回トリガー後の更新時刻確認は未実施。

## v222 確認待ちの初期表示軽量化

- 起動直後の確認待ち表示では、一覧画面用の全件内訳・ジャンル内訳を計算せず、確認待ち件数と先頭50件だけを取得する。
- 「一括操作」で営業リストへ移動するときだけ、従来どおり全体内訳を含む一覧を取得するため、一覧の絞り込み・内訳表示は維持。
- 確認受信トレイ、確認済み・送信NG・対応不要、編集、連続確認は軽量取得したデータで従来どおり動作する。
- 初期表示が `includeStats=false`、一括操作が通常集計付き取得を使うことを回帰テストで固定。
- `node scripts/smoke-test.js` と `git diff --check` が成功。Version 223を固定Web app URLへ再デプロイ済み。

## v221 画面別更新と一覧APIの軽量化

- 初回起動以外の全体更新で、表示中画面に関係なく営業リストを取得していた経路を廃止。
- ダッシュボードでは一覧取得を行わず、営業リスト・確認待ち・その他画面は現在の画面に必要なデータだけ再取得する。
- 起動後のダッシュボード再集計は、初期キャッシュがない場合だけ強制実行。キャッシュがある通常起動では不要な全件再集計を避ける。
- メール対象、フォーム対象、商談、重複チェックの一覧取得で `includeStats=false` を使用し、利用していなかった全体集計・絞り込み集計を省略。
- 集計不要かつ判定マスターを使わない一覧では、送信NG・除外マスターの構築も省略。
- 軽量取得では集計関数が0回、通常の営業リスト取得では従来どおり2回実行されるモック回帰テストを追加。
- `node scripts/smoke-test.js` と `git diff --check` が成功。Version 222を固定Web app URLへ再デプロイ済み。

## v220 業務フローナビゲーションと画面更新の軽量化

- 常時表示メニューを `今日 → 収集 → 確認 → 送信 → 成果` の5段階に整理し、一覧・履歴・設定・管理は2つの補助メニューへ集約。
- 確認待ち数と送信可能数を主要メニューに表示し、現在画面だけ `aria-current="page"` で示す。
- 補助メニューは現在画面を含むものだけ開き、複数グループが開き続けてサイドバーが長くなる状態を解消。
- グローバル通知をライブリージョン化し、OSのモーション軽減設定に対応。
- DOM更新後の共通UI補正を、画面全体の再走査から追加された要素だけの処理へ変更。大量更新時だけ安全な全体フォールバックを使う。
- `node scripts/smoke-test.js` と `git diff --check` が成功。Version 221を固定Web app URLへ再デプロイ済み。
- 未認証環境ではGoogleログインへリダイレクトされるため、最終的な折り返し・ホバー・フォーカス・スマホ幅は認証済みChromeでの目視確認を残す。

## v201 連絡先誤検知の追加防止（HEAD反映済み・本番反映待ち）

- フォーム検索では過去キャッシュをそのまま採用せず、実ページでフォーム要素を確認する。
- メールだけ取得できた場合に、参照ページをフォームURLとして誤登録しない。
- 実サイト `sanukimannopark.jp/camp/guide` が検索フォームしか持たないことを確認し、問い合わせフォーム扱いしない回帰テストを追加。
- Apps Script HEADではv201を確認済み。本番版作成時に200版上限へ到達したため、固定Web appは@200のまま。

## v200 連絡手段なし候補の確認待ち除外

- WEBサイト・有効なメール・フォームがすべて空の候補は、確認待ち判定から除外。
- まとめサイト収集では、旧ジョブが未解決候補作成フラグを持っていても、公式サイト未特定ならリードを作成しないサーバー側の安全策を追加。
- 公式サイト探索で、なっぷ、camp-go、campla、campiii、はちのす、香川県観光DBなどの一覧サイトを公式サイト候補から除外。
- 連絡先探索をトップページだけでなく優先度付き問い合わせページまで最大3ページに拡張し、外部フォーム、埋め込みフォーム、主要フォームプラグイン、難読化メールに対応。
- 本番確認待ち5,513件のうち、WEBサイト・メール・フォームがすべて空だった1,898件を特定。
- Spreadsheetバックアップ `Auto Sales List App DB_backup_20260716_002721` を作成後、対象1,898件を `対応不要`（理由: `問い合わせ不可`）へ500件ずつ整理。
- 整理後の全行ドライランで対象0件、確認待ち3,615件、連絡手段なし0件を確認。

## v197 なっぷ収集のジャンル誤分類修正

- なっぷURL・`nap_camp`プリセット・リード作成直前の3段階で、ジャンルを既存マスターの `キャンプ` に固定。
- サイト収集画面の初期選択と「なっぷ全件をセット」を `キャンプ` に統一し、URL入力時にも自動補正。
- 本番ドライランで、なっぷ由来4,629件中1,140件が `介護` と判定されることを確認。
- Spreadsheetバックアップ `Auto Sales List App DB_backup_20260716_000425` を作成後、対象1,140件と実行中ジョブ1件だけを補正。
- 補正後の全行ドライランで誤分類0件、画像対象の `星の砂キャンプ場` が `キャンプ` になったことを確認。

## v196 確認操作のロック競合回復

- 確認待ちで連続操作しても保存APIを1件ずつ送るクライアントキューを追加し、数十〜数百件の同時実行を防止。
- 送信NG・確認済み・対応不要の保存は、短いロック待機を分割して再試行し、一時競合だけ画面側でも1回再送。
- まとめサイト収集はロック競合時に5秒で操作へ譲り、候補を失敗扱いせず同じカーソルから再開。
- ロック未取得時に `releaseLock()` を呼ばないよう共通ロック処理を修正。
- ローカル回帰テスト、Web app @196、コードバージョン、バックグラウンドトリガー1件・古いジョブ0件を確認。

## v195 バックグラウンド処理の自動復旧

- 15分以上更新されない実行中ジョブの古いロックを解除し、保存済みカーソルから自動再開。
- 同じ候補で3回連続して実行が中断された場合、その候補だけを退避して後続処理を継続。
- まとめサイト処理の一時エラー時に候補カーソルを保持し、先頭へ巻き戻らないよう改善。
- 進捗画面に「自動復旧して再開」を追加し、定期トリガーの修復と即時再開を一操作に統合。
- 10分間隔の分割実行に合わせて停止判定を調整し、3分経過時の誤警告を解消。

## v168 運用フロー改善

- 確認待ちを左リスト/右詳細の受信トレイ型へ変更。上下移動、承認、送信NGのキーボード操作と、承認後の自動移動を追加。
- 確認済み、対応不要、送信NG、一括ステータス更新に9秒間の取り消し操作を追加。
- 確認待ち画面へ `今日の作業` を追加し、確認数、送信可能数、エラー数と次の操作を1箇所へ集約。
- 上部へ共通タスクセンターを追加し、実行中ジョブ、失敗、確認待ち、送信前チェック、直近収集結果を遅延読み込みで表示。
- キーワード収集に保存プリセット、Serper検索数、最大候補、時間目安を追加。サイト収集にも対象数、1回処理数、Serper利用条件の概算を追加。
- 営業リストへ現在の検索、状態、ジャンル、並び順を保存・再適用できる保存ビューを追加。
- 送信プレビュー上部へ、今回送信、テンプレート、本日残り、確認待ち、送信NG、送信済み、返信/商談、重複メールの安全サマリーを追加。
- 管理画面へ設定検索を追加し、送信時間、Gmail、DB、マスター、ログなどの該当セクションだけを表示。
- ローディングをアクティブ画面単位に限定し、共通進捗表示と空パネルのスケルトン状態を追加。

## v165 共通デザイン・操作性改善

- よく使う `確認待ち` / `収集` / `営業リスト` / `進捗` / `フォーム` / `メール` を前面に残し、低頻度画面をサイドバーの `管理・その他` に収納。
- 全ページ上部へページ説明を追加し、タイトル、説明、主要操作の位置と余白を統一。
- 正常な連携・準備ステータスのPillを隠し、未設定、警告、エラー、件数だけを強調。
- 3個以上のテーブル行操作を主要操作1個とその他メニューへ自動整理。確認待ち100行、テンプレート5行で適用を確認。
- カード、テーブル、ボタン、Pill、進捗バー、空状態、モバイル幅の共通スタイルを整理。
- 本番画面で `Version v165`、確認待ち1,306件、管理画面、収集画面、テンプレート画面、390x844表示を確認。ブラウザ警告・エラーログは0件。

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
| 検索上限 | 完了 | Serper日次上限なし、月次/リード別の安全上限と実残量を確認 |
| Gmail送信上限 | 完了 | アプリ日次上限とMailApp残数を確認 |
| 返信チェック | 完了 | `checkRepliesForLeads()` と運用UI実装済み |
| Google Calendar登録 | 完了 | `createCalendarEventForLead()` とリード詳細UI実装済み |
| ダッシュボード | 完了 | 全5,441件対象の集計表示、CacheService、`dashboard_cache` 実装済み |
| CSVインポート | 完了 | 運用UIと `importLeadsFromCsv()` 実装済み |
| バッチ再開 | 完了 | `processed_count`、`cursor_json`、占有期限、`advanceQueuedJobs()` の共通実行期限でチャンク途中から再開 |
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
| テンプレート画面レイアウト改善 | 完了 | code v122で初期表示をテンプレート一覧中心に整理。作成/編集フォーム、差し込みメニュー、テンプレート例をアコーディオン化し、安全チェックカードの余白、列幅、長文折り返しも調整 |
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
| 営業リスト収集ツール簡素化 | 完了 | code v119で初期表示を収集管理画面に変更。よく使う「今すぐ収集」「自動運用」「まとめサイト」を主操作に絞り、キーワード検索/CSV取り込みは詳細アコーディオン内へ移動。既存の検索・自動運用・CSV・まとめサイト収集関数は維持 |
| 営業リスト収集ツール空パネル抑制 | 完了 | code v120で未実行時の自動収集進捗/結果一覧パネルを初期表示しないようにし、収集管理画面の下に大きな空白カードが残る状態を解消 |
| 営業リスト収集ツールアイコン崩れ修正 | 完了 | code v121で収集管理カード/概要カード/詳細アコーディオン内SVGにサイズ指定を追加し、概要アイコンが巨大化して画面下部に大きな余白を作る崩れを解消 |
| 営業リスト収集ツールStep式化 | 完了 | code v124で初期表示を準備/方法/条件/結果の4ステップ、地域から探す/自動収集/一覧ページの3主操作、結果サマリーに整理。収集状況、小規模検索ジョブ、検索結果、Serperキー、使用量ログは詳細アコーディオンへ移動し、地域検索フォームは検索語プレビューを入力に合わせて更新 |
| 営業リスト収集ツール集中表示化 | 完了 | code v125で初期表示を「今日やること」カード1枚に集約。ステップバー、状態カード、結果4指標を初期表示から外し、ほかの収集方法、収集状況、ログ、API設定は折りたたみへ移動 |
| Serper残量確認実動作化 | 完了 | code v127でSerper APIキー管理の「残量確認」を単なる再読込から専用API `refreshSerperCredits()` に変更。保存済みキーでSerper残量系エンドポイントを確認し、確認日時、残量、失敗理由をキー行へ保存表示。検索APIテスト結果と残量確認結果を分離し、検索テストで取得済み残量が空に戻らないよう調整 |
| 全体デザインポリッシュ | 完了 | code v128で全体CSSに `design-system-polish` レイヤーを追加。カードを白背景と薄い罫線中心に抑え、重要状態のみ淡い色面に限定。ボタン階層、Pill小型化、表の密度、カード内余白、見出し階層を全体で統一 |
| 全体デザインルール強化 | 完了 | code v129で各ページ上部を共通フォーマットへ統一。正常時の運用ステータス帯を非表示化し、異常時のみ原因チップを表示。行アクションの強弱とPillの最大幅/省略/title保持を追加 |
| メール二重送信防止強化 | 完了 | code v130で `sendLeadEmail()` の送信直前チェック、MailApp送信、`send_histories` 保存、リード更新を同一 `LockService` 範囲へ統合。成功履歴のあるlead_id/メールアドレスを候補から除外し、画面側もsend_count/送信済み/同一メール重複を除外 |
| 確認待ち専用メニュー | 完了 | code v132で確認待ちを独立タブ化。左メニュー/上部ショートカット/ダッシュボード導線を確認待ちへ集約し、最大100件だけを読む軽量キュー、確認済み/対応不要/公式再探索/詳細編集を追加 |
| 確認待ち初期起動 | 完了 | code v133でWebアプリ起動時のactiveタブをダッシュボードから確認待ちへ変更。初期ロードは既存の確認待ち100件取得を維持 |
| 営業収集ツール2パターン化 | 完了 | code v134で初期表示を「キーワード型」「サイト収集型」の2ルートへ整理。キーワード型はキーワード×エリア×補助語の複数Serper検索、サイト収集型はまとめサイトURLから施設/URLを抽出し、公式URLがある場合はSerperなしでメール/フォーム取得、公式URLがない場合のみSerper補完する `source_page` ジョブを追加 |
| 初回起動遅延改善 | 完了 | code v91で原因を `getInitialData()` の全件ダッシュボード集計、毎回の `setup()`、マスタ/設定/スキーマ/Serper集計、起動時の他メニュー全取得と特定。起動は軽量ダッシュボード + 確認待ちリストに限定し、詳細集計と各メニュー用データは背景/タブ表示時に遅延ロード。初回の確認待ち取得はquiet通信にして表示後のナビ操作をブロックしない |
| Gmail API連携設定 | 完了 | code v94で `MailApp` 用 `script.send_mail` と `GmailApp` 用 `https://mail.google.com/` をOAuth scopeへ追加し、Gmail連携画面から承認状態、Google認可URL、非送信の連携テストを確認できるようにした。認可リンクのアイコン巨大化と追加承認待ちの空パネル表示も修正 |
| Gmail承認状態判定修正 | 完了 | code v95で `NOT_REQUIRED` を `REQUIRED` の部分一致として扱い、承認後もGmail連携画面だけ要承認になる判定バグを修正 |
| 管理画面レイアウト改善 | 完了 | code v96で管理トップのカード密度を下げ、主要ステータス/本番前確認/自動運用サマリーを初期表示に集約。DB/Gmail詳細、マスター管理、ログ/メンテナンスはアコーディオン化 |
| 管理画面カード余白調整 | 完了 | code v97で管理ページ配下のカードpadding、見出し余白、ステータス項目、詳細アコーディオン、自動運用サマリーの間隔を調整し、旧gridが表示されても横詰まりしにくい指定を追加 |
| Gmail連携画面レイアウト改善 | 完了 | code v98でGmail連携ページの初期表示をサマリー中心に整理し、連携診断/テスト送信履歴/返信チェック/送信ロックをアコーディオン化。カードpadding、見出し余白、ステータス項目の間隔も調整 |
| 全体カード余白調整 | 進行中 | code v125で共通カード余白トークンを維持しつつ、空の `.exclusion-hero-panel` / 動的`.panel` / 統計グリッド / テンプレートタグパネル / テーブル枠などを非表示化。フォーム送信リストの空対象カード、ダッシュボードの高さ揃え、営業リスト表示項目アコーディオン、自動収集進捗/Serper設定ガイドのSVG巨大化に加え、Gmail連携の初期表示を3カードへ整理し、親カードのpadding、説明文、Pill配置、レスポンシブ折り返しを調整。さらにダッシュボード上部API連携カードを読みやすい2列コンパクト表示にし、管理/Gmailの詳細アコーディオン内カードを上揃えにして、子カードが同じ高さに引き伸ばされる状態を抑制。テンプレート画面を一覧中心に整理し、今回、営業リスト収集ツールを「今日やること」カード1枚に集約して初期表示の判断数をさらに下げた。主要/残り画面の実表示確認を継続 |
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

## 2026-07-08 v125 収集ツール集中表示

- `node scripts/smoke-test.js` 成功。`collection-focus-panel`, `collection-focus-meta`, `collectionPrimaryAction`, `ほかの収集方法・詳細`, `collectionSupportDetails`, `updateCollectionAreaPreview` を確認。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v125-collection-focus-card"` でVersion 125を作成済み。
- 既存Web app URLを `clasp deploy -V 125 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 125へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@125 - apps-script-full-workflow-v125-collection-focus-card-on-existing-url` を指すことを確認。
- Chrome実表示確認は、Google Apps Scriptの `Authorization required` 画面が先に表示されたため収集画面まで未到達。承認操作はユーザーアカウント権限に関わるため未実施。

## 2026-07-08 v127 Serper残量確認

- `node scripts/smoke-test.js` 成功。`refreshSerperCredits`, `SERPER_CREDIT_ENDPOINTS`, `api('refreshSerperCredits')`, `doPost` action公開を確認。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v127-serper-credit-refresh-preserve"` でVersion 127を作成済み。
- 既存Web app URLを `clasp deploy -V 127 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 127へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@127 - apps-script-full-workflow-v127-serper-credit-refresh-preserve-on-existing-url` を指すことを確認。
- `npx clasp run refreshSerperCredits --nondev` は `Script function not found. Please make sure script is deployed as API executable.` のため、Execution API経由の直接実行確認は未実施。

## 2026-07-08 v128 全体デザインポリッシュ

- `node scripts/smoke-test.js` 成功。`design-system-polish`, `--role-primary`, コンパクトPill、密度高めのtable、静かなpanel/cardルールを確認。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v128-design-system-polish"` でVersion 128を作成済み。
- 既存Web app URLを `clasp deploy -V 128 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 128へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@128 - apps-script-full-workflow-v128-design-system-polish-on-existing-url` を指すことを確認。
- Chrome実表示確認は、Google Apps Scriptの `Authorization required` 画面が先に表示されたためアプリ画面まで未到達。承認操作はユーザーアカウント権限に関わるため未実施。

## 2026-07-08 v129 上部/ステータス/Pill/行アクション整理

- `node scripts/smoke-test.js` 成功。`v129-header-status-action-pill-rules`, 共通section header、正常時ステータス非表示、異常時status class、行アクション階層、Pill最大幅/title保持を確認。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v129-header-status-action-pill-rules"` でVersion 129を作成済み。
- 既存Web app URLを `clasp deploy -V 129 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 129へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@129 - apps-script-full-workflow-v129-header-status-action-pill-rules-on-existing-url` を指すことを確認。
- Chrome実表示確認は、Google Apps Scriptの `Authorization required` 画面が先に表示された場合、承認操作がユーザーアカウント権限に関わるため未実施。

## 2026-07-08 v130 メール二重送信防止強化

- `node scripts/smoke-test.js` 成功。`sendLeadEmail` の単一 `LockService`、`sendLeadEmail:afterSend` 分割廃止、既送信履歴ガード、同一メールアドレス除外、テスト送信を本番送信履歴ガードから除外する条件を確認。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v130-mail-send-duplicate-guard"` でVersion 130を作成済み。
- 既存Web app URLを `clasp deploy -V 130 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 130へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@130 - apps-script-full-workflow-v130-mail-send-duplicate-guard-on-existing-url` を指すことを確認。
- 実メール送信はユーザーの送信先確認が必要なため未実施。ローカルでは構文/静的安全検査まで確認。

## 2026-07-08 v131 遅延読み込み / テーブル軽量化

- `node scripts/smoke-test.js` 成功。`TABLE_RENDER_BATCHES`, `limitedTableRows`, `table-load-more-row`, `renderActiveLoadedScreen`, `onCollectionSupportToggle`, `onAdminDisclosureToggle`, `onGmailDisclosureToggle` を確認。
- `.gs` 全ファイルのNode構文チェック成功。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v131-lazy-tables-performance"` でVersion 131を作成済み。
- 既存Web app URLを `clasp deploy -V 131 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 131へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@131 - apps-script-full-workflow-v131-lazy-tables-performance-on-existing-url` を指すことを確認。
- 初期表示では収集ログ、管理詳細、Gmail詳細、履歴/同期/分析の重いテーブルをまとめて描画しない。必要な詳細を開いた時だけAPI取得し、画面テーブルは「さらに表示」で段階描画する。

## 2026-07-09 v132 確認待ち専用メニュー / 常用導線整理

- `node scripts/smoke-test.js` 成功。`reviewLeads` タブ、確認待ち専用セクション、`loadReviewLeadMenu`, `renderReviewLeadsScreen`, `updateReviewLeadStatus`, `openReviewLeadsInList`、上部ショートカットの確認待ち優先表示を確認。
- `.gs` 全ファイルのNode構文チェック成功。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v132-review-menu-shortcuts"` でVersion 132を作成済み。
- 既存Web app URLを `clasp deploy -V 132 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 132へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@132 - apps-script-full-workflow-v132-review-menu-shortcuts-on-existing-url` を指すことを確認。
- 確認待ちは最大100件だけを軽量取得し、詳細な一括操作は営業リスト本体へ同期して引き継ぐ。営業収集ツールへの導線も左メニュー/上部ショートカット/確認待ち画面から常時利用できる。

## 2026-07-09 v133 確認待ち初期起動

- `node scripts/smoke-test.js` 成功。`reviewLeads` セクション、サイドバー、上部ショートカット、`currentTab` が初期状態で確認待ちになることを確認。
- `.gs` 全ファイルのNode構文チェック成功。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v133-review-startup"` でVersion 133を作成済み。
- 既存Web app URLを `clasp deploy -V 133 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 133へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@133 - apps-script-full-workflow-v133-review-startup-on-existing-url` を指すことを確認。
- 起動時のデータ取得は既存の確認待ち100件取得を維持し、全件営業リストは引き続き手動読み込み。

## 2026-07-09 v134 営業収集ツール2パターン化

- `node scripts/smoke-test.js` 成功。`キーワード型`, `サイト収集型`, `collectionKeywordTerms`, `sourcePageUrls`, `sourcePageUseSerperFallback`, `processSourcePageSearchItem_` を確認。
- `.gs` 全ファイルのNode構文チェック成功。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v134-two-collection-modes"` でVersion 134を作成済み。
- 既存Web app URLを `clasp deploy -V 134 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 134へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@134 - apps-script-full-workflow-v134-two-collection-modes-on-existing-url` を指すことを確認。
- サイト収集型はGAS制限に合わせて軽量探索に限定。JavaScript描画後にしか出ない施設一覧やPDFは抽出できない場合があり、その場合はSerper補完または手動確認が必要。

## 2026-07-10 v136 旧アプリ除外ドメイン移行

- `node scripts/smoke-test.js` 成功。`importExcludedDomains` のWeb app dispatchとMasters APIを確認。
- `.gs` 主要ファイルと移行スクリプトのNode構文チェック成功。
- `clasp push` 成功。
- `clasp version "apps-script-full-workflow-v136-excluded-domain-import"` でVersion 136を作成済み。
- 既存Web app URLを `clasp deploy -V 136 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 136へ再デプロイ済み。
- `getAppInfo` で `20260710_apps_script_full_workflow_v136_excluded_domain_import` が返ることを確認。
- 旧アプリの `excluded_domains` 598件をGAS版 `excluded_domains` へ移行済み。内訳は追加544件、既存54件更新、スキップ0件。
- 移行後ドライランで `targetExistingRows: 598`、追加予定0件を確認。以降の再実行は重複追加せず既存更新になる。

## 2026-07-10 v137 旧アプリメールデータ移行

- `node scripts/smoke-test.js` 成功。`importEmailTemplates` / `importSendHistories` のWeb app dispatchと一括APIを確認。
- `.gs` 主要ファイルと `scripts/migrate-mail-data.js` のNode構文チェック成功。
- `git diff --check` 成功。
- `clasp push` 成功。
- `clasp version "apps-script-full-workflow-v137-mail-data-import"` でVersion 137を作成済み。
- 既存Web app URLを `clasp deploy -V 137 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 137へ再デプロイ済み。
- `getAppInfo` で `20260710_apps_script_full_workflow_v137_mail_data_import` が返ることを確認。
- 旧アプリの `email_templates` 9件をGAS版へ移行済み。スキップ0件。
- 旧アプリの `send_histories` 1,168件をGAS版へ移行済み。スキップ0件。
- 移行後ドライランで `send_histories` は追加0件・既存1,168件を確認。履歴は再実行しても重複追加しない。
- 旧アプリ `app_settings` は1,045キー中、安定運用キー候補11件、秘密値らしきキー2件、一時/ジョブ系キー979件を確認。丸ごと移行は行わず、必要キー単位で確認する方針。

## 2026-07-12 v138 テンプレートテスト送信固定化

- `node scripts/smoke-test.js` 成功。テスト送信固定宛先 `yuya1998nu@gmail.com` と固定宛名 `村松侑哉` のクライアント/サーバー検査を追加。
- `.gs` 主要ファイルと `scripts/smoke-test.js` のNode構文チェック成功。
- `git diff --check` 成功。
- `clasp push` 成功。
- `clasp version "apps-script-full-workflow-v138-fixed-template-test-send"` でVersion 138を作成済み。
- 既存Web app URLを `clasp deploy -V 138 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 138へ再デプロイ済み。
- `getAppInfo` で `20260712_apps_script_full_workflow_v138_fixed_template_test_send` が返ることを確認。
- テンプレートテスト送信モーダルは固定宛先表示に変更し、会社名・屋号・担当者名をテスト時のみ `村松侑哉` に固定。本文プレビューは広い2カラムとスクロール枠へ調整。

## 2026-07-12 v139 メール送信安全監査

- `sendLeadEmail` 直前にサーバー側テンプレート検証を追加。下書き、フォーム用、2ヶ月後メール、ジャンル未設定、営業先ジャンル未設定、ジャンル不一致テンプレートはUIを迂回しても送信不可。
- 本番テンプレート自動選択で、ジャンル不一致時に先頭テンプレートへフォールバックしないよう変更。
- 送信履歴の成功判定を本番送信に限定し、テスト送信は同一メールアドレスの再送防止・本日送信数・今月送信数・アプリ日次上限から除外。Gmailの実クォータは引き続き `MailApp.getRemainingDailyQuota()` で確認。
- 営業リスト詳細のテンプレート候補を、本番ON・初回メール・ジャンル一致のみに整理。フォーム営業テンプレートも違うジャンルの先頭テンプレートへ落ちないよう修正。
- `node scripts/smoke-test.js` 成功。下書き/フォーム用/ジャンル不一致のブロック、テスト送信除外カウント、テンプレート自動選択のジャンル一致を実行テストで確認。
- `.gs` 主要ファイルのNode構文チェック成功。
- `git diff --check` 成功。
- `clasp push -f` 成功。
- `clasp version "apps-script-full-workflow-v139-mail-send-safety-audit"` でVersion 139を作成済み。
- 既存Web app URLを `clasp deploy -V 139 -i AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g` でVersion 139へ再デプロイ済み。
- `clasp deployments` で既存Web app URLが `@139 - apps-script-full-workflow-v139-mail-send-safety-audit-on-existing-url` を指すことを確認。
- `clasp run getDashboardStats` は実行権限で失敗。実データの最新集計確認はWeb appまたはApps Script editorで行う。
- Chromeで既存Web app URLをリロードし、画面上の `20260712_apps_script_full_workflow_v139_mail_send_safety_audit` 表示、確認待ちリスト `1,134件`、初期表示 `100件` を確認。メール送信実行は未実施。

## 2026-07-12 v140 一般Googleアカウント向けGAS利用状況

- 管理画面に一般Googleアカウントの公式上限を基準とした `GAS利用状況` パネルを追加。
- メール受信者100人/日、トリガー20件、1回6分、URL Fetch 20,000回/日、Apps Scriptバージョン200版をメーター表示。
- Gmail残数とトリガー数は実測、URL FetchはSerper利用ログに記録された下限として表示し、Googleから残数を取得できないトリガー累計時間・Properties操作回数は取得不可と明記。
- 通常時は `現在問題なし` の簡潔表示、70%以上は注意、90%以上は警告。コード版v140は200版上限の70%として注意表示。
- 既存のアプリ日次メール上限80件と1回300秒の最大処理時間は、安全余裕として維持。
- ダッシュボードキャッシュを `dashboard_stats_v4` へ更新し、旧キャッシュで利用状況が欠落しないようにした。
- `node scripts/smoke-test.js`、主要 `.gs` 構文チェック、`git diff --check` 成功。
- `clasp push -f` 成功。Version 140を作成し、既存Web app URLを `@140` へ再デプロイ済み。
- ChromeでVersion 140、一般Googleアカウント表示、各メーター、注意表示、詳細アコーディオンの開閉を確認。ブラウザ警告・エラーログ0件。メール送信実行は未実施。

## 2026-07-12 v141 最大処理時間の表記改善

- 誤解しやすい `1回の実行予算` を `1回の最大処理時間` へ変更。
- 自動運用設定のサマリー、説明、保存ボタン、保存完了メッセージも `最大処理時間` に統一。
- 内部設定キー `batch_runtime_budget_ms` と300秒の分割実行動作は変更なし。
- `node scripts/smoke-test.js`、主要 `.gs` 構文チェック、`git diff --check` 成功。
- `clasp push -f`、Version 141作成、既存Web app URLの `@141` 再デプロイ成功。
- ChromeでVersion 141、新表記表示、旧表記なし、ブラウザ警告・エラーログ0件を確認。

## 2026-07-12 v143 分割処理・自動再開の安全監査

- 監査で、複数ジョブがそれぞれ最大300秒を持ち合計6分を超え得る問題、同一ジョブの手動/トリガー二重実行余地、サイト収集チャンク内の途中位置未保存、Gmail返信確認の先頭範囲繰り返しを確認。
- `advanceQueuedJobs()` は複数ジョブ全体で最大処理時間を共有し、古い更新順に処理して未完了ジョブを後ろへ回すよう修正。
- `search_jobs` に `cursor_json`、`lock_token`、`locked_at`、`last_heartbeat_at`、`attempt_count` を追加。同一ジョブは短時間の占有処理で二重実行を防止し、7分以上経過した占有はGAS強制終了として次回自動復旧。
- サイト収集は外側のチャンク番号に加えてチャンク内施設位置を保存。最大処理時間前に保存し、次回同じ施設位置から再開。
- Gmail返信確認は1回の確認営業先数を正しく制限し、PropertiesServiceへ次回開始位置を保存。手動とトリガーの同時実行も占有処理で防止。
- Gmail返信自動チェックがOFFの場合、6時間トリガーから呼ばれてもGmailへアクセスせず即終了。画面からの手動確認は引き続き利用可能。
- モックジョブで `2件処理→queued→次回3件目を完了`、実行中ジョブの二重処理スキップ、サイト収集のチャンク内2件目保存、返信確認の `0→2→4` 巡回カーソル、OFF時のGmail未実行を自動テスト。
- `node scripts/smoke-test.js`、主要 `.gs` 構文チェック、`git diff --check` 成功。
- Version 142で定期トリガー作成導線を確認後、最終修正版をVersion 143として既存Web app URLへ再デプロイ。
- ChromeでVersion 143、時間主導トリガー2件、最大処理時間300秒、ブラウザ警告・エラーログ0件を確認。現在の実ジョブは0件のため、Serper実検索や営業リスト変更を伴う試験は未実施。

## 2026-07-12 v144 送信NGの強制適用

- 送信NGフラグ、送信NGステータス、送信NGマスター、除外ドメインの判定が実送信直前に通ることを監査。
- Web APIの `options.force=true` で送信対象判定を迂回できたため、実送信前の安全判定を常時必須に修正。
- 送信可否判定を理由付きの単一関数へ統合し、画面操作以外のAPI呼び出しでも同じ判定を適用。
- 送信NGマスターは会社名完全一致、メール完全一致、WEBサイト/メールの各ドメインとサブドメインを照合。WEBサイトドメインがあってもメールドメインのNG指定を見落とさないよう修正。
- `force=true` を渡した送信NG営業先で `MailApp.sendEmail` が0回のまま例外停止する回帰テストを追加。実メール送信は未実施。
- `node scripts/smoke-test.js`、全 `.gs` 構文チェック、`git diff --check` 成功。Version 144を既存Web app URLへ再デプロイ。
- ChromeでVersion 144、送信NGマスター0件、除外ドメイン299件、ブラウザ警告・エラーログ0件を確認。送信事故防止のため実メール送信は未実施。

## 2026-07-12 v145 PCスリープ中のクラウド継続

- 収集ジョブはApps Scriptの時間主導トリガーで10分ごとに再開し、PCやブラウザを閉じてもGoogle側で処理する構成を確認。
- 新しい収集ジョブの登録時に `advanceQueuedJobs` トリガーを確認し、削除されていれば自動再作成する自己修復を追加。
- 定期トリガー作成処理を排他制御し、複数操作が重なっても同じトリガーを重複作成しないよう修正。
- 検索ジョブ履歴が増えた場合も古い待機ジョブを見失わないよう、クラウド監視対象を直近100件から1,000件へ拡張。
- Gmail返信確認は設定がONの場合のみ6時間ごとにクラウド実行。自動メール送信は別機能であり、安全のため今回有効化していない。
- トリガー0件から既定2件を作成し、再実行しても2件のまま重複しないモックテストを追加。`node scripts/smoke-test.js`、全 `.gs` 構文チェック、`git diff --check` 成功。
- Version 145を既存Web app URLへ再デプロイ。`clasp run installDefaultTriggers` はExecution APIの実行権限不足で利用不可のため、実トリガー件数はWeb app管理画面を正とする。

## 2026-07-12 v146 自動収集の停止原因修正

- 実データ監査で、なっぷ全件収集5,872施設を588チャンク分の完全なJSONとして `search_jobs.query_json` 1セルへ保存し、Google Sheetsの1セル50,000文字上限で進捗更新が失敗していたことを確認。
- なっぷ全件収集を1個のコンパクトなジョブとして保存し、施設位置は `cursor_json` のoffsetだけで再開する方式へ変更。
- 画面の進捗は内部チャンク数ではなく、保存済みカーソルから `処理済み施設数 / 全施設数` を表示するよう変更。
- 既存停止ジョブはコンパクトJSONへ置き換え、queued・ロック解除状態へ復旧する。
- 手動の「次を処理」が `advanceSearchJob(jobId, options)` ではなくオブジェクト1個を渡していたため、正しい引数へ修正し、失敗時の画面メッセージを追加。
- 停止ジョブ `699786a9-09ac-46e5-80bd-e154a1d2447f` の `query_json` を510文字へ圧縮し、実行状態を復旧。Version 147を既存Web app URLへ再デプロイ。
- 実データで12施設の処理、Serper成功ログ12件、営業先追加、`cursor_json={"itemIndex":0,"offset":12}`、処理後のqueued復帰を確認。次回は13件目から自動再開する。
- `node scripts/smoke-test.js`、全 `.gs` 構文チェック、`git diff --check` 成功。5,872候補の生成JSONが50,000文字未満になる回帰テストを追加。

## 2026-07-12 v148 自動収集の重複判定高速化

- 実行監査で、1施設ごとに5,000件超の営業リストを最大4回読み直していたため、収集処理が12施設で約3分かかることを確認。
- 収集実行開始時に営業リスト全件から重複判定インデックスを1回作成し、source ID、まとめサイトURL、公式URL、ドメイン、正規化施設名をメモリ照合する方式へ変更。
- 同じ実行内で追加した営業先も即座にインデックスへ反映。最終追加時のサーバー側全件重複チェックは維持し、同時実行時の安全性を保つ。
- `createLead` は追加直後に全件再読込せず、書き込んだUUID付きレコードを返すよう変更。
- 実環境の手動継続で `21 -> 31 / 5,872施設`、新規追加4件、重複6件、Serper成功9件、新規エラー0件を確認。

## 2026-07-12 v149 共有ドメインの別施設取りこぼし修正

- v148実行結果の監査で、自治体・観光協会など同じドメイン配下の別施設がドメイン単独一致で重複扱いになることを確認。
- まとめサイト収集の事前重複判定をsource ID、まとめサイト詳細URL、正規化施設名へ限定し、共有ドメインだけでは除外しないよう変更。
- 最終追加時のメール一致、source ID一致、施設名とドメインの複合一致は維持し、同一施設の二重登録防止を継続。
- 誤判定された区間へカーソルを戻して実環境の時間主導トリガーで再処理し、`21 -> 41 / 5,872施設`を約3分24秒で処理、営業リスト14件追加、新規エラー0件、queued復帰を確認。
- 大岸シーサイド、豊浦海浜公園、礼文華海浜公園、豊浦町森林公園、有珠海水浴場など、共有ドメインの別施設が個別リードとして追加されることを確認。

## 2026-07-12 v150 メール送信予約とサーバーバッチ化

- 本番メール送信後、履歴や営業先の更新前に処理が中断すると、再実行で同じ宛先へ再送し得る隙間を確認。
- MailApp呼び出し前に`send_histories`へ`送信中`予約を保存し、履歴確定や営業先更新に失敗しても予約・成功履歴・営業先状態のいずれかで再送を止める方式へ変更。
- 同じバッチ内の別営業先が同一メールアドレスを持つ場合も、先行する送信予約をメモリ上の安全コンテキストへ反映して2通目を遮断。
- 一括送信をブラウザから1件ずつ呼ぶ方式から`sendLeadEmailBatch`のサーバー処理へ変更し、開始後はPCスリープや画面遷移に依存せず処理を継続。
- 本番送信はサーバー側でも自動送信ONを必須化し、一括送信は送信時間帯も必須化。送信NG、除外ドメイン、NGマスター、返信済み、商談中、送信済み判定は引き続き送信直前に再確認。
- 正常な重複スキップを`sync_logs`のシステムエラーとして記録しないExpected Error分類を追加。
- Serper日次・月次上限到達時に公式URL未確認のままカーソルを進めていた問題を修正。対象施設の位置と再開時刻を`cursor_json`へ保存し、日次は翌日00:05、月次は翌月1日00:05以降に同じ施設から再開。
- 上限待機中の10分トリガーは外部検索や営業リスト全件読込をせず即終了し、GAS実行時間とSerper枠を消費しない。

## 2026-07-12 v151-v152 収集再開と送信対象の最終安全化

- Serperの1件上限は日次で復活しないため、ジョブ全体を翌日まで待機させず、該当施設だけをスキップして次へ進むよう修正。日次・月次上限だけが同じ施設位置から自動再開する。
- 画像ファイル名、JavaScript式、計測用ホストをメールと誤認しないサーバー/画面共通検証を追加。検索結果に複数メールがある場合は`info`/`contact`/`inquiry`/`sales`/`support`系を優先する。
- 実データ5,504行を監査し、抽出ノイズ8件のUUIDと現在値を再照合後、`email`/`email_domain`のみをクリア。再監査で無効メール0件を確認。
- 修正済みの過去障害8件と正常な重複スキップ1件は監査記録を残して解消済み化し、現行の異常ログ0件を確認。
- 送信計画と右側の送信制限表示の`1回上限`をGmail残り枠ではなく、設定値`email_batch_send_limit`（現在20件）から表示・計画するよう統一。
- Version 152デプロイ後も、本番のなっぷ収集ジョブが`offset 74 -> 87 / 5,872`、試行7 -> 8回、最終更新2026-07-12 15:30:40までPC操作なしで自動継続していることを確認。`status=queued`、`last_error`空、現行異常ログ0件。
- Chromeの実URLでVersion 152、確認待ちからの起動、送信予定/制限の1回20件表示、抽出ノイズ4種非表示、本番メール停止、テスト宛先`yuya1998nu@gmail.com`/宛名`村松侑哉`固定を確認。実メール送信は未実施。

## 2026-07-12 v153 確認待ちと実送信の強制分離

- 収集系source（`serper` / `search_job` / `prospecting` / `source_page`）かつ`status=未対応`の確認待ちが、メール・フォーム送信対象判定で除外されていない問題を確認。
- 実データ5,523行の監査時点で、確認待ち1,215件のうちメール候補94件、フォーム候補362件が承認前の作業対象と重複していた。
- 共通判定`isLeadReviewPending_`を追加し、確認済み（GAS版では`status=対応中`）へ変更するまで、メール候補、フォーム候補、フォーム送信済み登録をサーバー側で強制遮断。
- フォーム画面でも承認前はURL、本文コピー、対応中/対応済み操作を無効化し、対応不要のみ実行可能にした。
- フォーム送信済み解除時に承認済みの`status=対応中`が`未対応`へ戻る問題を修正。送信前statusを履歴に保存して復元する。
- `privacy` / `personal-information` / `recruit` / `career` / `saiyo` / `jinji` / `webmaster` / `abuse` / `security`系の役割アドレスを営業送信候補から除外。`pr@...`など通常の広報窓口は維持。
- Chromeの実URLでVersion 153を確認。確認待ち代表「士幌高原ヌプカの里」と`privacy@okura-nikko.co.jp`はメール候補から消え、メール対象総数は`2,014 -> 1,924件`。
- フォーム画面で確認待ち行のフォームリンク0件、行内の本文コピー/送信済み無効、右プレビューのコピー/対応中/対応済み無効、対応不要のみ有効を確認。
- 本番収集ジョブはVersion 153確認時も`offset 98 / 5,872`、試行9回、`status=queued`、`last_error`空、現行異常ログ0件で継続中。実メール・実フォーム送信は未実施。
- Serper実使用量が`100/100`へ到達した時点で、ジョブは次施設を消費せず`cursor={"itemIndex":0,"offset":99,"resumeAfter":"2026-07-13T00:05:00+09:00"}`を保存。`status=queued`、試行10回、`last_error`空で、日次上限後の自動再開予約を実環境で確認。

## 2026-07-12 v154 Gmail返信誤判定の防止

- 従来の返信チェックは`from:営業先メール newer_than:365d`の先頭スレッドだけを見ており、営業メール送信前の別件メールでも`返信あり`になる問題を確認。
- 実データで「南阿蘇温泉郷 別邸 蘇庵」の2026-03-01フォーム自動受付が、2026-06-09の初回メールより前なのに2026-07-06に返信扱いされた誤判定1件を特定。
- `send_histories`の成功した本番送信を営業先ID別に1回でインデック化し、成功送信履歴のない営業先はGmail検索自体を行わない。
- Gmail検索を成功送信日以降に絞り、各スレッドの全メッセージに対して、`getDate()`が送信時刻より後、`getFrom()`が営業先メールと一致するメッセージだけを返信候補にする。
- `getHeader()`で`Auto-Submitted` / `Precedence` / `List-Id` / `X-Autoreply` / `X-Autorespond` / `X-Auto-Response-Suppress` / `X-Failed-Recipients`を確認し、自動応答、メーリングリスト、配信エラーを除外。フォームのお客様控え/受付通知も除外パターンに追加。
- 誤判定候補は自動返信だけでなく、成功送信前の受信日時でも検出。復元時は最新の成功送信種別に応じて`初回メール送信済み`または`2ヶ月後メール送信済み`へ戻し、`last_gmail_thread_id`もクリアする。
- Chromeの実URLでVersion 154を確認。Gmail連携画面の既存ログスキャンで誤判定候補1件、復元先`初回メール送信済み`、エラー0件を確認し、復元を実行。
- 復元後のシートで対象UUID`da8bfb99-8883-4f0c-8240-833c2cefc455`が`初回メール送信済み`、`reply_checked=false`、`last_gmail_thread_id`空、`send_count=1`を確認。再スキャンは候補0件・エラー0件、現行異常ログ0件。Gmail返信検索と実メール送信は未実施。

## 2026-07-12 v155 Calendar商談登録の冪等化

- 従来の`createCalendarEventForLead`は排他制御と既存イベント確認がなく、ボタン連打や通信再試行で同じ商談イベントを複数作成できた。またCalendar作成後にGoogle Sheets更新が失敗すると、シートと紐づかない孤立イベントが残る問題を確認。
- `updateLeadLocked_`を分離し、Calendar作成・既存ID確認・営業先更新を1つのScriptLock内で実行。同じ営業先に`calendar_event_id`があり、Calendar側にイベントが存在する場合は既存イベントを返して再作成しない。
- Calendar側で削除済みの古いIDはシートからクリアし、1件だけ再作成。新規イベント作成後に営業先更新が失敗した場合は`deleteEvent()`でCalendar側をロールバックする。
- Calendar招待を送る場合は、確認待ち、送信NG、対応不要、NGマスター、除外ドメイン、無効メールをCalendar作成前に強制遮断。
- 既存イベント再利用、削除済みIDの再作成、シート更新失敗時の削除、送信NG招待遮断のモック回帰テストを追加。本番シートのCalendarイベントIDは0件、`calendar_auto_create={"enabled":false}`のため実イベント作成は未実施。
- Version 155を既存Web app URLへデプロイし、実画面でVersion 155、確認待ちからの起動、自動送信停止を確認。Calendarイベントや招待は作成していない。
- 本番のなっぷ収集ジョブは`status=queued`、`cursor={"itemIndex":0,"offset":99,"resumeAfter":"2026-07-13T00:05:00+09:00"}`、`last_error`空、試行13回、最終更新2026-07-12 16:17:19。Serper日次上限待機中も10分トリガーがジョブを維持し、翌日再開位置を消費していないことを確認。
- `sync_logs`全使用行を再監査し、既存障害はすべて`resolved`・`info`。未解消の`error`/`warn`は0件。

## 2026-07-12 v156-v157 収集再開時刻の可視化とトリガー整理

- Serper日次・月次上限待機中のジョブをダッシュボード集計で判別し、`prospectingResumeAfter`と保存済み施設位置を返すよう変更。
- 営業リスト収集ツール上部に「上限待機中」「自動再開日時」「再開する施設位置」を表示。バックグラウンド進捗表の「次の処理」も最終更新時刻ではなく、`cursor_json.resumeAfter`の実再開予約を表示する。
- 既定の時間主導トリガー作成時、`advanceQueuedJobs`または`checkRepliesForLeads`が重複していれば余分なトリガーを削除し、各処理1件へ整理する。
- 上限待機時刻・施設位置の抽出、トリガー重複削除のモック回帰テストを追加。
- 本番確認で、バックグラウンド上段だけが上限待機を「進捗更新が遅い」と判定していたためv157で修正。上限待機中は異常件数へ含めず、「上限リセット待ち」と実再開日時を表示する。
- Version 157を既存Web app URLへデプロイ。実画面で収集ツールに「2026/07/13 00:05以降・100施設目から自動再開」、進捗画面に「上限リセット待ち」、注意0件、エラー0件、`99 / 5,872施設`を確認。

## 2026-07-12 v158 UUID参照保全とテンプレート誤送信防止

- 未認証の外部環境からWeb app URLへ`getAppInfo`をPOSTし、Google側の404で拒否されることを確認。外部APIはApps Scriptの認証境界内にある。
- 本番シートの主要10テーブルを監査し、営業先5,531件、送信履歴1,168件を含めUUID空欄・重複0件。送信履歴、返信ログ、検索結果から営業先への孤立参照0件。
- 成功した本番送信1,105件は宛先メール1,105件で重複0件。
- 送信履歴・返信ログ・検索結果・Calendarイベントが紐づく営業先は物理削除を拒否し、通常のUUID付きアーカイブだけ許可する保護を追加。
- 本番ONのキャンプテンプレート本文に「温泉宿向け」と残っていた内容不一致を「キャンプ施設向け」へ修正。本文更新後に本番ON、テスト日時、有効状態、版、作成日時を行全体で再照合した。
- 本番テンプレート4件は有効・テスト済み・ジャンル/種別重複なし・本文ジャンル矛盾なし。今後は明示的な対象業種とジャンルが矛盾する場合、本番ON時と送信直前の両方で拒否する。
- 通常のテンプレート保存から直接本番ONにする経路を禁止し、保存、テスト送信、本番ONの順序をサーバー側で強制する。実メール送信は未実施、自動送信は停止中。
- Version 158を既存Web app URLへデプロイ。実画面のテンプレート編集欄で、キャンプ本番テンプレートがONのまま「キャンプ施設向け」へ修正され、「温泉宿向け」が残っていないことを確認。

## 2026-07-12 v159 運用設定のサーバー検証

- 汎用`setSettingValue`が任意キー、上限外の数値、不正な時刻・JSON型を保存できたため、既知の運用設定だけを許可するサーバー検証を追加。
- 一般Googleアカウント向けにGmail日次上限1〜80件、1回送信1〜20件を強制。Serper日次1〜100件、月次1〜1,000件、1営業先1〜3件、GAS処理予算10〜330秒も範囲外を拒否する。
- 自動送信時間は`HH:mm`、開始<終了、タイムゾーン`Asia/Tokyo`または`UTC`を必須化。返信チェック1〜500件、メール取得スキップ0〜365日、収集設定の検索件数・URL・サイト数も正規化する。
- JSON設定はオブジェクト型とGoogle Sheets 1セル上限より小さい45,000文字以内を強制し、50,000文字超過による再停止を防止。
- 設定保存が拒否された場合、管理画面と収集画面に理由を表示する共通処理を追加。実データの設定11件は現行の安全範囲内であることを確認。
- Version 159を既存Web app URLへデプロイ。実画面で送信時間を不正な`08:00-07:00`として保存し、`start must be earlier than end`で拒否されることを確認。シートの実設定は`07:00-08:00 / Asia/Tokyo`のまま変更されていない。

## 2026-07-12 v160 送信予約の滞留可視化

- 二重送信防止用の`送信中`予約が異常終了で残る場合を監査。本番シートの滞留予約は0件。
- 旧アプリのトークン失効による失敗履歴50件は、同じ営業先すべてに翌日の成功履歴があり、未復旧・誤送信済み状態は0件。
- `送信中`を失敗件数から分離し、送信履歴の「送信結果確認中」フィルター、履歴行、送信プレビュー、管理運用の表示を統一。
- 30分以上残る本番送信予約だけを全画面の異常通知へ表示し、Gmail送信済みを確認するまで再送しないよう案内する。二重送信回避を優先し、自動解除・自動再送は行わない。
- Version 160を既存Web app URLへデプロイ。実画面の送信履歴で「結果確認中」集計と「送信結果確認中」フィルターを確認し、現在0件であることを確認。

## 2026-07-12 v161 送信回数と成功履歴の整合化

- 営業先5,531件の`send_count`と成功した本番送信履歴をUUIDで全件照合し、旧トークン失効の失敗試行まで回数へ含めていた50件を特定。すべて`2→1`の同一パターン。
- 対象UUIDと現在値を再読込後、`send_count`セルだけを50件補正。フォーム送信日時、営業ステータス、返信・商談状態は変更していない。
- 補正後は成功履歴の営業先別合計1,103件、営業先側`send_count`合計1,103件、不一致0件。
- ダッシュボード更新時に成功履歴と営業先送信回数を照合し、不一致が1件でも発生した場合は全画面の異常通知へ表示する再発検知を追加。
- Version 161を既存Web app URLへデプロイ。実画面でVersion 161、確認待ちからの起動、送信集計不一致の異常通知なしを確認。
- キャンプ本番テンプレート`メール文【20260531】`を使い、固定テスト宛先`yuya1998nu@gmail.com`・固定宛名`村松侑哉`へテストメールを1通送信。`send_histories`に`テスト送信`・`成功`・営業先ID空欄で記録され、Gmail送信済み（message ID `19f5564abdc1c8ee`）でも宛先、件名、キャンプ向け本文を確認した。
- テスト後も`mail_sending_control.enabled=false`、`gmail_reply_check.enabled=false`、`calendar_auto_create.enabled=false`を維持。営業先の送信回数・ステータスを更新せず、自動送信は停止したまま。

## 2026-07-12 v162 Serper日次上限の撤廃

- アプリ独自の`serper_daily_search_limit=100`判定を廃止。新規ジョブへ日次上限を保存せず、本日検索件数は利用状況として表示するだけに変更。
- 既存ジョブに残っていた日次上限待機カーソルは自動的に無効化する。今後、月間上限待機だけ`quotaCode=SERPER_MONTHLY_LIMIT`付きで翌月へ引き継ぐ。
- ダッシュボード、収集管理、バックグラウンド進捗、管理表示を「本日残り」から「日次上限なし」「Serper残量」「月間残り」へ統一。
- 本番`settings`から不要な`serper_daily_search_limit`行を削除し、なっぷ収集ジョブの保存位置99は維持したまま翌日待機日時を解除。
- Version 162を既存Web app URLへデプロイ。実ジョブを1回再開し、`99 -> 111 / 5,872施設`へ進行、新しいSerper検索ログ12件、`last_error`空、処理後`queued`を確認。
- 月間上限1,000件と1施設あたり上限3件は、月間クレジットの過剰消費と同一施設への過剰検索を防ぐため維持。

## 運用時に確認する外部依存

- Serper実検索は、なっぷ収集ジョブで日次上限撤廃後も`99 -> 111施設`へ進行することを確認済み。
- Gmailの実送信は固定テスト宛先へのテストメール1通で確認済み。本番営業先への送信は安全のため未実施。
- 実カレンダー登録は、テスト商談日時で1件作成して確認する。
- `clasp run` / `clasp logs` はGCP project / Apps Script Execution API設定に依存するため、現状の運用確認はWeb appとApps Script editorを正とする。
