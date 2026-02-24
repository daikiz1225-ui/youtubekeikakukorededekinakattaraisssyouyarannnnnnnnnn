const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query; // 難読化されたURL
    if (!q) return res.status(400).send('No Query');

    try {
        // 🌟 ぐっちゃぐちゃにされたURLを復元 (反転させてからデコード)
        const targetUrl = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        
        const response = await axios.get(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
                'Accept-Language': 'ja-JP'
            }
        });

        let html = response.data;

        // 🌟 相手側のJSを全削除（白くなって消えるバグを防止）
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // 🌟 画像やリンクのパスを絶対URLに修正
        const origin = new URL(targetUrl).origin;
        html = html.replace(/(src|href)="\/([^"]+)"/gi, `$1="${origin}/$2"`);

        // iPadで見やすくするための簡易スタイル注入
        const customStyle = `
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 15px; }
                img { max-width: 100%; height: auto; border-radius: 10px; }
                .adsbygoogle, .ad-slot, iframe { display: none !important; } /* 広告排除 */
            </style>
        `;
        
        html = html.replace('</head>', `${customStyle}</head>`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);
    } catch (error) {
        res.status(500).send('解析に失敗しました。');
    }
}
