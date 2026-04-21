export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');

    if (!vId) return new Response(JSON.stringify(["No ID"]), { status: 400 });

    // インスタンス設定
    const TARGET_INSTANCE = 'https://inv.thepixora.com';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        // --- 修正箇所: region=JP を追加して日本向けの関連動画をリクエスト ---
        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}?region=JP`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!res.ok) {
            return new Response(JSON.stringify([`Error: ${res.status}`]), { status: 200 });
        }

        const data = await res.json();
        clearTimeout(timeoutId);

        // --- ID抽出ロジック ---
        let ids = [];

        if (data.relatedVideos && Array.isArray(data.relatedVideos)) {
            ids = data.relatedVideos.map(v => v.videoId).filter(id => id);
        } 
        else if (data.recommendedVideos && Array.isArray(data.recommendedVideos)) {
            ids = data.recommendedVideos.map(v => v.videoId).filter(id => id);
        }

        if (ids.length === 0) {
            console.log("No related videos found.");
            return new Response(JSON.stringify(["DEBUG_EMPTY_DATA"]), { status: 200 });
        }

        return new Response(JSON.stringify(ids), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800'
            }
        });

    } catch (e) {
        console.error("Fetch error:", e);
        return new Response(JSON.stringify(["Fetch Error"]), { status: 200 });
    }
}
