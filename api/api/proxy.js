/**
 * api/proxy.js
 * Vercel Serverless Function
 * 難読化されたリクエストを解読し、外部サイトを中継する
 */
const axios = require('axios');

export default async function handler(req, res) {
    // クエリパラメータ 'd' (Base64エンコードされたURL) を取得
    const { d } = req.query;

    if (!d) {
        return res.status(400).json({ error: 'データがありません' });
    }

    try {
        // 1. Base64をデコードして元のURLを復元
        const targetUrl = Buffer.from(d, 'base64').toString('utf-8');

        // 2. 外部サイトへリクエスト (User-AgentをiPadに偽装)
        const response = await axios.get(targetUrl, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            responseType: 'text'
        });

        // 3. フィルター対策：HTMLを直接返さず、JSONに包んで「ただのデータ」として送信
        res.status(200).json({
            content: response.data,
            url: targetUrl
        });

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ error: 'サイトの取得に失敗しました: ' + error.message });
    }
}
