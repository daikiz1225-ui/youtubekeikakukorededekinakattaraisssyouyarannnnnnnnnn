// api/kanrenn.js - 高耐久 関連動画プロキシ
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

const INVIDIOUS_SERVERS = [
    'https://invidious.nerdvpn.de', 'https://yewtu.be', 'https://invidious.f5.si', 'https://vid.puffyan.us',
    'https://invidious.snopyta.org', 'https://iv.melmac.space', 'https://inv.vern.cc', 'https://invid-api.poketube.fun',
    'https://invidious.nikkosphere.com', 'https://lekker.gay', 'https://youtube.mosesmang.com', 'https://iv.duti.dev',
    'https://invidious.einfachzocken.eu', 'https://iv.ggtyler.dev', 'https://invidious.lunar.icu', 'https://invidious.kavin.rocks',
    'https://invidious.io.lol', 'https://inv.bp.projectsegfau.lt', 'https://invidious.private.coffee', 'https://invidious.perennialte.ch',
    'https://invidious.drgns.space', 'https://invidious.slipfox.xyz', 'https://inv.odyssey346.dev', 'https://iv.nboeck.de',
    'https://invidious.tiekoetter.com', 'https://nyc1.iv.ggtyler.dev', 'https://inv.us.projectsegfau.lt', 'https://cal1.iv.ggtyler.dev',
    'https://invidious.lunivers.trade', 'https://invidious.reallyaweso.me', 'https://inv.perditum.com', 'https://inv.nadeko.net',
    'https://invidious.projectsegfau.lt', 'https://yt.vern.cc', 'https://super8.absturztau.be', 'https://inv.kamuridesu.com',
    'https://invidious.ritoge.com', 'https://app.materialio.us', 'https://yt.thechangebook.org', 'https://y.com.sb', 'https://invidious.ducks.party'
];

export default async function handler(req, res) {
    const { vId } = req.query;
    if (!vId) return res.status(400).json({ error: "Missing vId" });

    let attempt = 0;
    const shuffle = (array) => array.sort(() => Math.random() - 0.5);
    const pipedList = shuffle([...PIPED_SERVERS]);
    const invList = shuffle([...INVIDIOUS_SERVERS]);

    while (true) { // 無限リトライループ
        // 1. Piped 試行
        for (const server of pipedList) {
            try {
                const response = await fetch(`${server}/streams/${vId}`, { signal: AbortSignal.timeout(3000) });
                if (response.ok) {
                    const data = await response.json();
                    if (data.relatedStreams) {
                        return res.status(200).json(formatPiped(data.relatedStreams));
                    }
                }
            } catch (e) { continue; }
        }

        // 2. Invidious 試行
        for (const server of invList) {
            try {
                const response = await fetch(`${server}/api/v1/videos/${vId}`, { signal: AbortSignal.timeout(3000) });
                if (response.ok) {
                    const data = await response.json();
                    if (data.recommendedVideos) {
                        return res.status(200).json(formatInvidious(data.recommendedVideos));
                    }
                }
            } catch (e) { continue; }
        }

        // 全滅した場合、少し待機して再シャッフル
        attempt++;
        await new Promise(r => setTimeout(r, 1000));
        shuffle(pipedList);
        shuffle(invList);
    }
}

function formatPiped(streams) {
    return streams.map(s => ({
        id: s.url.split('v=')[1] || s.url.split('/').pop(),
        title: s.title,
        thumbnails: { high: { url: s.thumbnail } },
        channelTitle: s.uploaderName,
        publishedAt: new Date().toISOString(), // Pipedにはないので現在時刻
        viewCount: s.views || 0
    }));
}

function formatInvidious(videos) {
    return videos.map(v => ({
        id: v.videoId,
        title: v.title,
        thumbnails: { high: { url: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg` } },
        channelTitle: v.author,
        publishedAt: new Date().toISOString(),
        viewCount: v.viewCount || 0
    }));
}
