# better-auth-org-demo

[better-auth](https://better-auth.com) の [organization plugin](https://better-auth.com/docs/plugins/organization) が
**組織を作った瞬間にデータベースへ何を書くのか**を目で見るためのデモアプリです。

画面は左右 2 ペインで、左が操作パネル、右が `demo.db` を 1 秒ごとに読み直すライブビューアです。
`createOrganization` を押すと `organization` と `member` の 2 行が同時に増える様子がそのまま見えます。

## 構成

| ファイル | 役割 |
| --- | --- |
| `lib/auth.ts` | `betterAuth()` の設定。organization plugin、`databaseHooks`、`organizationHooks` |
| `lib/permissions.ts` | `createAccessControl` による権限定義。`defaultStatements` のマージ例 |
| `lib/auth-client.ts` | `organizationClient()` を載せたクライアント |
| `db/schema.ts` | better-auth の CLI（`npx auth@latest generate`）が出力した Drizzle スキーマ |
| `app/api/db-snapshot/route.ts` | ライブビューア用に各テーブルを返すだけの API |
| `components/DbViewer.tsx` | 右ペイン。新しく増えた行を緑でハイライトする |
| `scripts/record.mjs` | Playwright + ffmpeg で操作を GIF に録画する |

## 動かす

```bash
npm install
cp .env.example .env    # BETTER_AUTH_SECRET を適当な値に
npx drizzle-kit push
npm run dev
```

http://localhost:3000 を開き、サインアップ → createOrganization の順に押してください。

## GIF を撮り直す

`npm run dev` を起動した状態で:

```bash
node scripts/record.mjs
```

`recordings/*.gif` が生成されます。

## 注意

認証情報や設定はデモ用に振り切っています。メール確認は無効、招待メールはサーバログに URL を出すだけ、
`.env` は gitignore しているので、`.env.example` をコピーして `BETTER_AUTH_SECRET` を自分で設定してください。そのまま本番に持っていかないでください。
