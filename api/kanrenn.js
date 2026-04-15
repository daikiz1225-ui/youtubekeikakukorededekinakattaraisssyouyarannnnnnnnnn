// api/kanrenn.js - 成功するまで巡回し、動画IDの配列のみを返す
export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');

    if (!vId) {
        return new Response(JSON.stringify([]), { status: 400 });
    }

    // 巡回する全インスタンス
    const INSTANCES = [
        'https://inv.thepixora.com',
        'https://invidious.nerdvpn.de',
        'https://yewtu.be',
        'https://invidious.f5.si',
        'https://vid.puffyan.us',
        'https://inv.vern.cc',
        'https://invidious.io.lol',
        'https://iv.melmac.space',
        'https://invid-api.poketube.fun',
        'https://invidious.nikkosphere.com',
        'https://lekker.gay',
        'https://iv.duti.dev',
        'https://invidious.lunar.icu',
        'https://invidious.kavin.rocks',
        'https://inv.bp.projectsegfau.lt',
        'https://invidious.private.coffee',
        'https://invidious.drgns.space',
        'https://invidious.slipfox.xyz',
        'https://inv.odyssey346.dev',
        'https://iv.nboeck.de',
        'https://invidious.tiekoetter.com',
        'https://invidious.lunivers.trade'
    ];

    for (const base of INSTANCES) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒で次へ

            const res = await fetch(`${base}/api/v1/videos/${vId}`, {
                signal: controller.signal
            });

            if (!res.ok) throw new Error();

            const data = await res.json();
            clearTimeout(timeoutId);

            if (data && data.relatedVideos) {
                // 動画IDだけの配列を作成
                const idList = data.relatedVideos
                    .filter(v => v.videoId) // IDがあるものだけ
                    .map(v => v.videoId);

                return new Response(JSON.stringify(idList), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        } catch (err) {
            continue; // 失敗したら即座に次のインスタンスへ
        }
    }

    return new Response(JSON.stringify([]), { status: 500 });
}
