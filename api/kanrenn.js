// api/kanrenn.js
export default async function handler(req, res) {
    const { videoId, title, key } = req.query;

    const INVIDIOUS_LIST = [
        'https://inv.nadeko.net', 'https://invidious.f5.si', 'https://invidious.lunivers.trade',
        'https://invidious.ducks.party', 'https://iv.melmac.space', 'https://invidious.nerdvpn.de',
        'https://invidious.privacyredirect.com', 'https://invidious.technicalvoid.dev',
        'https://invidious.darkness.services', 'https://invidious.nikkosphere.com'
    ];

    const PIPED_LIST = [
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

    // --- Invidious 試行 ---
    for (let i = 0; i < 3; i++) {
        const url = INVIDIOUS_LIST[Math.floor(Math.random() * INVIDIOUS_LIST.length)];
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const r = await fetch(`${url}/api/v1/videos/${videoId}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!r.ok) continue;
            const data = await r.json();
            if (data.relatedVideos) {
                return res.status(200).json(data.relatedVideos.map(v => ({
                    id: v.videoId, title: v.title, channelTitle: v.author,
                    thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
                    viewCount: v.viewCountShort || "関連動画"
                })));
            }
        } catch (e) { continue; }
    }

    // --- Piped 試行 ---
    for (let i = 0; i < 5; i++) {
        const url = PIPED_LIST[Math.floor(Math.random() * PIPED_LIST.length)];
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const r = await fetch(`${url}/streams/${videoId}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!r.ok) continue;
            const data = await r.json();
            if (data.relatedStreams) {
                return res.status(200).json(data.relatedStreams.map(v => ({
                    id: v.url.split("v=")[1], title: v.title, channelTitle: v.uploaderName,
                    thumbnail: v.thumbnail, viewCount: "関連動画"
                })));
            }
        } catch (e) { continue; }
    }

    // --- YouTube Search 最終手段 ---
    if (title && key) {
        try {
            const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(title)}&type=video&maxResults=15&key=${key}`);
            const data = await r.json();
            if (data.items) {
                return res.status(200).json(data.items.map(v => ({
                    id: v.id.videoId, title: v.snippet.title, channelTitle: v.snippet.channelTitle,
                    thumbnail: `https://i.ytimg.com/vi/${v.id.videoId}/mqdefault.jpg`,
                    viewCount: "おすすめ"
                })));
            }
        } catch (e) {}
    }

    res.status(200).json([]); // 全滅時
}
