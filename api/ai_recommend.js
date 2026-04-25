export const config = { runtime: 'edge' };

const JP_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;

const APIS = [
    'https://invidious.f5.si',
    'https://yewtu.be',
    'https://iv.nboeck.de',
    'https://invidious.perennialte.ch',
    'https://invidious.nerdvpn.de',
    'https://inv.tux.pizza',
    'https://iv.melmac.space',
    'https://iv.ggtyler.dev',
    'https://invidious.privacyredirect.com',
    'https://invidious.tiekoetter.com'
];

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');
    if (!vId) return new Response(JSON.stringify(["No ID"]), { status: 400 });

    for (const base of APIS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch(`${base}/api/v1/videos/${vId}?region=JP`, { signal: controller.signal });
            if (!res.ok) continue;

            const data = await res.json();
            clearTimeout(timeoutId);

            const baseCategoryId = data.categoryId;
            const related = data.relatedVideos || data.recommendedVideos || [];

            // フィルタリング：日本語、かつショート動画（60秒以下）を除外
            let filtered = related.filter(v => {
                const isJp = v.title && JP_REGEX.test(v.title);
                const isNotShort = v.lengthSeconds > 60; 
                return isJp && isNotShort;
            });

            if (filtered.length === 0) continue; // このインスタンスに日本語動画がなければ次へ

            // カテゴリ一致を優先
            if (baseCategoryId) {
                filtered.sort((a, b) => {
                    const aMatch = a.categoryId === baseCategoryId ? 1 : 0;
                    const bMatch = b.categoryId === baseCategoryId ? 1 : 0;
                    return bMatch - aMatch;
                });
            }

            const resultIds = [...new Set(filtered.map(v => v.videoId))].slice(0, 40);

            return new Response(JSON.stringify(resultIds), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (e) {
            continue;
        }
    }

    return new Response(JSON.stringify(["DEBUG_EMPTY_DATA"]), { status: 200 });
}
