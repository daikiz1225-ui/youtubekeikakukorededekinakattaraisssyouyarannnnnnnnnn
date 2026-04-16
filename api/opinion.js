export default async function handler(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (req.method === 'POST') {
        const { type, content } = req.body;
        // ここでDB（Supabase等）に ip, type, content を保存
        console.log(`[Log] IP: ${ip}, Type: ${type}, Content: ${content}`);
        return res.status(200).json({ status: 'ok' });
    }

    if (req.method === 'GET' && req.query.get === 'stats') {
        // 管理者用統計データをDBから引っ張って返す処理
        // const stats = await db.query("SELECT ip, count(*) as usage_count...");
        return res.status(200).json([{ ip: ip, usage_count: 99, latest_opinion: "テスト" }]);
    }
}
