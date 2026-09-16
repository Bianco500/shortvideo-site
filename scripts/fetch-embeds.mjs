// X / TikTok の oEmbed から埋め込み HTML を取得し、生死を判定して embed-cache.json に書く。
// 404/400 は「削除」と判定して ok:false。それ以外の失敗（429 やネットワーク）は前回の結果を保持する。
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from 'yaml';

const DIR = 'src/data/videos';
const OUT = 'src/data/embed-cache.json';
const ENDPOINT = {
  x: (u) => `https://publish.x.com/oembed?omit_script=1&dnt=true&lang=ja&url=${encodeURIComponent(u)}`,
  tiktok: (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
};
const stripScripts = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').trim();
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
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const prev = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));
const next = {};
const ng = [];
const warn = [];
let ok = 0;

const files = (await readdir(DIR)).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).sort();
for (const f of files) {
  const id = f.replace(/\.yaml$/, '');
  const v = parse(await readFile(`${DIR}/${f}`, 'utf8'));
  if (v.status === 'hidden' || !ENDPOINT[v.platform]) continue;

  try {
    const res = await fetch(ENDPOINT[v.platform](normalizeUrl(v.url)), { headers: { 'user-agent': 'shortvideo-site/1.0' } });
    // 404/400=削除、403=非公開・制限で公開ページに出せない。いずれも恒久的な NG
    if (res.status === 404 || res.status === 400 || res.status === 403) {
      const why = res.status === 403 ? '非公開/制限' : '削除';
      next[id] = { ok: false, error: `HTTP ${res.status}`, checked_at: today };
      ng.push(`${id}  ${v.url}  (HTTP ${res.status} ${why})`);
    } else if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    } else {
      const j = await res.json();
      next[id] = { ok: true, html: stripScripts(j.html), checked_at: today };
      ok++;
    }
  } catch (e) {
    // 一時的な失敗。前回の結果があれば保持する
    if (prev[id]) {
      next[id] = prev[id];
      warn.push(`${id}  ${e.message} → 前回の結果を保持`);
    } else {
      next[id] = { ok: false, error: e.message, checked_at: today };
      ng.push(`${id}  ${v.url}  (${e.message}; 初回取得失敗)`);
    }
  }
  await sleep(300);
}

await writeFile(OUT, JSON.stringify(next, null, 2) + '\n');
console.log(`OK ${ok} / NG ${ng.length} / 保留 ${warn.length}`);
if (warn.length) console.log('\n保留（一時的失敗）:\n' + warn.map((s) => '  ' + s).join('\n'));
if (ng.length) console.log('\nNG（status: hidden にすること）:\n' + ng.map((s) => '  ' + s).join('\n'));
