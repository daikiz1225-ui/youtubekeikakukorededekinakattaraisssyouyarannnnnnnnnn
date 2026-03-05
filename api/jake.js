const axios = require('axios');

module.exports = async (req, res) => {
    const { id } = req.query;
    // 高画質サムネイルを取得
    const url = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        // 本来はここで画像加工(Sharpなど)を使いたいですが、
        // フロントエンドのCSS側で「object-fit: cover」を使えば正方形にできるため、
        // 高速化のためにそのまま画像を転送するプロキシとして動作させます。
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 's-maxage=86400');
        res.send(response.data);
    } catch (e) {
        res.status(404).send('Not Found');
    }
};
