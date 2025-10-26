# Create T3 App

このプロジェクトは `create-t3-app` で初期化した [T3 Stack](https://create.t3.gg/) アプリケーションです。Drizzle ORM を利用して PostgreSQL と連携する Todo アプリのサンプルになっています。

## 前提条件

- Node.js 20 以上
- PostgreSQL 15 以上（ローカルに用意するか、Docker コンテナで起動してください）

## 環境変数

`.env` に次の値を設定してください。

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/t3_todo
NODE_ENV=development
```

`DATABASE_URL` は PostgreSQL の接続文字列です。ホスト名や認証情報は利用する環境に合わせて変更してください。

## PostgreSQL の起動例

Docker を利用する場合は次のコマンドで PostgreSQL を起動できます。

```bash
docker run --name t3-todo-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=t3_todo -p 5432:5432 -d postgres:16
```

> 既にポート 5432 を使用している場合は `-p` のホスト側ポート番号を変更してください。

## マイグレーション

初回起動時はスキーマを適用するためにマイグレーションを実行してください。

```bash
npm install
npm run db:migrate
```

Drizzle Studio でデータを確認したい場合は `npm run db:studio` を使用できます。

## 開発サーバーの起動

マイグレーション完了後、開発サーバーを起動すると Todo アプリを確認できます。

```bash
npm run dev
```

## 利用可能なスクリプト

- `npm run db:generate` — スキーマから SQL マイグレーションを生成
- `npm run db:migrate` — マイグレーションを適用
- `npm run db:studio` — Drizzle Studio を起動
- `npm run typecheck` — TypeScript の型チェックを実行
- `npm test` — 単体テストを実行

## ドキュメント

T3 Stack の詳細は以下を参照してください。

- [公式ドキュメント](https://create.t3.gg/)
- [学習リソース](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available)

## デプロイ

Vercel、Netlify、Docker などのデプロイ方法は [公式ガイド](https://create.t3.gg/en/deployment/vercel) を参照してください。
