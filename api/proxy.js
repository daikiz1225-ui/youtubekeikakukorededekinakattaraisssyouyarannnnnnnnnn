const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).send('EMPTY');

    try {
        const url = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        const response = await axios.get(url, {
            timeout: 7000,
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; Apple TV)' }
        });

        let html = response.data;
        
        // JSとiframeを削除して軽量化
        let body = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                       .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

        // リンクを文字化（あなたのアイデア）
        body = body.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '<span>$1</span>');

        // タグ隠蔽
        let secure = body.replace(/</g, '«').replace(/>/g, '»');
        
        // パズル化（TITIUNKOノイズ）
        let packed = "";
        for (let i = 0; i < secure.length; i++) {
            packed += secure[i];
            if (i % 50 === 0) packed += "TITIUNKO"; 
        }

        // 🌟 データの先頭にサイズ情報を付けて、iPadが%を計算できるようにする
        const finalPayload = packed.length + ":::SPLIT:::" + packed;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(finalPayload);
    } catch (e) {
        res.status(500).send('SERVER_FETCH_ERROR');
    }
}
