const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).send('EMPTY');

    try {
        // 1. URLの復元
        const url = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
        });

        let html = response.data;

        // 2. 記事の主要部分だけを抽出 (Game8などの主要セレクタ)
        const mainContent = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || 
                            html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || 
                            [html, html];
        let body = mainContent[1];

        // 3. 【あなたのアイデア】リンクを消してただの文字にする
        body = body.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '<span>$1</span>');

        // 4. スクリプトや不要な広告タグを抹殺
        body = body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        body = body.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

        // 5. 【パズル化】タグを隠し、ノイズを混ぜる
        let secure = body.replace(/</g, '«').replace(/>/g, '»');
        let packed = "";
        for (let i = 0; i < secure.length; i++) {
            packed += secure[i];
            if (i % 30 === 0) packed += "TITIUNKO"; // 30文字ごとにノイズ
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(packed);
    } catch (e) {
        res.status(500).send('ERR_FETCH');
    }
}
