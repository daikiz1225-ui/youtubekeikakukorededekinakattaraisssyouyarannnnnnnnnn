const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).send('EMPTY');

    try {
        const url = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        const response = await axios.get(url, {
            timeout: 7000,
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
        });

        let html = response.data;
        
        // 1. 記事の主要部分を抽出
        const mainContent = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || 
                            html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || 
                            [html, html];
        let body = mainContent[1];

        // 🌟 2. 鍵マークの原因（画像・外部通信）を徹底的に消去
        body = body.replace(/<img[^>]*>/gi, '<div class="proxy-img">🖼️ 画像（フィルター回避のため非表示）</div>');
        body = body.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, '');
        body = body.replace(/<source[^>]*>/gi, '');
        body = body.replace(/<link[^>]*>/gi, ''); // 相手のCSSを削除
        body = body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // 🌟 3. リンクをただの文字にする
        body = body.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '<span>$1</span>');

        // 🌟 4. パズル化（TITIUNKOノイズ）
        let secure = body.replace(/</g, '«').replace(/>/g, '»');
        let packed = "";
        for (let i = 0; i < secure.length; i++) {
            packed += secure[i];
            if (i % 40 === 0) packed += "TITIUNKO"; 
        }

        const finalPayload = packed.length + ":::SPLIT:::" + packed;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(finalPayload);
    } catch (e) {
        res.status(500).send('SERVER_FETCH_ERROR');
    }
}
