// api/kanrenn.js
export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId is required" });

  // 指定された Invidious インスタンスリスト
  const instances = [
    'https://inv.nadeko.net/', 'https://invidious.f5.si/', 'https://invidious.lunivers.trade/',
    'https://invidious.ducks.party/', 'https://iv.melmac.space/', 'https://invidious.nerdvpn.de/',
    "https://invidious.privacyredirect.com", "https://invidious.technicalvoid.dev",
    "https://invidious.darkness.services", "https://invidious.nikkosphere.com",
    "https://invidious.schenkel.eti.br", "https://invidious.tiekoetter.com",
    "https://invidious.perennialte.ch", "https://invidious.reallyaweso.me",
    "https://invidious.private.coffee", "https://invidious.privacydev.net"
  ];
  
  // ランダムにインスタンスを選択
  const instance = instances[Math.floor(Math.random() * instances.length)].replace(/\/$/, "");

  try {
    const response = await fetch(`${instance}/api/v1/videos/${videoId}`);
    const data = await response.json();
    
    const relatedVideos = (data.relatedVideos || []).map(v => ({
      id: v.videoId,
      title: v.title,
      channelTitle: v.author,
      thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      viewCount: v.viewCountShort || "関連動画"
    }));

    res.status(200).json(relatedVideos);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
}
