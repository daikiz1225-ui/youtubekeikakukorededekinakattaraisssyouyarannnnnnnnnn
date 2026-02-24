const axios = require('axios');

export default async function handler(req, res) {
    const { d } = req.query;

    if (!d) return res.status(400).json({ error: 'データが空です' });

    try {
        // Base64を安全にデコード
        const targetUrl = Buffer.from(d, 'base64').toString('utf-8');
        
        // URLが正しい形式か最終チェック
        new URL(targetUrl);

        const response = await axios.get(targetUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
            }
        });

        res.status(200).json({
            content: response.data,
            url: targetUrl
        });
    } catch (error) {
        res.status(500).json({ error: '取得失敗: ' + error.message });
    }
}
