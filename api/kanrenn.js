// api/kanrenn.js - 成功するまで無限にサーバーを巡回し、動画IDを抜き出す
export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');

    if (!vId) return new Response(JSON.stringify([]), { status: 400 });

    const INSTANCES = [
        'https://inv.thepixora.com',
        'https://iv.nboeck.de',
        'https://invidious.asir.dev',
        'https://inv.n66.be',
        'https://yewtu.be',
        'https://invidious.nerdvpn.de',
        'https://invidious.f5.si',
        'https://inv.tux.pizza',
        'https://iv.melmac.space',
        'https://invidious.lunar.icu'
    ];

    // 成功するまで終わらない無限ループ
    while (true) {
        for (const base of INSTANCES) {
            try {
                const controller = new AbortController();
                // 1.5秒でタイムアウトさせて次へ
                const timeoutId = setTimeout(() => controller.abort(), 1500);

                // region=JPを外して、とにかくレスポンス率を優先
                const res = await fetch(`${base}/api/v1/videos/${vId}`, {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                if (!res.ok) throw new Error("Next");

                const data = await res.json();
                clearTimeout(timeoutId);

                // 関連動画が存在するか確認
                if (data && data.relatedVideos && data.relatedVideos.length > 0) {
                    const idList = data.relatedVideos
                        .filter(v => v.videoId)
                        .map(v => v.videoId);

                    return new Response(JSON.stringify(idList), {
                        status: 200,
                        headers: { 
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*' 
                        }
                    });
                }
            } catch (err) {
                // 失敗したら即座に次のサーバーへ
                continue; 
            }
        }
        // リスト1周して全滅した場合、1秒だけ待って最初からやり直し
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
