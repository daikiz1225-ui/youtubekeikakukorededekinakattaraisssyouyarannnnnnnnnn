import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: "https://big-monkfish-128403.upstash.io",
  token: "gQAAAAAAAfWTAAIgcDFiMmMyYjE5ZTA5ODc0Y2ZiYTM2NGFiYTU4MWVlMGViYQ",
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    const { username, action, backupData } = req.body;

    if (!username) return res.status(400).json({ error: "ログインが必要です" });

    // バックエンドが代わりにUpstashへデータを保存
    if (action === 'save') {
        try {
            await kv.set(`user:${username}:data`, JSON.stringify(backupData));
            return res.status(200).json({ success: true, message: "クラウドにデータを同期しました！" });
        } catch (error) {
            return res.status(500).json({ error: "データの保存に失敗しました" });
        }
    }

    // バックエンドが代わりにUpstashからデータを読み込み
    if (action === 'load') {
        try {
            const data = await kv.get(`user:${username}:data`);
            if (!data) return res.status(404).json({ error: "保存されたデータがありません" });
            return res.status(200).json({ success: true, data: data });
        } catch (error) {
            return res.status(500).json({ error: "データの読み込みに失敗しました" });
        }
    }
    return res.status(400).json({ error: "無効なアクションです" });
}
