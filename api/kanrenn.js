export const config = { runtime: 'edge' };

// 日本語（ひらがな・カタカナ）が含まれているか判定する関数
function isJapanese(text) {
    return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

const TARGET_INSTANCE = 'https://inv.thepixora.com';

async function fetchRelatedWithFilter(vId) {
    try {
        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}?region=JP`);
        if (!res.ok) return [];
        const data = await res.json();
        
        const related = data.relatedVideos || data.recommendedVideos || [];
        // 日本語が含まれる動画のみを抽出
        return related.filter(v => isJapanese(v.title));
    } catch (e) {
        return [];
    }
}

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const vId = searchParams.get('vId');

    if (!vId) return new Response(JSON.stringify(["No ID"]), { status: 400 });

    try {
        let finalJapaneseVideos = [];
        let checkedIds = new Set();
        checkedIds.add(vId);

        // 1回目の取得
        let firstBatch = await fetchRelatedWithFilter(vId);
        firstBatch.forEach(v => {
            if (!checkedIds.has(v.videoId)) {
                finalJapaneseVideos.push(v);
                checkedIds.add(v.videoId);
            }
        });

        // --- 深掘りロジック ---
        // 日本語動画が10件未満なら、見つかった日本語動画からさらに関連を探す
        if (finalJapaneseVideos.length < 10 && finalJapaneseVideos.length > 0) {
            // 見つかった日本語動画のうち、上位3件を元にさらに掘る
            const seeds = finalJapaneseVideos.slice(0, 3);
            const deepDives = await Promise.all(seeds.map(v => fetchRelatedWithFilter(v.videoId)));
            
            deepDives.flat().forEach(v => {
                if (!checkedIds.has(v.videoId)) {
                    finalJapaneseVideos.push(v);
                    checkedIds.add(v.videoId);
                }
            });
        }

        // IDだけの配列にして返す
        const resultIds = finalJapaneseVideos.map(v => v.videoId);

        if (resultIds.length === 0) {
            return new Response(JSON.stringify(["DEBUG_EMPTY_DATA"]), { status: 200 });
        }

        return new Response(JSON.stringify(resultIds), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800'
            }
        });

    } catch (e) {
        return new Response(JSON.stringify(["Fetch Error"]), { status: 200 });
    }
}
