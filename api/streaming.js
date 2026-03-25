// api/streaming.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new Response("ID missing", { status: 400 });

    const APIS = [
        'https://invidious.f5.si', 'https://yewtu.be', 'https://iv.nboeck.de',
        'https://invidious.perennialte.ch', 'https://invidious.nerdvpn.de',
        'https://inv.tux.pizza', 'https://iv.melmac.space', 'https://iv.ggtyler.dev'
    ];

    const QUALITIES = ['720p', '1080p', '480p', '360p'];

    for (const base of APIS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(`${base}/api/v1/videos/${id}`, { signal: controller.signal });
            const data = await res.json();
            clearTimeout(timeout);

            let streamUrl = null;
            // yobi.py方式：高画質から順にストリームを検索
            for (const q of QUALITIES) {
                const found = data.formatStreams?.find(s => s.qualityLabel === q || s.quality === q);
                if (found?.url) { streamUrl = found.url; break; }
            }

            if (!streamUrl && data.formatStreams?.length > 0) streamUrl = data.formatStreams[0].url;

            if (streamUrl) {
                const videoRes = await fetch(streamUrl);
                return new Response(videoRes.body, {
                    headers: {
                        'Content-Type': 'video/mp4',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'public, max-age=3600'
                    }
                });
            }
        } catch (e) { continue; }
    }
    return new Response("Failed to fetch stream", { status: 500 });
}
