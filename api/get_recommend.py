export default async function handler(req, res) {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const headers = new Headers();
    
    // YouTube用の完璧ななりすましヘッダー（お手本コードから継承）
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7");
    headers.set("Accept-Language", "ja,en-US;q=0.9,en;q=0.8");
    headers.set("sec-ch-ua", '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"');
    headers.set("sec-ch-ua-mobile", "?0");
    headers.set("sec-ch-ua-platform", '"Windows"');
    headers.set("sec-fetch-dest", "document");
    headers.set("sec-fetch-mode", "navigate");
    headers.set("sec-fetch-site", "cross-site");
    headers.set("sec-fetch-user", "?1");

    if (req.headers.cookie) {
      headers.set("Cookie", req.headers.cookie);
    }

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: headers
    });

    const html = await response.text();

    // ytInitialData からデータを引っこ抜く
    const jsonMatch = html.match(/var ytInitialData = (\{.*?\});/);
    if (!jsonMatch) {
      return res.status(404).json({ error: "ytInitialData not found" });
    }

    const rawData = JSON.parse(jsonMatch[1]);
    
    // 関連動画のリスト（Secondary Results）を抽出
    const results = rawData.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];

    // IDだけを抽出して配列にする
    const relatedIds = results
      .map(item => item.compactVideoRenderer?.videoId || item.autoplayVideoRenderer?.config?.autoplayVideo?.compactVideoRenderer?.videoId)
      .filter(id => id !== undefined);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    // 配列だけをシンプルに返す (["id1", "id2"...])
    return res.status(200).json(relatedIds);

  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
}
