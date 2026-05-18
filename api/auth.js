import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const kv = new Redis({
  url: "https://big-monkfish-128403.upstash.io",
  token: "gQAAAAAAAfWTAAIgcDFiMmMyYjE5ZTA5ODc0Y2ZiYTM2NGFiYTU4MWVlMGViYQ",
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    const { action, username, password } = req.body;

    if (!username || !password) return res.status(400).json({ error: "ユーザー名とパスワードを入力してください" });

    const hashPassword = (pwd) => {
        return crypto.createHmac('sha256', 'super-secret-key').update(pwd).digest('hex');
    };

    if (action === 'signup') {
        try {
            const exists = await kv.exists(`user:${username}`);
            if (exists) return res.status(400).json({ error: "このユーザー名は既に使われています" });

            const hashedPassword = hashPassword(password);
            await kv.set(`user:${username}`, JSON.stringify({ password: hashedPassword }));
            return res.status(200).json({ success: true, message: "アカウントを作成しました！" });
        } catch (error) {
            return res.status(500).json({ error: "サーバーエラー" });
        }
    }

    if (action === 'login') {
        try {
            const userData = await kv.get(`user:${username}`);
            if (!userData) return res.status(400).json({ error: "ユーザー名またはパスワードが違います" });

            const hashedPassword = hashPassword(password);
            if (userData.password !== hashedPassword) return res.status(400).json({ error: "ユーザー名またはパスワードが違います" });

            return res.status(200).json({ success: true, username: username });
        } catch (error) {
            return res.status(500).json({ error: "サーバーエラー" });
        }
    }
}
