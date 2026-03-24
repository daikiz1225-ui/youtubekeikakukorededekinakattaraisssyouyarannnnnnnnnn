// api/streaming.js
export default async function handler(req, res) {
    const { id } = req.query;
    if (!id) return res.status(400).send("IDが必要です");

    const cobaltInstances = [
        'https://api.cobalt.tools/api/json',
        'https://cobalt.0x0.st/api/json'
    ];

    let streamUrl = null;

    // 1. Cobalt APIから動画の生URLを取得
    for (const api of cobaltInstances) {
        try {
            const response = await fetch(api, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    url: `https://www.youtube.com/watch?v=${id}`,
                    videoQuality: '720',
                    downloadMode: 'video'
                })
            });
            const data = await response.json();
            if (data && data.url) {
                streamUrl = data.url;
                break;
            }
        } catch (e) { continue; }
    }

    if (!streamUrl) {
        return res.status(500).send("動画の取得に失敗しました");
    }

    // 2. 重要：リダイレクトせず、サーバーがデータを中継(Proxy)する
    try {
        const videoStream = await fetch(streamUrl);
        const contentType = videoStream.headers.get('content-type');
        
        // ブラウザに動画であることを伝える
        res.setHeader('Content-Type', contentType || 'video/mp4');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // データをストリーミング配信
        const arrayBuffer = await videoStream.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
    } catch (error) {
        return res.redirect(302, streamUrl); // 失敗時のみ最終手段でリダイレクト
    }
}
