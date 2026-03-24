// api/streaming.js
// Vercelで動作するストリーミング中継コード
export default async function handler(req, res) {
    const { id } = req.query;
    if (!id) return res.status(400).send("IDが必要です");

    // Cobalt APIなどの外部ストリーミングAPIを叩いて、生の動画URLを取得し、
    // そのデータを自分のドメインから流しているように見せかけます。
    // ※ ここに cobalt や ytdl の呼び出しを記述します。
    const cobaltApi = `https://api.cobalt.tools/api/json`;
    
    try {
        const response = await fetch(cobaltApi, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${id}` })
        });
        const data = await response.json();
        
        if (data.url) {
            res.redirect(data.url); // 直接動画ファイルへリダイレクト（最も高速）
        } else {
            res.status(500).send("動画の取得に失敗しました");
        }
    } catch (e) {
        res.status(500).send("サーバーエラー");
    }
}
