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
        // JSと不要なタグを徹底削除
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

        // 🌟 パズル化：HTMLタグを特殊記号に変え、1文字おきにノイズを挟む
        let secure = html.replace(/</g, '«').replace(/>/g, '»');
        let puzzle = "";
        const noise = "X"; // 1文字ノイズで軽量化
        for (let i = 0; i < secure.length; i++) {
            puzzle += secure[i] + noise; 
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(puzzle);
    } catch (e) {
        res.status(500).send('FETCH_ERR');
    }
}
