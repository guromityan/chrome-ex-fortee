# fortee タイムテーブル ホバープレビュー

[fortee](https://fortee.jp) のタイムテーブルで、セッションのセルにカーソルを合わせると、
ページを離れずにそのトークの詳細（概要・スピーカー・トラック・時間・お気に入り）を
フローティングパネルで表示する Chrome 拡張です。

対象ページ:

- `https://fortee.jp/yapc-tokyo-2026/timetable`（前夜祭・Day 1・Day 2 の各日ページを含む）
- 同じ構造の fortee イベント（`https://fortee.jp/<event>/timetable*`）でもそのまま動作します

## 使い方

1. タイムテーブルを開く
2. トークのセルにカーソルを合わせる（約 150ms 静止するとパネルが開きます）
3. パネル内にカーソルを移すとリンクをクリックできます（`forteeで開く` で元ページへ）
4. 「お気に入り」ボタンで fortee 上のお気に入りを追加・解除できます（要ログイン）
5. `Esc` またはカーソルを外すとパネルは閉じます

休憩・受付などトークの詳細ページを持たないコマではパネルは開きません。
キーボード操作の場合は、セル内のリンクにフォーカスするとパネルが開きます。

## Chrome への読み込み（unpacked）

1. `chrome://extensions` を開く
2. 右上の **デベロッパーモード** を ON
3. **パッケージ化されていない拡張機能を読み込む** をクリック
4. このリポジトリの **`extension/`** ディレクトリ（`manifest.json` があるディレクトリ）を選択
5. `https://fortee.jp/yapc-tokyo-2026/timetable` を開いてセッションにカーソルを合わせる

ビルドは不要です。`extension/` がそのまま読み込める構成になっています。
（テスト用の `node_modules/` などを拡張機能に含めないため、拡張機能本体は `extension/` に分けています。
Chrome は `_` で始まるファイル名を含むディレクトリを拡張機能として読み込めないため、リポジトリのルートは選べません。）
コードを変更したら `chrome://extensions` で拡張機能の再読み込みを行ってください。

## 仕組み

- タイムテーブルのセル（`.proposal`）のうち、詳細ページへのリンクを持つものだけを対象にします
- ホバー時に詳細ページ (`/<event>/proposal/<uuid>`) を同一オリジンで `fetch` し、
  `DOMParser` で解析して必要な項目だけを取り出します（ログイン状態も引き継がれます）
- 取得した概要 HTML はホワイトリスト方式でサニタイズしてから挿入します
  （`script` / `iframe` / `img` / イベントハンドラは除去）
- 同じトークは一度だけ取得してキャッシュし、失敗した場合は次のホバーで再試行します
- 読み込み中・取得失敗・概要未登録は、それぞれパネル内に日本語で表示します
- お気に入りは fortee 本体と同じ `POST /<event>/proposal/fav`（`uuid` / `on`）を呼びます。
  未ログイン時は「ログインが必要です」と案内し、成功時はタイムテーブル上のピンク帯（`.fav`）も同期します
- パネル幅は 760px（`max-width: calc(100vw - 24px)` で画面内に収めます）

### ファイル構成

| パス | 役割 |
| --- | --- |
| `extension/manifest.json` | Manifest V3 定義（対象 URL、content script、CSS） |
| `extension/content.js` | content script から ES モジュール本体を読み込むブートストラップ |
| `extension/src/main.js` | 実ページとの配線（`fetch` とタイムテーブル判定） |
| `extension/src/hover-preview.js` | ホバー/フォーカスの制御、パネルの開閉 |
| `extension/src/panel.js` | パネルの描画（読み込み中・詳細・エラー） |
| `extension/src/timetable.js` | タイムテーブル DOM からトークを特定 |
| `extension/src/proposal-page.js` | 詳細ページ HTML から表示項目を抽出 |
| `extension/src/proposal-store.js` | 取得とキャッシュ |
| `extension/src/favorite.js` | お気に入り API 呼び出しとタイムテーブル帯の同期 |
| `extension/src/sanitize.js` | 概要 HTML のサニタイズ |
| `extension/src/position.js` | パネルの配置計算（画面外にはみ出さない） |
| `extension/styles/panel.css` | パネルのスタイル（ダークモード対応） |

## 開発

```sh
npm install
npm test          # vitest（jsdom + fortee の実 HTML をフィクスチャに使用）
npm run typecheck # tsc --noEmit（JSDoc 型チェック）
```

`test/fixtures/` には fortee.jp から取得した実際の HTML を置いています。
fortee 側のマークアップが変わった場合は、フィクスチャを取り直してテストを更新してください。
