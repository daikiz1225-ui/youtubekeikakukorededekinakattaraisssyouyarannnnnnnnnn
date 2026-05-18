import { kv } from '@vercel/kv';
import crypto from 'crypto'; // パスワードを暗号化するためのNode.js標準モジュール

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { action, username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "ユーザー名とパスワードを入力してください" });
    }

    // パスワードをハッシュ化（暗号化）する関数
    const hashPassword = (pwd) => {
        return crypto.createHmac('sha256', 'super-secret-key').update(pwd).digest('hex');
    };

    // 【ユーザー登録（サインアップ）】
    if (action === 'signup') {
        try {
            // すでに同じ名前のユーザーがいないかチェック
            const exists = await kv.exists(`user:${username}`);
            if (exists) {
                return res.status(400).json({ error: "このユーザー名は既に使われています" });
            }

            // パスワードを暗号化して保存
            const hashedPassword = hashPassword(password);
            await kv.set(`user:${username}`, { password: hashedPassword });

            return res.status(200).json({ success: true, message: "アカウントを作成しました！" });
        } catch (error) {
            return res.status(500).json({ error: "サーバーエラーが発生しました" });
        }
    }

    // 【ログイン】
    if (action === 'login') {
        try {
            const userData = await kv.get(`user:${username}`);
            if (!userData) {
                return res.status(400).json({ error: "ユーザー名またはパスワードが違います" });
            }

            const hashedPassword = hashPassword(password);
            if (userData.password !== hashedPassword) {
                return res.status(400).json({ error: "ユーザー名またはパスワードが違います" });
            }

            // ログイン成功（本来はJWTなどを発行しますが、今回は簡易的にユーザー名をトークン代わりにします）
            return res.status(200).json({ success: true, username: username });
        } catch (error) {
            return res.status(500).json({ error: "サーバーエラーが発生しました" });
        }
    }

    return res.status(400).json({ error: "無効なアクションです" });
}
