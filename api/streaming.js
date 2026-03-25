// api/streaming.js - DASH再生用プレイリスト生成
export const config = { runtime: 'edge' };

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new Response("ID missing", { status: 400 });

    const APIS = [
        'https://invidious.f5.si', 'https://yewtu.be', 'https://iv.nboeck.de',
        'https://invidious.perennialte.ch', 'https://invidious.nerdvpn.de',
        'https://inv.tux.pizza', 'https://iv.melmac.space', 'https://iv.ggtyler.dev',
        'https://invidious.privacyredirect.com', 'https://invidious.tiekoetter.com'
    ];

    for (const base of APIS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`${base}/api/v1/videos/${id}`, { signal: controller.signal });
            const data = await res.json();
            clearTimeout(timeout);

            // 1080pの映像URL(mp4)と、音声URL(m4a/mp4)を抽出
            const video = data.adaptiveFormats?.find(s => (s.qualityLabel === '1080p' || s.quality === '1080p') && s.type.includes('video/mp4'));
            const audio = data.adaptiveFormats?.find(s => s.type.includes('audio/mp4') || s.type.includes('audio/m4a'));

            // 1080pがなければ720pで代用
            const backupVideo = video || data.adaptiveFormats?.find(s => (s.qualityLabel === '720p' || s.quality === '720p') && s.type.includes('video/mp4'));

            if (backupVideo?.url && audio?.url) {
                // Dash.jsが読み込める「MPD(指示書)」をXML形式で作成
                const mpd = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011" type="static" mediaPresentationDuration="PT${data.lengthSeconds}S">
  <Period>
    <AdaptationSet mimeType="video/mp4" segmentAlignment="true">
      <Representation id="video" bandwidth="${backupVideo.bitrate}" width="${backupVideo.width}" height="${backupVideo.height}">
        <BaseURL>${backupVideo.url.replace(/&/g, '&amp;')}</BaseURL>
      </Representation>
    </AdaptationSet>
    <AdaptationSet mimeType="audio/mp4" segmentAlignment="true">
      <Representation id="audio" bandwidth="${audio.bitrate}">
        <BaseURL>${audio.url.replace(/&/g, '&amp;')}</BaseURL>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;

                return new Response(mpd, {
                    headers: {
                        'Content-Type': 'application/dash+xml',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'public, max-age=3600'
                    }
                });
            }
        } catch (e) { continue; }
    }
    return new Response("High resolution stream not found", { status: 500 });
}
