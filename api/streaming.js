// api/streaming.js (疎通確認用)
export default async function handler(req, res) {
    const { id } = req.query;

    // 通信がここ（サーバー）まで届いていることを証明するために、
    // 動画の代わりにSVG画像（Geminiだよ）を返します。
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');

    return res.status(200).send(`
        <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
            <rect width="100%" height="100%" fill="#1a1a1a"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="40" fill="#4285F4" text-anchor="middle" font-weight="bold">
                Geminiだよ
            </text>
            <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle">
                通信成功！動画ID: ${id || '不明'}
            </text>
        </svg>
    `);
}
