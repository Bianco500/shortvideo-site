import { getCollection, type CollectionEntry } from 'astro:content';
import cache from '../data/embed-cache.json';

type Cache = Record<string, { ok: boolean; html?: string }>;
const embedCache = cache as Cache;

export type VideoView = CollectionEntry<'videos'> & { html: string };

const stripScripts = (h: string) => h.replace(/<script[\s\S]*?<\/script>/gi, '').trim();

/** Instagram 公式の埋め込みと同じ blockquote を URL から組み立てる。embed.js がこれを公式プレイヤーに置き換える */
function instagramBlockquote(url: string): string {
  const m = url.match(/instagram\.com\/(reels?|p|tv)\/([A-Za-z0-9_-]+)/);
  if (!m) return '';
  const kind = m[1] === 'reels' ? 'reel' : m[1];
  const permalink = `https://www.instagram.com/${kind}/${m[2]}/`;
  return `<blockquote class="instagram-media" data-instgrm-permalink="${permalink}" data-instgrm-version="14"></blockquote>`;
}

function withHtml(v: CollectionEntry<'videos'>): VideoView | null {
  if (v.data.status === 'hidden') return null;
  if (v.data.platform === 'instagram') {
    const html = v.data.embed_html ? stripScripts(v.data.embed_html) : instagramBlockquote(v.data.url);
    if (!html) return null;
    return { ...v, html };
  }
  const c = embedCache[v.id];
  if (!c?.ok || !c.html) return null; // 未取得 or 削除済み
  return { ...v, html: c.html };
}

/** 表示できる動画だけ。新しい順 */
export async function visibleVideos(): Promise<VideoView[]> {
  const all = await getCollection('videos');
  return all
    .map(withHtml)
    .filter((v): v is VideoView => v !== null)
    .sort((a, b) => b.data.added.getTime() - a.data.added.getTime());
}

/** 週ファイルの ID 配列を、順序を保って動画に解決する。存在しない/隠れた ID はビルドを止める */
export async function byIds(ids: string[], context: string): Promise<VideoView[]> {
  const all = await visibleVideos();
  const map = new Map(all.map((v) => [v.id, v]));
  return ids.map((id) => {
    const v = map.get(id);
    if (!v) throw new Error(`[${context}] 動画 ID "${id}" が存在しないか hidden/削除済みです`);
    return v;
  });
}

export async function weeksDesc() {
  const weeks = await getCollection('weeks');
  return weeks.sort((a, b) => (a.id < b.id ? 1 : -1));
}

export async function latestWeek() {
  const [w] = await weeksDesc();
  if (!w) throw new Error('src/data/weeks/ に週ファイルがありません');
  return w;
}
