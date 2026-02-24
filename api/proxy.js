const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).send('EMPTY');

    try {
        const url = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        const response = await axios.get(url, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; Apple TV)' }
        });

        let html = response.data;
        const origin = new URL(url).origin;

        // 🌟 レイアウト崩れ防止：画像やCSSのパスを絶対パスに変換
        html = html.replace(/(src|href)="\/([^"]+)"/gi, `$1="${origin}/$2"`);
        
        // 🌟 鍵マーク対策：全スクリプトを「実行不能な文字列」にする
        html = html.replace(/<script/gi, '<nos-cript').replace(/<\/script/gi, '</nos-cript');

        // 🌟 あなたの案：独自文字による暗号化（タグ隠蔽）
        let secure = html.replace(/</g, '«').replace(/>/g, '»');
        let packed = "";
        const noiseSet = ["TITI", "UNKO", "777"]; // 偽装ノイズ
        for (let i = 0; i < secure.length; i++) {
            packed += secure[i];
            if (i % 20 === 0) packed += noiseSet[Math.floor(Math.random() * noiseSet.length)];
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(packed);
    } catch (e) {
        res.status(500).send('ERR');
    }
}
