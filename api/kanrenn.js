export const config = { runtime: 'edge' };

function isJapanese(text) {
    return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

// streaming.js と同じ10個のインスタンス
const APIS = [
  'https://inv.nadeko.net/',
  'https://invidious.f5.si/',
  'https://invidious.lunivers.trade/',
  'https://invidious.ducks.party/',
  'https://iv.melmac.space/',
  'https://invidious.nerdvpn.de/',
  'https://invidious.privacyredirect.com',
  'https://invidious.technicalvoid.dev',
  'https://invidious.darkness.services',
  'https://invidious.nikkosphere.com',
  'https://invidious.schenkel.eti.br',
  'https://invidious.tiekoetter.com',
  'https://invidious.perennialte.ch',
  'https://invidious.reallyaweso.me',
  'https://invidious.private.coffee',
  'https://invidious.privacydev.net',
  'https://yewtu.be',
  'https://iv.nboeck.de',
  'https://inv.tux.pizza',
  'https://iv.ggtyler.dev',
  'https://yt.omada.cafe',
  'https://super8.absturztau.be',
  'https://invidious.adminforge.de',
  'https://youtube.alt.tyil.nl',
  'https://rust.oskamp.nl',
  'https://invidious.nietzospannend.nl',
  'https://youtube.mosesmang.com'
];

async function fetchRelatedWithFallback(vId) {
    for (const base of APIS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch(`${base}/api/v1/videos/${vId}?region=JP`, { signal: controller.signal });
            if (!res.ok) continue; // ダメなら次のインスタンスへ
            
            const data = await res.json();
            clearTimeout(timeoutId);
            
            const related = data.relatedVideos || data.recommendedVideos || [];
            // 日本語が含まれる動画のみを抽出
            const filtered = related.filter(v => isJapanese(v.title));
            
            if (filtered.length > 0) return filtered; // 見つかれば即座に返す
        } catch (e) {
            continue; // エラーなら次のインスタンスへ
        }
    }
    return [];
}

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');

    if (!vId) return new Response(JSON.stringify(["No ID"]), { status: 400 });

    try {
        let finalJapaneseVideos = await fetchRelatedWithFallback(vId);
        const resultIds = finalJapaneseVideos.map(v => v.videoId);

        if (resultIds.length === 0) {
            return new Response(JSON.stringify(["DEBUG_EMPTY_DATA"]), { status: 200 });
        }

        return new Response(JSON.stringify(resultIds), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify(["ERROR"]), { status: 500 });
    }
}
