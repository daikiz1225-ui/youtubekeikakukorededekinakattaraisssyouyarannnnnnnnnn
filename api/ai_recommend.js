export const config = { runtime: 'edge' };

// 日本語判定
function isJapanese(text) {
    return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

const TARGET_INSTANCE = 'https://inv.thepixora.com';

// フィルタ付き取得関数
async function fetchWithFilter(vId, targetCategoryId = null) {
    try {
        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}?region=JP`);
        if (!res.ok) return { videos: [], categoryId: null };
        
        const data = await res.json();
        const currentCategory = data.categoryId;
        const related = data.relatedVideos || data.recommendedVideos || [];

        // フィルタリング: 日本語であること
        const filtered = related.filter(v => isJapanese(v.title));

        // カテゴリ一致を優先的に前に並べる
        if (targetCategoryId) {
            filtered.sort((a, b) => {
                if (a.categoryId === targetCategoryId && b.categoryId !== targetCategoryId) return -1;
                if (a.categoryId !== targetCategoryId && b.categoryId === targetCategoryId) return 1;
                return 0;
            });
        }

        return { videos: filtered, categoryId: currentCategory };
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

        // 1. 元動画の情報を取得
        const firstStep = await fetchWithFilter(vId);
        const baseCategoryId = firstStep.categoryId;
        
        firstStep.videos.forEach(v => {
            if (!checkedIds.has(v.videoId)) {
                finalVideos.push(v);
                checkedIds.add(v.videoId);
            }
        });

        // 2. 20件に満たない場合の深掘り（見つかった日本語動画から芋づる式に）
        if (finalVideos.length < 20 && finalVideos.length > 0) {
            const seeds = finalVideos.slice(0, 5);
            const deepDives = await Promise.all(seeds.map(v => fetchWithFilter(v.videoId, baseCategoryId)));
            
            deepDives.forEach(result => {
                result.videos.forEach(v => {
                    if (!checkedIds.has(v.videoId)) {
                        finalVideos.push(v);
                        checkedIds.add(v.videoId);
                    }
                });
            });
        }

        const resultIds = finalVideos.map(v => v.videoId).slice(0, 40);
        return new Response(JSON.stringify(resultIds), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify(["Fetch Error"]), { status: 200 });
    }
}
