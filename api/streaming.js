// api/streaming.js - Enhanced Proxy Multi-Instance Gacha
export const config = {
    runtime: 'edge', // 高速なEdge Runtimeを使用
};

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new Response("IDが必要です", { status: 400 });

    const yStr = 'you' + 'tube';
    const ytUrl = `https://www.${yStr}.com/watch?v=${id}`;

    // --- インスタンスリスト (提供されたデータ) ---
    const PIPED = [
        'https://pipedapi.kavin.rocks', 'https://api-piped.mha.fi', 'https://pipedapi.adminforge.de',
        'https://pipedapi.pfcd.me', 'https://api.piped.projectsegfau.lt', 'https://pipedapi.rivo.lol'
    ];
    
    const INVIDIOUS = [
        'https://invidious.nerdvpn.de', 'https://yewtu.be', 'https://invidious.f5.si',
        'https://vid.puffyan.us', 'https://inv.vern.cc', 'https://iv.ggtyler.dev'
    ];

    // 1. Piped API 試行
    for (const host of PIPED) {
        try {
            const res = await fetch(`${host}/streams/${id}`, { signal: AbortSignal.timeout(3000) });
            const data = await res.json();
            const stream = data.videoStreams?.find(s => s.format === 'mp4' || s.quality === '720p')?.url;
            if (stream) return await proxyStream(stream);
        } catch (e) { continue; }
    }

    // 2. Invidious API 試行
    for (const host of INVIDIOUS) {
        try {
            const res = await fetch(`${host}/api/v1/videos/${id}`, { signal: AbortSignal.timeout(3000) });
            const data = await res.json();
            const stream = data.formatStreams?.reverse()[0]?.url;
            if (stream) return await proxyStream(stream);
        } catch (e) { continue; }
    }

    // 3. Cobalt (最終手段)
    try {
        const res = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: ytUrl, videoQuality: '720', downloadMode: 'video' })
        });
        const data = await res.json();
        if (data.url) return await proxyStream(data.url);
    } catch (e) {}

    return new Response("すべて失敗しました", { status: 500 });
}

// プロキシ中継関数
async function proxyStream(url) {
    const videoRes = await fetch(url);
    const { readable, writable } = new TransformStream();
    videoRes.body.pipeTo(writable);

    return new Response(readable, {
        headers: {
            'Content-Type': 'video/mp4',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
