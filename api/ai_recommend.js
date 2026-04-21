export const config = { runtime: 'edge' };

// 日本語判定（ひらがな・カタカナ）
const JP_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;

const TARGET_INSTANCE = 'https://inv.thepixora.com';

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');
    if (!vId) return new Response(JSON.stringify(["No ID"]), { status: 400 });

    try {
        // 1. 関連動画を1回だけ取得
        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}?region=JP`);
        if (!res.ok) throw new Error("Fetch failed");
        
        const data = await res.json();
        const baseCategoryId = data.categoryId;
        const related = data.relatedVideos || data.recommendedVideos || [];

        // 2. フィルタリング：日本語、かつショート動画（60秒以下）を除外
        let filtered = related.filter(v => {
            const isJp = v.title && JP_REGEX.test(v.title);
            // Invidiousのデータから長さを判定（秒数）
            const isNotShort = v.lengthSeconds > 60; 
            return isJp && isNotShort;
        });

        // 3. カテゴリ一致を優先的に先頭へ
        if (baseCategoryId) {
            filtered.sort((a, b) => {
                const aMatch = a.categoryId === baseCategoryId ? 1 : 0;
                const bMatch = b.categoryId === baseCategoryId ? 1 : 0;
                return bMatch - aMatch;
            });
        }

        // 4. 重複を排除してIDを返す
        const resultIds = [...new Set(filtered.map(v => v.videoId))].slice(0, 40);

        if (resultIds.length === 0) {
            return new Response(JSON.stringify(["DEBUG_EMPTY_DATA"]), { status: 200 });
        }

        return new Response(JSON.stringify(resultIds), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=3600'
            }
        });

    } catch (e) {
        return new Response(JSON.stringify([]), { status: 200 });
    }
}
