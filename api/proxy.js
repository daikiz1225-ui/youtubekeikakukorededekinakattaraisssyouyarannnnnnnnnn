const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).send('EMPTY');

    try {
        const url = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        const response = await axios.get(url, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
        });

        let html = response.data;
        
        // 🌟 変更点：記事の一部ではなく、body全体を丸ごと抜き出す
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let body = bodyMatch ? bodyMatch[1] : html;

        // 画像、動画、外部通信、JS、CSSを徹底消去（鍵マーク対策）
        body = body.replace(/<img[^>]*>/gi, '<div class="proxy-img">🖼️ 画像（非表示）</div>');
        body = body.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, '');
        body = body.replace(/<source[^>]*>/gi, '');
        body = body.replace(/<link[^>]*>/gi, ''); 
        body = body.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ''); 
        body = body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // リンクをただの文字にする（レイアウト崩れ・誤タップ防止）
        body = body.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '<span>$1</span>');

        // パズル化（TITIUNKOノイズ注入）
        let secure = body.replace(/</g, '«').replace(/>/g, '»');
        let packed = "";
        for (let i = 0; i < secure.length; i++) {
            packed += secure[i];
            if (i % 45 === 0) packed += "TITIUNKO"; 
        }

        const finalPayload = packed.length + ":::SPLIT:::" + packed;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(finalPayload);
    } catch (e) {
        res.status(500).send('SERVER_FETCH_ERROR');
    }
}
