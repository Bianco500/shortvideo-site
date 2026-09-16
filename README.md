# shortvideo-site

ショート動画のおすすめ・ランキングサイト。X / Instagram / TikTok の公式埋め込みのみを使用。

- 手順書と運用フロー: Obsidian vault の `inbox/shortvideo-site-setup.md`
- 動画を追加: `npm run new -- <URL> <genre>`
- 生死チェック: `npm run fetch-embeds`
- 確認: `npm run dev -- --host` / `npm run build && npm run preview`
- 公開: `main` に push すると Cloudflare Pages が自動デプロイ
