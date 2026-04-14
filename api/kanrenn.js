const express = require('express');
const fetch = require('node-fetch');
const app = express();

// 優先インスタンスとバックアップリスト
const INSTANCES = [
    "https://inv.thepixora.com",
    "https://invidious.nerdvpn.de",
    "https://yewtu.be",
    "https://invidious.f5.si",
    "https://vid.puffyan.us",
    "https://inv.vern.cc",
    "https://invidious.io.lol"
];

app.get('/api/kanrenn', async (req, res) => {
    const vId = req.query.vId;
    if (!vId) return res.status(400).json([]);

    // 成功するまで各インスタンスを試行
    for (const baseUrl of INSTANCES) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000); // 3秒で次へ

            const response = await fetch(`${baseUrl}/api/v1/videos/${vId}`, {
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                if (data.relatedVideos) {
                    console.log(`Success with: ${baseUrl}`);
                    return res.json(data.relatedVideos);
                }
            }
        } catch (e) {
            console.error(`Failed instance: ${baseUrl}`);
            continue; // 次のインスタンスへ
        }
    }

    // 全滅した場合
    res.status(500).json([]);
});

app.listen(3000, () => console.log('Backend proxy running on port 3000'));
