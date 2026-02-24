const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query; 
    if (!q) return res.status(400).send('No URL');

    try {
        // 🌟 難読化URLの復元
        const targetUrl = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
        });

        let html = response.data;

        // 🌟 セキュリティ・自壊対策: すべてのスクリプトを無効化
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // 🌟 CSSと画像のパスを絶対URLに変換（これを行わないとデザインが崩れる）
        const origin = new URL(targetUrl).origin;
        html = html.replace(/(src|href)="\/([^"]+)"/gi, (m, p1, p2) => {
            if (p2.startsWith('http')) return m;
            return `${p1}="${origin}/${p2}"`;
        });

        // 🌟 文字列として返すために不要な改行などを整理
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);
    } catch (e) {
        res.status(500).send('サイトデータの取得に失敗しました。');
    }
}
