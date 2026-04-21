export const config = { runtime: 'edge' };

// 日本語判定（ひらがな・カタカナ）
function isJapanese(text) {
    return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

const TARGET_INSTANCE = 'https://inv.thepixora.com';

async function fetchWithFilter(vId) {
    try {
        const res = await fetch(`${TARGET_INSTANCE}/api/v1/videos/${vId}?region=JP`);
        if (!res.ok) return [];
        const data = await res.json();
        const related = data.relatedVideos || data.recommendedVideos || [];
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
        let finalVideos = [];
        let checkedIds = new Set();
        checkedIds.add(vId);

        // 1階層目
        const firstBatch = await fetchWithFilter(vId);
        firstBatch.forEach(v => {
            if (!checkedIds.has(v.videoId)) {
                finalVideos.push(v);
                checkedIds.add(v.videoId);
            }
        });

        // 20件に満たない場合は、見つかった日本語動画からさらに掘る（再帰）
        if (finalVideos.length < 20 && finalVideos.length > 0) {
            const seeds = finalVideos.slice(0, 5);
            const deepDives = await Promise.all(seeds.map(v => fetchWithFilter(v.videoId)));
            
            deepDives.flat().forEach(v => {
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
