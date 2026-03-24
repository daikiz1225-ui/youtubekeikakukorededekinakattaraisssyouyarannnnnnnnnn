// api/streaming.js
export default async function handler(req, res) {
    const { id } = req.query;
    if (!id) return res.status(400).send("IDが必要です");

    // 信頼性の高い複数の取得先を試行
    const cobaltInstances = [
        'https://api.cobalt.tools/api/json',
        'https://cobalt.0x0.st/api/json',
        'https://cobalt.api.unblock.me/api/json'
    ];

    let videoUrl = null;

    for (const api of cobaltInstances) {
        try {
            const response = await fetch(api, {
                method: 'POST',
                headers: { 
                    'Accept': 'application/json', 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                body: JSON.stringify({ 
                    url: `https://www.youtube.com/watch?v=${id}`,
                    videoQuality: '720', // 安定性のための解像度指定
                    downloadMode: 'video'
                })
            });

            const data = await response.json();
            if (data && data.url) {
                videoUrl = data.url;
                break; // 取得できたらループを抜ける
            }
        } catch (e) {
            console.log(`Instance ${api} failed, trying next...`);
        }
    }

    if (videoUrl) {
        // 【重要】app.jsをいじらないため、302リダイレクトで動画へ飛ばす
        // ブラウザ側でブロックされる場合は、ここの仕組みをプロキシに変更する必要がありますが、
        // まずは最も軽量なリダイレクトで、エラー時のみ「画像」を返す方法をとります。
        res.setHeader('Cache-Control', 'no-cache');
        return res.redirect(302, videoUrl);
    }

    // --- 全ての取得に失敗した場合 ---
    // app.jsがエラーを受け取れるよう、エラーメッセージが描かれたSVG画像を動画として返します
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(`
        <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
            <rect width="100%" height="100%" fill="black"/>
            <text x="50%" y="50%" font-family="sans-serif" font-size="24" fill="red" text-anchor="middle">
                再生エラー：動画ストリームを取得できませんでした
            </text>
            <text x="50%" y="60%" font-family="sans-serif" font-size="14" fill="gray" text-anchor="middle">
                (サーバー制限または動画のブロック)
            </text>
        </svg>
    `);
}
