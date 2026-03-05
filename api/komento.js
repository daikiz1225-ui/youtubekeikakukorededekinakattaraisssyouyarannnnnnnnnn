const axios = require('axios');

module.exports = async (req, res) => {
    const { vId, key } = req.query;
    if (!vId) return res.status(400).send('No Video ID');
    
    // フィルターを回避しつつコメントを取得
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${vId}&maxResults=50&key=${key}`;
    
    try {
        const response = await axios.get(url);
        res.status(200).json(response.data);
    } catch (e) {
        res.status(500).json({ error: "Comments blocked or API error" });
    }
};
