# 積読棚

買った本と、まだ読んでいない本を並べておく本棚アプリです。データはブラウザの IndexedDB に保存するので、サーバーやデータベースは不要です。

Amazon や楽天などの商品ページ、ISBN、バーコード、注文履歴CSVから本を登録し、積読 / 読書中 / 読了といった状態を管理します。

## できること

- **読書状況の管理**: 積読、読書中、読了、中断、手放した
- **積読日数**: 買ってから何日読まずにいるかを表示
- **ISBN登録**: openBD / CiNii Books / Google Books から書誌と表紙を取得
- **バーコード登録**: カメラ、または裏表紙の写真から EAN-13 / ISBN を読む
- **ECサイト取込**: Amazon / 楽天などの商品URLから ISBN を拾って書誌を取得
- **注文履歴CSV**: Amazonの注文履歴レポートなどから、本の注文だけを一括登録（家電などは除外）
- **重複防止**: 同じ ISBN は二重登録しません
- **書き出し**: 本棚を JSON / CSV でバックアップ

## 公開URL

GitHub Pages: [https://takanorip.github.io/tsundoku-manager/](https://takanorip.github.io/tsundoku-manager/)

データは各ブラウザの IndexedDB に保存されます。

## 使い方

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

最初の起動時だけ、サンプル本が数冊入ります。データは同じブラウザに残ります。空の棚から始めたい場合は、開発者ツールの Application → IndexedDB から `tsundoku-shelf` を消してください。

### Amazon / 楽天から取り込む

1. **商品URL**: 「取込」ページに Amazon や楽天ブックスの商品ページURLを貼る  
   日本の本は Amazon の ASIN が ISBN-10 になっていることが多く、そこから書誌を引きます
2. **注文履歴CSV**: Amazon.co.jp の「注文履歴レポート」を書き出してアップロードする  
   家電や食品が混ざっていても、ISBN・カテゴリー・Kindle版などから本だけを読みます  
   `title` / `isbn` だけのCSVも使えます。Shift-JIS / UTF-8 の両方に対応しています
3. **ISBN / バーコード**: ECで買っていない本は、ISBNを入力するか裏表紙を撮影して登録します

openBD と Google Books だけで、国内の本はだいたい引けます。

## 技術

- Next.js 16 / React 19 / TypeScript
- IndexedDB（ブラウザ内保存）
- [Kumo](https://kumo-ui.com/) + Tailwind CSS 4
- 書誌: [openBD](https://openbd.jp/), [CiNii Books](https://ci.nii.ac.jp/), Google Books

## テスト

```bash
npm test
```
