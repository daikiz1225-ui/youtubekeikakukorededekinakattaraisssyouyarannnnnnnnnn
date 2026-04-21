export const config = { runtime: 'edge' };

// 日本語判定
function isJapanese(text) {
    return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

// 再生数を数値に変換する関数（KやM表記にも対応）
function parseViews(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let s = val.toString().toLowerCase().replace(/,/g, '').replace(/views/g, '').trim();
    if (s.includes('k')) return parseFloat(s) * 1000;
    if (s.includes('m')) return parseFloat(s) * 1000000;
    return parseInt(s, 10) || 0;
}

const TARGET_INSTANCE = 'https://inv.thepixora.com';

// フィルタ＆スコア付け取得関数
async function fetchWithFilterAndScore(vId, targetCategoryId = null) {
    try {
        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}?region=JP`);
        if (!res.ok) return { videos: [], categoryId: null };
        
        const data = await res.json();
        const currentCategory = data.categoryId;
        const related = data.relatedVideos || data.recommendedVideos || [];

        let scoredVideos = [];
        for (const v of related) {
            if (!isJapanese(v.title)) continue; // 日本語以外は除外
            
            const views = parseViews(v.viewCount || v.viewCountText || "0");
            if (views < 5000) continue; // 5000回未満のノイズ動画は除外

            let score = 0;
            // カテゴリ一致ボーナス
            if (targetCategoryId && v.categoryId === targetCategoryId) score += 50;
            
            // 人気度（再生数）ボーナス
            if (views >= 1000000) score += 30; // 100万回超え
            else if (views >= 100000) score += 10; // 10万回超え

            scoredVideos.push({ id: v.videoId, score: score });
        }

        return { videos: scoredVideos, categoryId: currentCategory };
    } catch (e) {
        return { videos: [], categoryId: null };
    }
}

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');
    if (!vId) return new Response(JSON.stringify(["No ID"]), { status: 400 });

    try {
        let finalVideos = [];
        let checkedIds = new Set();
        checkedIds.add(vId);

        // 1. まず元動画の情報とカテゴリを取得
        const firstStep = await fetchWithFilterAndScore(vId);
        const baseCategoryId = firstStep.categoryId;
        
        firstStep.videos.forEach(v => {
            if (!checkedIds.has(v.id)) {
                finalVideos.push(v);
                checkedIds.add(v.id);
            }
        });

        // 2. 20件に満たない場合の深掘り
        if (finalVideos.length < 20 && finalVideos.length > 0) {
            // スコアが高い（カテゴリ一致＆高再生数）上位5件からさらに掘る
            const seeds = finalVideos.sort((a, b) => b.score - a.score).slice(0, 5);
            const deepDives = await Promise.all(seeds.map(v => fetchWithFilterAndScore(v.id, baseCategoryId)));
            
            deepDives.forEach(result => {
                result.videos.forEach(v => {
                    if (!checkedIds.has(v.id)) {
                        finalVideos.push(v);
                        checkedIds.add(v.id);
                    }
                });
            });
        }

        // 3. 最終的なリストをスコア（おすすめ度）順に並び替え
        finalVideos.sort((a, b) => b.score - a.score);

        const resultIds = finalVideos.map(v => v.id);

        if (resultIds.length === 0) {
            return new Response(JSON.stringify(["DEBUG_EMPTY_DATA"]), { status: 200 });
        }

        return new Response(JSON.stringify(resultIds), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify(["Fetch Error"]), { status: 200 });
    }
}
