export default async function handler(req, res) {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const headers = new Headers();
    // ブラウザのふりをしてYouTubeにアクセス
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    headers.set("Accept-Language", "ja,en-US;q=0.9,en;q=0.8");

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: headers
    });

    const html = await response.text();

    // ytInitialDataの中にYouTubeが用意した関連動画データが入っている
    const jsonMatch = html.match(/var ytInitialData = (\{.*?\});/);
    if (!jsonMatch) {
      return res.status(404).json({ error: "Data not found" });
    }

    const rawData = JSON.parse(jsonMatch[1]);
    
    // 関連動画のリスト（Secondary Results）を抽出
    const results = rawData.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];

    // IDだけを抽出して配列にする
    const relatedIds = results
      .map(item => item.compactVideoRenderer?.videoId)
      .filter(id => id !== undefined);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    // 配列だけをシンプルに返す
    return res.status(200).json(relatedIds);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
