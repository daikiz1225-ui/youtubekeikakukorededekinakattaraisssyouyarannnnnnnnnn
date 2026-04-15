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
        'https://invidious.f5.si'
    ];

    // 無限ループ開始
    while (true) {
        for (const base of INSTANCES) {
            try {
                const controller = new AbortController();
                // 1.5秒で見切りをつけて次へ（回転を速くする）
                const timeoutId = setTimeout(() => controller.abort(), 1500);

                const res = await fetch(`${base}/api/v1/videos/${vId}?region=JP`, {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                if (!res.ok) throw new Error("Next server");

                const data = await res.json();
                clearTimeout(timeoutId);

                if (data?.relatedVideos?.length > 0) {
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
                // 失敗しても何もしない。ただ次のインスタンスへ進むだけ
                continue; 
            }
        }
        
        // --- リストを1周しても見つからなかった場合 ---
        // サーバーを叩きすぎてブロックされないよう、1周ごとに1秒だけ待機して再開
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Restarting loop for ID:", vId);
    }
}
