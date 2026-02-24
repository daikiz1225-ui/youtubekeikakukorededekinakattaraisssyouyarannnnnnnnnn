const axios = require('axios');
const { URL } = require('url');

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).send('EMPTY');

    try {
        const targetUrl = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        const urlObj = new URL(targetUrl);
        const origin = urlObj.origin;

        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
        });

        let html = response.data;

        // 🌟 ① 相対パスを絶対パスに変換 (AIの指摘①への対応)
        // src="/..." や href="/..." を https://game8.jp/... に変える
        html = html.replace(/(src|href)="\/([^"]+)"/gi, (match, p1, p2) => {
            return `${p1}="${origin}/${p2}"`;
        });

        // 🌟 ② CSSをそのままにせず、なるべく読み込めるように調整 (AIの指摘②)
        // ※ 本来はCSS内URLも置換すべきですが、まずはHTMLのパス修正を優先
        
        // 🌟 ③ セキュリティ制限の解除 (AIの指摘④)
        // HTML内のメタタグにあるCSPなどを無効化
        html = html.replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi, '');

        // 🌟 ④ 難読化 (TITIUNKO)
        let secure = html.replace(/</g, '«').replace(/>/g, '»');
        let packed = "";
        for (let i = 0; i < secure.length; i++) {
            packed += secure[i];
            if (i % 60 === 0) packed += "TITIUNKO"; 
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(packed);
    } catch (e) {
        res.status(500).send('ERR');
    }
}
