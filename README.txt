TASK CONTROL CENTER v0.4

起動（Windows）
1. ZIPを展開する。
2. VSCodeのLive Serverなどで、このフォルダのindex.htmlを開く。
   Pythonがある場合は start.bat を実行してもよい。
   http://127.0.0.1:8000/ を開く。
3. DB / LOCAL READY の表示後、タスク追加から登録する。

GitHub Pages 配布
このフォルダの中身をリポジトリの公開ルートに配置する（databaseフォルダも含む）。
静的ファイルだけで動作する。Python API、外部CDN、サーバーDBは不要。
file:// で直接開く方法はブラウザごとの保存挙動が異なるため非推奨。

データベース
IndexedDB: task-control-center / version 1
 tasks: id (自動採番), name, category, importance, due (ローカル日時), minutes,
 notes, today_date, created_at, completed_at, completed_score, completed_rank
 settings: key (capacity), value (分)
データはブラウザのオリジンとプロファイル単位で保存される。
同じURL・ブラウザを使うこと。ブラウザデータ削除で消える場合がある。
設定からJSONバックアップを書き出し、別端末で復元できる（既存データを置換）。
旧Python/SQLite版からの自動移行なし。WORKLOGとは別DBで、SQLiteファイル互換なし。

優先度
350i + 350u + 300w + 超過加点（最大250）、最大1000点。
特級は650点以上、任意は249点以下。中は3日超過でS−、低は7日超過でA+。
S−は特殊ランクとしてA+より先に並べる。期限は時刻単位で評価する。

検証: JS構文と優先度境界のテスト済み。ブラウザ実機テストは環境制限により未完了。

v0.4 変更点
- MANAGEタブでジャンル追加・名前変更・削除。使用中（完了履歴を含む）は削除不可。
- ジャンル名の変更は関連タスクにも反映する。既存タスクの独自ジャンルも取り込む。
- IndexedDB名・バージョンは同じ。settingsに categories キー（文字列配列）を追加。
- v0.4バックアップはversion 2。v0.3のversion 1も復元可能。
- 同じURL（オリジン）・ブラウザなら以前のIndexedDBを引き継ぐ。ポートやホストが変わる場合はJSONバックアップを使用する。
- ONLINE/OFFLINEはブラウザのnavigator.onLineに基づく目安であり、サーバー到達性の保証ではない。
- DB / LOCAL READYは端末内DBの初期読み込み成功、CACHE / READYはService Workerの有効化完了を示す。
- HTTPSまたはlocalhostで一度オンライン起動し、CACHE / READYになれば、原則オフラインでも再起動可能。初回起動やキャッシュ削除後はネット接続（ローカル配布の場合はローカルサーバー）が必要。
- 新版公開後、古いタブをすべて閉じて再度開くと新しいService Workerが適用される。
- 実機ブラウザテストは環境のURLアクセス制限で未完了。
