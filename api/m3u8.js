/**
 * api/m3u8.js
 * Piped API群を駆使して動画のストリーミングURL(.m3u8)を取得するプロキシ
 */

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "Video ID is required" });
    }

    // ユーザーから提供されたPipedインスタンスリスト
    const PIPED_SERVERS = [
        'https://pipedapi.kavin.rocks',
        'https://api-piped.mha.fi',
        'https://pipedapi.adminforge.de',
        'https://pipedapi.pfcd.me',
        'https://api.piped.projectsegfau.lt',
        'https://pipedapi.in.projectsegfau.lt',
        'https://pipedapi.us.projectsegfau.lt',
        'https://watchapi.whatever.social',
        'https://api.piped.privacydev.net',
        'https://pipedapi.aeong.one',
        'https://pipedapi.leptons.xyz',
        'https://piped-api.garudalinux.org',
        'https://pipedapi.rivo.lol',
        'https://pipedapi.colinslegacy.com',
        'https://api.piped.yt',
        'https://pipedapi.palveluntarjoaja.eu',
        'https://pipedapi.smnz.de',
        'https://pa.mint.lgbt',
        'https://pa.il.ax',
        'https://piped-api.privacy.com.de',
        'https://api.piped.link',
        'https://api.piped.lunar.icu',
        'https://pipedapi.osphost.fi',
        'https://pipedapi.darkness.services',
        'https://pipedapi.ggtyler.dev',
        'https://pipedapi.qdi.fi',
        'https://api.piped.rocks',
        'https://pipedapi.astreon.xyz'
    ];

    // インスタンスの順番をランダムに入れ替える（特定のサーバーに負荷を集中させないため）
    const shuffledServers = PIPED_SERVERS.sort(() => Math.random() - 0.5);

    // 生きているサーバーが見つかるまで試行
    for (const server of shuffledServers) {
        try {
            // タイムアウトを3秒に設定（遅いサーバーはすぐ見切る）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${server}/streams/${id}`, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const data = await response.json();

            // .m3u8 (HLS) があるか確認
            if (data && data.hls) {
                return res.status(200).json({
                    url: data.hls,
                    server: server, // どのサーバーから取れたかデバッグ用に返す
                    title: data.title
                });
            }
        } catch (error) {
            console.error(`Failed to fetch from ${server}:`, error.message);
            continue; // 次のサーバーへ
        }
    }

    // すべてのサーバーが失敗した場合
    return res.status(503).json({
        error: "All Piped instances failed or video is unavailable."
    });
}
