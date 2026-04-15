export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');

    if (!vId) return new Response(JSON.stringify([]), { status: 400 });

    const TARGET_INSTANCE = 'https://inv.thepixora.com';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        // URLの末尾に region=JP を追加
        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}?region=JP`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!res.ok) return new Response(JSON.stringify([]), { status: 200 });

        const data = await res.json();
        clearTimeout(timeoutId);

        let ids = [];
        if (data.relatedVideos && Array.isArray(data.relatedVideos)) {
            // 日本語が含まれている動画を優先的にフィルタリングするロジック（簡易版）を足すことも可能ですが、
            // まずは region 指定でインスタンスの挙動を見ます
            ids = data.relatedVideos.map(v => v.videoId).filter(id => id);
        }

        return new Response(JSON.stringify(ids), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        return new Response(JSON.stringify([]), { status: 200 });
    }
}
