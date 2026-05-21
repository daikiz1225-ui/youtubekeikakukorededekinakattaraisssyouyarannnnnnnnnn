export const config = { runtime: 'edge' };

const JP_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;

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

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');
    if (!vId) return new Response(JSON.stringify(["No ID"]), { status: 400 });

    // 全体で4.5秒（4500ms）経ったら遅いインスタンスを強制的に切り捨てるコントローラー
    const globalController = new AbortController();
    const timeoutId = setTimeout(() => globalController.abort(), 4500);

    // 1. 全てのAPIインスタンスに対して一斉に fetch を開始
    const fetchPromises = APIS.map(async (base) => {
        try {
            const res = await fetch(`${base}/api/v1/videos/${vId}?region=JP`, { 
                signal: globalController.signal 
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null; // エラーが起きた・応答が遅いインスタンスは無視してnullを返す
        }
    });

    // 2. 27個のプロミスを同時に並列実行（どれか1つが死んでも他を巻き添えにしない）
    const results = await Promise.allSettled(fetchPromises);
    clearTimeout(timeoutId);

    let allRelatedVideos = [];

    // 3. 制限時間内に正常にデータが取れたインスタンスの結果をすべて1つの配列に集約
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
            const data = result.value;
            const related = data.relatedVideos || data.recommendedVideos || [];
            allRelatedVideos.push(...related);
        }
    }

    // 4. データが1件も回収できなかった場合はエラーを返す
    if (allRelatedVideos.length === 0) {
        return new Response(JSON.stringify({ error: "ALL_APIS_DOWN_OR_EMPTY" }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 5. 前までと同じロジック：日本語タイトルが含まれている動画のみをフィルタリング
    let filtered = allRelatedVideos.filter(v => {
        return v.title && JP_REGEX.test(v.title);
    });

    // 6. 複数サイトから同時にかき集めたため、重複している videoId を完全に排除し最大40件にする
    const seenIds = new Set();
    const resultIds = [];
    for (const v of filtered) {
        if (v.videoId && !seenIds.has(v.videoId)) {
            seenIds.add(v.videoId);
            resultIds.push(v.videoId);
            if (resultIds.length >= 40) break; // 必要十分な件数が集まったら終了
        }
    }

    // 7. フロント（app.js）へマージ済みのデータを一発で返却
    return new Response(JSON.stringify(resultIds), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
