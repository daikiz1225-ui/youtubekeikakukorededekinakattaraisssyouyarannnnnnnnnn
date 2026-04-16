/**
 * api/m3u8.js - デバッグ強化版
 */

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "Video ID is required" });
    }

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

    const shuffledServers = PIPED_SERVERS.sort(() => Math.random() - 0.5);
    
    let lastError = null;
    let lastFailedServer = null;

    for (const server of shuffledServers) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4秒に少し延長

            const response = await fetch(`${server}/streams/${id}`, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // HTTPエラー（403, 429, 500等）の内容を記録
                const errorText = await response.text().catch(() => "No error body");
                lastError = `HTTP ${response.status}: ${errorText.substring(0, 100)}`;
                lastFailedServer = server;
                console.warn(`[Piped Error] ${server} returned ${lastError}`);
                continue;
            }

            const data = await response.json();

            if (data && data.hls) {
                return res.status(200).json({
                    url: data.hls,
                    server: server,
                    title: data.title
                });
            } else {
                lastError = "HLS URL not found in response";
                lastFailedServer = server;
            }
        } catch (error) {
            lastError = error.name === 'AbortError' ? "Timeout" : error.message;
            lastFailedServer = server;
            console.error(`[Piped Fetch Failed] ${server}: ${lastError}`);
            continue;
        }
    }

    // すべて失敗した場合、最後に起きたエラーを詳細に返す
    return res.status(503).json({
        error: "All Piped instances failed.",
        debug: {
            last_failed_server: lastFailedServer,
            reason: lastError,
            video_id: id
        }
    });
}
