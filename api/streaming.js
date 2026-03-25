// api/streaming.js - 高画質(720p+)最優先取得版
export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new Response("Video ID is required", { status: 400 });

    // ご指定の全10サーバー
    const APIS = [
        'https://invidious.f5.si',
        'https://yewtu.be',
        'https://iv.nboeck.de',
        'https://invidious.perennialte.ch',
        'https://invidious.nerdvpn.de',
        'https://inv.tux.pizza',
        'https://iv.melmac.space',
        'https://iv.ggtyler.dev',
        'https://invidious.privacyredirect.com',
        'https://invidious.tiekoetter.com'
    ];

    // 画質の優先順位：1080p > 720p を最優先
    const TARGET_QUALITIES = ['1080p', '720p', '480p', '360p'];

    for (const base of APIS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch(`${base}/api/v1/videos/${id}`, { signal: controller.signal });
            const data = await res.json();
            clearTimeout(timeoutId);

            let streamUrl = null;

            // 1. まずは 1080p や 720p の「映像＋音声」セットを探す
            for (const q of TARGET_QUALITIES) {
                const found = data.formatStreams?.find(s => s.qualityLabel === q || s.quality === q);
                if (found && found.url) {
                    streamUrl = found.url;
                    break; 
                }
            }

            // 2. もしセット品に見つからなければ、adaptiveFormats(映像のみ)から高画質を探す
            // ※ただし音声が出ない可能性があるため、1を優先しています
            if (!streamUrl) {
                for (const q of ['1080p', '720p']) {
                    const found = data.adaptiveFormats?.find(s => (s.qualityLabel === q || s.quality === q) && s.type.includes('video/mp4'));
                    if (found && found.url) {
                        streamUrl = found.url;
                        break;
                    }
                }
            }

            // 3. 最終手段：なんでもいいから一番上のやつ
            if (!streamUrl && data.formatStreams?.length > 0) {
                streamUrl = data.formatStreams[0].url;
            }

            if (streamUrl) {
                return Response.redirect(streamUrl, 302);
            }
        } catch (e) {
            continue;
        }
    }

    return new Response("全てのサーバーで高画質ソースが見つかりませんでした。", { status: 500 });
}
