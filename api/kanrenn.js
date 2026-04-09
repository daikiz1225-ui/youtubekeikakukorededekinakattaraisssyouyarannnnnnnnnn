// api/kanrenn.js

export default async function handler(req, res) {
    const { videoId } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: "videoId is required" });
    }

    const instances = [
        'https://inv.nadeko.net/', 'https://invidious.f5.si/', 'https://lunivers.trade/',
        'https://invidious.ducks.party/', 'https://iv.melmac.space/', 'https://invidious.nerdvpn.de/',
        "https://invidious.privacyredirect.com", "https://invidious.technicalvoid.dev",
        "https://invidious.darkness.services", "https://invidious.nikkosphere.com",
        "https://invidious.schenkel.eti.br", "https://invidious.tiekoetter.com",
        "https://invidious.perennialte.ch", "https://invidious.reallyaweso.me",
        "https://invidious.private.coffee", "https://invidious.privacydev.net",
    ];

    // 各インスタンスを試行する関数
    async function tryFetch(instance) {
        // URLの末尾のスラッシュを調整
        const baseUrl = instance.endsWith('/') ? instance.slice(0, -1) : instance;
        const targetUrl = `${baseUrl}/api/v1/videos/${videoId}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5秒でタイムアウト

        try {
            const response = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) return null;

            const data = await response.json();
            if (!data.recommendedVideos) return null;

            // 共通フォーマットに整形
            return data.recommendedVideos.map(v => ({
                id: v.videoId,
                title: v.title,
                channelTitle: v.author,
                thumbnail: v.videoThumbnails?.find(t => t.quality === "medium")?.url || v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
                viewCount: v.viewCountText || "不明",
                duration: v.lengthSeconds || 0
            }));
        } catch (e) {
            return null;
        }
    }

    // リストの順に実行（どれか成功したら終了）
    for (const instance of instances) {
        const result = await tryFetch(instance);
        if (result) {
            // キャッシュヘッダーを設定（VercelのCDNで1時間キャッシュ）
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
            return res.status(200).json(result);
        }
    }

    res.status(500).json({ error: "All instances failed" });
}
