import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { vId } = req.query;

    if (!vId) {
        return res.status(400).json({ error: "vId is required" });
    }

    // --- 送信された Invidious サーバーリスト ---
    const INVIDIOUS_SERVERS = [
        'https://invidious.nerdvpn.de',
        'https://yewtu.be',
        'https://invidious.f5.si',
        'https://vid.puffyan.us',
        'https://invidious.snopyta.org',
        'https://iv.melmac.space',
        'https://inv.vern.cc',
        'https://invid-api.poketube.fun',
        'https://invidious.nikkosphere.com',
        'https://lekker.gay',
        'https://youtube.mosesmang.com',
        'https://iv.duti.dev',
        'https://invidious.einfachzocken.eu',
        'https://iv.ggtyler.dev',
        'https://invidious.lunar.icu',
        'https://invidious.kavin.rocks',
        'https://invidious.io.lol',
        'https://inv.bp.projectsegfau.lt',
        'https://invidious.private.coffee',
        'https://invidious.perennialte.ch',
        'https://invidious.drgns.space',
        'https://invidious.slipfox.xyz',
        'https://inv.odyssey346.dev',
        'https://iv.nboeck.de',
        'https://invidious.tiekoetter.com',
        'https://nyc1.iv.ggtyler.dev',
        'https://inv.us.projectsegfau.lt',
        'https://cal1.iv.ggtyler.dev',
        'https://invidious.lunivers.trade'
    ];

    // 成功するまでリストを巡回する（無限リトライロジック）
    for (const server of INVIDIOUS_SERVERS) {
        try {
            // 各サーバーに対して3秒のタイムアウトを設定（応答が遅いサーバーは飛ばす）
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${server}/api/v1/videos/${vId}`, {
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                
                // Invidious APIの recommendedVideos 配列を確認
                if (data.recommendedVideos && data.recommendedVideos.length > 0) {
                    // フロントエンド（app.js）で使いやすい形式に整形
                    const results = data.recommendedVideos.map(v => ({
                        videoId: v.videoId,
                        title: v.title,
                        author: v.author,
                        // サムネイルはプロキシを通すか、mqdefaultなどを生成
                        thumbnail: v.videoThumbnails ? v.videoThumbnails[0].url : `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`
                    }));

                    // 成功したら即座に返して終了
                    return res.status(200).json(results);
                }
            }
        } catch (e) {
            // エラー（タイムアウトや接続拒否）が発生した場合は、ログを出さずに次のサーバーへ
            continue;
        }
    }

    // 全てのサーバーが全滅した場合（検索への逃げは禁止）
    return res.status(500).json({ error: "All Invidious instances failed. No related videos found." });
}
