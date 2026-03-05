// api/m3u8.js
export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Video ID is required' });
    }

    // あなたが教えてくれたURLをセットしました！
    const PIPED_API = "https://pipedmymy-api.onrender.com"; 

    try {
        // Renderサーバーに問い合わせ
        const response = await fetch(`${PIPED_API}/streams/${id}`);
        
        if (!response.ok) {
            throw new Error('Renderサーバーからの応答がありません');
        }

        const data = await response.json();

        // Piped APIの構造からm3u8(hls)を取り出す
        if (data.hls) {
            res.status(200).json({ url: data.hls });
        } else {
            res.status(404).json({ error: 'HLS URLが見つかりませんでした' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
