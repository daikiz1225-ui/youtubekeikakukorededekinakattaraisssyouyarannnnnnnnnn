export const config = { runtime: 'edge' };

// 日本語判定（高速版：ひらがな・カタカナのみチェック）
const JP_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;

const TARGET_INSTANCE = 'https://inv.thepixora.com';

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');
    if (!vId) return new Response(JSON.stringify(["No ID"]), { status: 400 });

    try {
        // 1. 関連動画を1回だけ取得（深掘りしない！）
        // タイムアウトを避けるため、fetchにタイムアウト設定（6秒）を入れるのが理想
        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}?region=JP`);
        if (!res.ok) throw new Error("Fetch failed");
        
        const data = await res.json();
        const baseCategoryId = data.categoryId;
        const related = data.relatedVideos || data.recommendedVideos || [];

        // 2. 1回の取得結果から「日本語」のものだけを抽出
        let filtered = related.filter(v => v.title && JP_REGEX.test(v.title));

        // 3. カテゴリ一致を優先的に先頭へ（並び替えだけで精度を出す）
        if (baseCategoryId) {
            filtered.sort((a, b) => {
                const aMatch = a.categoryId === baseCategoryId ? 1 : 0;
                const bMatch = b.categoryId === baseCategoryId ? 1 : 0;
                return bMatch - aMatch; // カテゴリ一致を上に
            });
        }

        // 4. IDだけを抽出（念のため重複排除）
        const resultIds = [...new Set(filtered.map(v => v.videoId))].slice(0, 40);

        if (resultIds.length === 0) {
            return new Response(JSON.stringify(["DEBUG_EMPTY_DATA"]), { status: 200 });
        }

        return new Response(JSON.stringify(resultIds), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=3600' // キャッシュさせて2回目以降を速くする
            }
        });

    } catch (e) {
        // エラー時は空配列を返してapp.jsを止めない
        return new Response(JSON.stringify([]), { status: 200 });
    }
}
