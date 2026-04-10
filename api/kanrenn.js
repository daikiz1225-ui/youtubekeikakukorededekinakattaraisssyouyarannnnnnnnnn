// api/kanrenn.js
export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId is required" });

  // あなたが指定した Invidious インスタンスリスト
  const instances = [
    'https://inv.nadeko.net/', 'https://invidious.f5.si/', 'https://invidious.lunivers.trade/',
    'https://invidious.ducks.party/', 'https://iv.melmac.space/', 'https://invidious.nerdvpn.de/',
    'https://invidious.privacyredirect.com', 'https://invidious.technicalvoid.dev',
    'https://invidious.darkness.services', 'https://invidious.nikkosphere.com',
    'https://invidious.schenkel.eti.br', 'https://invidious.tiekoetter.com',
    'https://invidious.perennialte.ch', 'https://invidious.reallyaweso.me',
    'https://invidious.private.coffee', 'https://invidious.privacydev.net'
  ];

  // ランダムに1つ選択して末尾のスラッシュを削除
  const instance = instances[Math.floor(Math.random() * instances.length)].replace(/\/$/, "");

  try {
    // Invidious API の動画詳細エンドポイントを叩く (ここに関連動画が含まれる)
    const response = await fetch(`${instance}/api/v1/videos/${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) throw new Error("Invidious API Response Error");

    const data = await response.json();

    // 関連動画 (relatedVideos) だけを抽出して整形
    const relatedVideos = (data.relatedVideos || []).map(v => ({
      id: v.videoId,
      title: v.title,
      channelTitle: v.author,
      thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      viewCount: v.viewCountShort || "関連動画"
    }));

    // フロントエンドに返す
    res.status(200).json(relatedVideos);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to fetch from Invidious" });
  }
}
