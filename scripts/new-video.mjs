// 使い方: npm run new -- <URL> [genre ...]
// X / TikTok は oEmbed から author と title を埋める。Instagram は雛形のみ。
import { writeFile, access } from 'node:fs/promises';

const [rawUrl, ...genres] = process.argv.slice(2);
if (!rawUrl) { console.error('使い方: npm run new -- <URL> [genre ...]'); process.exit(1); }

// 共有リンクの余計な部分を落とす（X の /video/1、?s=46、TikTok の ?_t= など）
function normalizeUrl(u) {
  const url = new URL(u);
  url.search = '';
  url.hash = '';
  if (/(^|\.)(x|twitter)\.com$/.test(url.hostname)) {
    url.hostname = 'x.com';
    const m = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
    if (m) url.pathname = `/${m[1]}/status/${m[2]}`;
  }
  return url.toString();
}
const url = normalizeUrl(rawUrl);

const platform = /tiktok\.com/.test(url) ? 'tiktok' : /(^|\/\/)(www\.)?(x|twitter)\.com/.test(url) ? 'x' : /instagram\.com/.test(url) ? 'instagram' : null;
if (!platform) { console.error('対応外の URL'); process.exit(1); }

const postId = (url.match(/\/(video|status|reel|p)\/([A-Za-z0-9_-]+)/) ?? [])[2] ?? Date.now().toString();
const ymd = new Date().toISOString().slice(0, 10);
const file = `src/data/videos/${ymd.replace(/-/g, '')}-${platform}-${postId}.yaml`;
if (await access(file).then(() => true, () => false)) { console.error(`既にあります: ${file}`); process.exit(1); }

let title = '';
let author = '';
if (platform !== 'instagram') {
  const ep = platform === 'x'
    ? `https://publish.x.com/oembed?omit_script=1&url=${encodeURIComponent(url)}`
    : `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  const res = await fetch(ep);
  if (!res.ok) { console.error(`oEmbed 失敗 HTTP ${res.status}。URL を確認`); process.exit(1); }
  const j = await res.json();
  // X の author_name は表示名なので、URL からハンドルを取る
  author = platform === 'x' ? `@${new URL(url).pathname.split('/')[1]}` : j.author_name ? `@${String(j.author_name).replace(/^@/, '')}` : '';
  title = platform === 'tiktok' ? String(j.title ?? '').replace(/#\S+/g, '').trim().slice(0, 40) : '';
}

const q = (s) => JSON.stringify(s ?? '');
const yaml = `url: ${url}
platform: ${platform}
title: ${q(title)}
comment: ""
genres: [${genres.join(', ')}]
author: ${q(author)}
added: ${ymd}
status: active
hidden_reason:
embed_html:${platform === 'instagram' ? ' |\n  （ここに公式の埋め込みコードを貼る）' : ''}
`;
await writeFile(file, yaml);
console.log(`作成: ${file}\n次: title と comment を書く${platform === 'instagram' ? '。embed_html に埋め込みコードを貼る' : ''}`);
