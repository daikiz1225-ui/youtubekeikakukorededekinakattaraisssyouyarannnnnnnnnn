// api/streaming.js - 高速ガチャ＆ダイレクト転送版
export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new Response("Video ID is required", { status: 400 });

    // main.py と yobi.py から抽出した、今生きている可能性が高いサーバーリスト
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

    // yobi.py の TARGET_QUALITIES (高画質優先)
    const QUALITIES = ['720p', '1080p', '480p', '360p'];

    // サーバーを一個ずつ超高速でチェック
    for (const base of APIS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒で諦めて次へ

            const res = await fetch(`${base}/api/v1/videos/${id}`, { signal: controller.signal });
            const data = await res.json();
            clearTimeout(timeoutId);

            let streamUrl = null;
            
            // 高画質から順にURLがあるか確認
            for (const q of QUALITIES) {
                const found = data.formatStreams?.find(s => s.qualityLabel === q || s.quality === q);
                if (found && found.url) {
                    streamUrl = found.url;
                    break;
                }
            }

            // 見つからなければ予備のストリームを使用
            if (!streamUrl && data.formatStreams?.length > 0) {
                streamUrl = data.formatStreams[0].url;
            }

            if (streamUrl) {
                // 【重要】サーバーで中継せず、見つけたURLに直接飛ばす！
                // これにより黒い画面で止まるのを防ぎます
                return Response.redirect(streamUrl, 302);
            }
        } catch (e) {
            // このサーバーがダメなら次のサーバーへ（ガチャ継続）
            continue;
        }
    }

    return new Response("全てのサーバーが応答しませんでした。少し時間を置いて再試行してください。", { status: 500 });
}
