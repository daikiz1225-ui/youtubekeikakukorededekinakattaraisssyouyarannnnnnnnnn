import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { vId } = req.query;
    if (!vId) return res.status(400).json({ error: "vId is required" });

    // --- Piped サーバーリスト ---
    const PIPED_SERVERS = [
        'https://pipedapi.kavin.rocks', 'https://api-piped.mha.fi', 'https://pipedapi.adminforge.de',
        'https://pipedapi.pfcd.me', 'https://api.piped.projectsegfau.lt', 'https://pipedapi.in.projectsegfau.lt',
        'https://pipedapi.us.projectsegfau.lt', 'https://watchapi.whatever.social', 'https://api.piped.privacydev.net',
        'https://pipedapi.aeong.one', 'https://pipedapi.leptons.xyz', 'https://piped-api.garudalinux.org',
        'https://pipedapi.rivo.lol', 'https://pipedapi.colinslegacy.com', 'https://api.piped.yt',
        'https://pipedapi.palveluntarjoaja.eu', 'https://pipedapi.smnz.de', 'https://pa.mint.lgbt',
        'https://pa.il.ax', 'https://piped-api.privacy.com.de', 'https://api.piped.link',
        'https://api.piped.lunar.icu', 'https://pipedapi.osphost.fi', 'https://pipedapi.darkness.services',
        'https://pipedapi.ggtyler.dev', 'https://pipedapi.qdi.fi', 'https://piped-api.hostux.net',
        'https://pipedapi.simpleprivacy.fr', 'https://pipedapi-libre.kavin.rocks'
    ];

    // --- Invidious サーバーリスト ---
    const INVIDIOUS_SERVERS = [
        'https://invidious.nerdvpn.de', 'https://yewtu.be', 'https://invidious.f5.si',
        'https://vid.puffyan.us', 'https://invidious.snopyta.org', 'https://iv.melmac.space',
        'https://inv.vern.cc', 'https://invid-api.poketube.fun', 'https://invidious.nikkosphere.com',
        'https://lekker.gay', 'https://youtube.mosesmang.com', 'https://iv.duti.dev',
        'https://invidious.einfachzocken.eu', 'https://iv.ggtyler.dev', 'https://invidious.lunar.icu',
        'https://invidious.kavin.rocks', 'https://invidious.io.lol', 'https://inv.bp.projectsegfau.lt',
        'https://invidious.private.coffee', 'https://invidious.perennialte.ch', 'https://invidious.drgns.space',
        'https://invidious.slipfox.xyz', 'https://inv.odyssey346.dev', 'https://iv.nboeck.de',
        'https://invidious.tiekoetter.com', 'https://nyc1.iv.ggtyler.dev', 'https://inv.us.projectsegfau.lt',
        'https://cal1.iv.ggtyler.dev', 'https://invidious.lunivers.trade'
    ];

    // 1. Piped巡回 (無限リトライ)
    for (const server of PIPED_SERVERS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const resPiped = await fetch(`${server}/nextpage/video/${vId}`, { signal: controller.signal });
            clearTimeout(timeout);

            if (resPiped.ok) {
                const data = await resPiped.json();
                if (data.relatedStreams && data.relatedStreams.length > 0) {
                    const results = data.relatedStreams.map(v => ({
                        videoId: v.url ? v.url.split('v=')[1] : v.videoId,
                        title: v.title,
                        author: v.uploaderName,
                        thumbnail: v.thumbnail
                    }));
                    return res.status(200).json(results);
                }
            }
        } catch (e) { continue; }
    }

    // 2. Piped全滅時 -> Invidious巡回
    for (const server of INVIDIOUS_SERVERS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const resInv = await fetch(`${server}/api/v1/videos/${vId}`, { signal: controller.signal });
            clearTimeout(timeout);

            if (resInv.ok) {
                const data = await resInv.json();
                if (data.recommendedVideos && data.recommendedVideos.length > 0) {
                    const results = data.recommendedVideos.map(v => ({
                        videoId: v.videoId,
                        title: v.title,
                        author: v.author,
                        thumbnail: v.videoThumbnails ? v.videoThumbnails[0].url : `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`
                    }));
                    return res.status(200).json(results);
                }
            }
        } catch (e) { continue; }
    }

    // 3. 検索への逃げは絶対に行わず、エラーを返す
    return res.status(500).json({ error: "No related videos found in any instances." });
}
