import { Redis } from '@upstash/redis';
const kv = Redis.fromEnv(); // Upstashの環境変数から自動で接続

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { username, action, backupData } = req.body;

    if (!username) {
        return res.status(400).json({ error: "ログインが必要です" });
    }

    // 【サーバーへデータを保存（同期）】
    if (action === 'save') {
        try {
            await kv.set(`user:${username}:data`, backupData);
            return res.status(200).json({ success: true, message: "クラウドにデータを保存しました！" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "データの保存に失敗しました" });
        }
    }

    // 【サーバーからデータを取得（復元）】
    if (action === 'load') {
        try {
            const data = await kv.get(`user:${username}:data`);
            if (!data) {
                return res.status(404).json({ error: "保存されたデータがありません" });
            }
            return res.status(200).json(data);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "データの読み込みに失敗しました" });
        }
    }

    return res.status(400).json({ error: "無効なアクションです" });
}
