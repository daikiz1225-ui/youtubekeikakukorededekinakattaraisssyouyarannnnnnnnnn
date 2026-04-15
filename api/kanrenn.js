export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');

    if (!vId) return new Response(JSON.stringify(["No ID"]), { status: 400 });

    const TARGET_INSTANCE = 'https://inv.thepixora.com';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 少し長めに待機

        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!res.ok) {
            return new Response(JSON.stringify([`Error: ${res.status}`]), { status: 200 });
        }

        const data = await res.json();
        clearTimeout(timeoutId);

        // --- ID抽出ロジックの強化 ---
        let ids = [];

        // パターン1: 標準的な relatedVideos
        if (data.relatedVideos && Array.isArray(data.relatedVideos)) {
            ids = data.relatedVideos.map(v => v.videoId).filter(id => id);
        } 
        // パターン2: 推奨動画 (recommendedVideos) という名前の場合もあるため
        else if (data.recommendedVideos && Array.isArray(data.recommendedVideos)) {
            ids = data.recommendedVideos.map(v => v.videoId).filter(id => id);
        }

        // それでも空なら、データの中身自体がおかしい
        if (ids.length === 0) {
            console.log("No related videos found in the JSON structure.");
            // デバッグ用に、インスタンスが返してきた生データの一部を文字化け覚悟で返す設定も可能ですが、
            // まずは空かどうかをフロントに伝えます。
            return new Response(JSON.stringify(["DEBUG_EMPTY_DATA"]), { status: 200 });
        }

        return new Response(JSON.stringify(ids), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        return new Response(JSON.stringify([`Fetch Error: ${err.message}`]), { status: 200 });
    }
}
