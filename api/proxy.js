const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).send('NO_DATA');

    try {
        // URL復元（簡単な反転のみ）
        const url = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        
        const response = await axios.get(url, {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
        });

        let html = response.data;

        // 🌟 相手のJS/CSSを捨てて、メイン記事部分だけを「骨組み」で抜く
        const mainMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || 
                          html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || 
                          [html, html];
        let body = mainMatch[1].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // 🌟 【暗号化】タグを独自の記号に変換し、ノイズを混ぜる
        // < → « , > → » に置換。さらに10文字ごとに "UNKO" を混ぜる
        let secureData = body.replace(/</g, '«').replace(/>/g, '»');
        let packed = "";
        for (let i = 0; i < secureData.length; i++) {
            packed += secureData[i];
            if (i % 12 === 0) packed += "TITI"; // あなたの案：ノイズ注入
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(packed);
    } catch (e) {
        res.status(500).send('ERROR_FETCHING');
    }
}
