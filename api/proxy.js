const axios = require('axios');

export default async function handler(req, res) {
    const { q } = req.query; // 暗号化されたリクエスト
    if (!q) return res.status(400).send('No Data');

    try {
        // 1. リクエストURLの復元 (反転デコード)
        const targetUrl = Buffer.from(q.split('').reverse().join(''), 'base64').toString('utf-8');
        
        const response = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }
        });

        let html = response.data;

        // 2. 記事のメイン部分だけを抽出 (Game8等の主要タグを狙い撃ち)
        // ※ ページ全体だとゴミが多すぎるので、コンテンツの塊だけ抜く
        const mainMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || 
                          html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || 
                          [html, html];
        let content = mainMatch[1];

        // 3. 徹底破壊 (タグを独自記号に置換)
        content = content.replace(/<div/gi, '[[D1]]').replace(/<\/div>/gi, '[[D2]]')
                         .replace(/<span/gi, '[[S1]]').replace(/<\/span>/gi, '[[S2]]')
                         .replace(/<a/gi, '[[A1]]').replace(/<\/a>/gi, '[[A2]]')
                         .replace(/src="/gi, '[[IMG_SRC]]');

        // 4. ノイズ注入 (3文字おきに独自の暗号文字を混ぜる)
        let encrypted = "";
        for (let i = 0; i < content.length; i++) {
            encrypted += content[i];
            if (i % 3 === 0) encrypted += "Z-TITI-Z"; // 監視を混乱させるノイズ
        }

        // 5. 最後に全体を反転させて送信
        const finalTrash = encrypted.split('').reverse().join('');

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(finalTrash);

    } catch (e) {
        res.status(500).send('E_R_R_O_R');
    }
}
