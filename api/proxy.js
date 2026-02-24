const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).send('EMPTY');

    try {
        const url = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        const urlObj = new URL(url);
        const origin = urlObj.origin; // https://game8.jp

        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
        });

        let html = response.data;

        // 🌟 魔法の置換：リンク、CSS、スクリプトのパスをすべて「元サイトのURL」に書き換える
        // これをしないと、iPad側で「設計図（CSS）」が見つからずレイアウトが崩れます
        html = html.replace(/(href|src)="\/(?!\/)/gi, `$1="${origin}/`);

        // 🌟 鍵マーク対策：画像はそのまま読み込まず、サーバー側で一度止める（後で調整）
        html = html.replace(/<img /gi, '<img loading="lazy" data-p-src="');

        // 🌟 リンクをただの文字にする（あなたのアイデアを維持）
        html = html.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '<span>$1</span>');

        // パズル化（TITIUNKOノイズ）
        let secure = html.replace(/</g, '«').replace(/>/g, '»');
        let packed = "";
        for (let i = 0; i < secure.length; i++) {
            packed += secure[i];
            if (i % 50 === 0) packed += "TITIUNKO"; 
        }

        const finalPayload = packed.length + ":::SPLIT:::" + packed;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(finalPayload);
    } catch (e) {
        res.status(500).send('SERVER_ERR');
    }
}
