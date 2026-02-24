const axios = require('axios');

export default async function handler(req, res) {
    const { d, img } = req.query;

    // 画像中継モード
    if (img) {
        try {
            const imgUrl = Buffer.from(img, 'base64').toString('utf-8');
            const response = await axios.get(imgUrl, { responseType: 'arraybuffer' });
            res.setHeader('Content-Type', response.headers['content-type']);
            return res.send(response.data);
        } catch (e) { return res.status(404).send(''); }
    }

    // HTML取得モード
    try {
        const targetUrl = Buffer.from(d, 'base64').toString('utf-8');
        const response = await axios.get(targetUrl);
        
        // フィルター回避：中身をBase64にして「ただの文字列」として返す
        const encodedData = Buffer.from(response.data).toString('base64');
        res.status(200).json({ data: encodedData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
