import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: "https://big-monkfish-128403.upstash.io",
  token: "gQAAAAAAAfWTAAIgcDFiMmMyYjE5ZTA5ODc0Y2ZiYTM2NGFiYTU4MWVlMGViYQ",
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    const { username, action, backupData } = req.body;

    if (!username) return res.status(400).json({ error: "ログインが必要です" });

    if (action === 'save') {
        try {
            await kv.set(`user:${username}:data`, JSON.stringify(backupData));
            return res.status(200).json({ success: true, message: "☁️ オンライン保存が完了しました！" });
        } catch (error) {
            return res.status(500).json({ error: "保存失敗" });
        }
    }

    if (action === 'load') {
        try {
            const data = await kv.get(`user:${username}:data`);
            if (!data) return res.status(404).json({ error: "保存データがありません" });
            return res.status(200).json({ success: true, data: data });
        } catch (error) {
            return res.status(500).json({ error: "読み込み失敗" });
        }
    }
}
