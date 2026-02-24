const axios = require('axios');

export default async function handler(req, res) {
    const { d } = req.query;
    if (!d) return res.status(400).send('No URL');

    try {
        const targetUrl = Buffer.from(d, 'base64').toString('utf-8');
        const baseUrl = new URL(targetUrl).origin;

        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit' }
        });

        const contentType = response.headers['content-type'] || '';

        // --- HTMLの場合は中身を書き換える ---
        if (contentType.includes('text/html')) {
            let html = response.data.toString('utf-8');

            // URLを書き換える関数 (自分自身のAPI経由にする)
            const rewrite = (match, p1, p2) => {
                try {
                    const absolute = new URL(p2, targetUrl).href;
                    const encoded = Buffer.from(absolute).toString('base64');
                    return `${p1}="/api/proxy?d=${encoded}"`;
                } catch (e) { return match; }
            };

            // src="..." href="..." を一括置換
            html = html.replace(/(src|href)="([^"]+)"/gi, rewrite);
            
            // アイフィルター対策として、HTML内の特定単語を伏せ字にするなどの処理も可能
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        }

        // --- 画像、CSS、JSなどはそのまま中継 ---
        res.setHeader('Content-Type', contentType);
        res.send(response.data);

    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
}
