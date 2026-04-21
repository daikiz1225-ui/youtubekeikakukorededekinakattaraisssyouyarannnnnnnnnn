export const config = { runtime: 'edge' };

// 日本語判定
function isJapanese(text) {
    return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

const TARGET_INSTANCE = 'https://inv.thepixora.com';

// フィルタ付き取得関数（カテゴリ指定対応）
async function fetchWithFilter(vId, targetCategoryId = null) {
    try {
        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}?region=JP`);
        if (!res.ok) return { videos: [], categoryId: null };
        
        const data = await res.json();
        const currentCategory = data.categoryId; // この動画自体のカテゴリ
        const related = data.relatedVideos || data.recommendedVideos || [];

        // フィルタリング
        const filtered = related.filter(v => {
            const jpOk = isJapanese(v.title);
            // カテゴリ指定がある場合は一致をチェック、なければ日本語のみ
            const categoryOk = targetCategoryId ? v.categoryId === targetCategoryId : true;
            return jpOk && categoryOk;
        });

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

        // 1. まず元動画の情報とカテゴリを取得
        const firstStep = await fetchWithFilter(vId);
        const baseCategoryId = firstStep.categoryId;
        
        firstStep.videos.forEach(v => {
            if (!checkedIds.has(v.videoId)) {
                finalVideos.push(v);
                checkedIds.add(v.videoId);
            }
        });

        // 2. 20件に満たない場合の深掘り（カテゴリを維持して掘る）
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

        // 3. まだ20件に満たない場合は、カテゴリ縛りを解いて「日本語のみ」で補充
        if (finalVideos.length < 20) {
            const extra = await fetchWithFilter(vId); // カテゴリ指定なし
            extra.videos.forEach(v => {
                if (!checkedIds.has(v.videoId)) {
                    finalVideos.push(v);
                    checkedIds.add(v.videoId);
                }
            });
        }

        const resultIds = finalVideos.map(v => v.videoId);
        return new Response(JSON.stringify(resultIds), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify(["Fetch Error"]), { status: 200 });
    }
}
