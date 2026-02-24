const axios = require('axios');

export default async function handler(req, res) {
    const { d, img } = req.query;

    // --- A. 画像中継モード ---
    if (img) {
        try {
            const imgUrl = Buffer.from(img, 'base64').toString('utf-8');
            const response = await axios.get(imgUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit' }
            });
            res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // キャッシュして高速化
            return res.send(response.data);
        } catch (e) {
            return res.status(404).send('');
        }
    }

    // --- B. HTML取得モード ---
    if (!d) return res.status(400).json({ error: 'No data' });

    try {
        const targetUrl = Buffer.from(d, 'base64').toString('utf-8');
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit' }
        });

        // フィルター対策：HTMLをBase64で難読化してJSONで返す
        const encodedHtml = Buffer.from(response.data).toString('base64');
        res.status(200).json({ data: encodedHtml });

    } catch (error) {
        res.status(500).json({ error: '取得失敗: ' + error.message });
    }
}
