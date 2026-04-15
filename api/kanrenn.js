// api/kanrenn.js - 指定のインスタンスのみを使用するシンプル版
export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');

    if (!vId) {
        return new Response(JSON.stringify([]), { status: 400 });
    }

    const TARGET_INSTANCE = 'https://inv.thepixora.com';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒タイムアウト

        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}`, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        clearTimeout(timeoutId);

        // data.relatedVideos が存在するかチェック
        if (data && data.relatedVideos) {
            // videoId だけを取り出して配列にする
            const idList = data.relatedVideos
                .filter(v => v.videoId) // IDが空のものを除外
                .map(v => v.videoId);

            return new Response(JSON.stringify(idList), {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }

        return new Response(JSON.stringify([]), { status: 200 });

    } catch (err) {
        console.error("Fetch Error:", err.message);
        return new Response(JSON.stringify([]), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
