const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).send('EMPTY_QUERY');

    try {
        // 1. URL復元
        const url = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        
        const response = await axios.get(url, {
            timeout: 8000, // 8秒でタイムアウト
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
        });

        // 2. 記事部分の抽出 (より広くヒットするように修正)
        let html = response.data;
        let content = "";
        const selectors = [/<article[^>]*>([\s\S]*?)<\/article>/i, /<main[^>]*>([\s\S]*?)<\/main>/i, /<div id="main"[^>]*>([\s\S]*?)<\/div>/i];
        
        for(let s of selectors) {
            let m = html.match(s);
            if(m) { content = m[1]; break; }
        }
        if(!content) content = html; // 見つからなければ全部送る

        // 3. 超軽量粉砕 (記号置換 + 軽量ノイズ)
        // データを肥大化させすぎないように 10文字ごとにノイズ
        let broken = content
            .replace(/<div/gi, '§D1')
            .replace(/<\/div>/gi, '§D2')
            .replace(/<img/gi, '§IM')
            .replace(/src="/gi, '§S=');

        let encrypted = "";
        for (let i = 0; i < broken.length; i++) {
            encrypted += broken[i];
            if (i % 15 === 0) encrypted += "†"; // 15文字ごとに十字架ノイズ
        }

        // 4. 反転
        const finalData = encrypted.split('').reverse().join('');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(finalData);

    } catch (e) {
        res.status(500).send('FETCH_FAILED');
    }
}
