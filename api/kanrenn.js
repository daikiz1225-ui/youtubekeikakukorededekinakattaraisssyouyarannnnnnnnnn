export default async function handler(req, res) {
  const { videoId } = req.query;
  const instances = [
    'https://inv.nadeko.net', 'https://invidious.f5.si', 'https://invidious.lunivers.trade',
    'https://invidious.ducks.party', 'https://iv.melmac.space', 'https://invidious.nerdvpn.de',
    'https://invidious.privacyredirect.com', 'https://invidious.technicalvoid.dev',
    'https://invidious.darkness.services', 'https://invidious.nikkosphere.com',
    'https://invidious.schenkel.eti.br', 'https://invidious.tiekoetter.com',
    'https://invidious.perennialte.ch', 'https://invidious.reallyaweso.me',
    'https://invidious.private.coffee', 'https://invidious.privacydev.net'
  ];

  // 試行回数
  const maxRetries = 3;
  let lastError = null;

  // ランダムに並び替えて先頭から試す
  const shuffled = instances.sort(() => 0.5 - Math.random());

  for (let i = 0; i < maxRetries; i++) {
    const instance = shuffled[i].replace(/\/$/, "");
    try {
      // タイムアウトを3秒に設定して、遅いインスタンスをすぐ見切る
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error("Status: " + response.status);

      const data = await response.json();
      const relatedVideos = (data.relatedVideos || []).map(v => ({
        id: v.videoId,
        title: v.title,
        channelTitle: v.author,
        thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
        viewCount: v.viewCountShort || "関連動画"
      }));

      return res.status(200).json(relatedVideos);
    } catch (error) {
      lastError = error.message;
      console.log(`Retry ${i+1}: Failed at ${instance} (${error.message})`);
      continue; // 次のインスタンスへ
    }
  }

  res.status(500).json({ error: "All retries failed", lastError });
}
