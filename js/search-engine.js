/**
 * Piped APIを使用して動画を検索する（Safari互換性強化版）
 */
window.fetchVideos = async function(query) {
    const domain = window.CONFIG.PIPED_DOMAIN;
    
    // api をつける必要がある場合が多いので、ここでURLを組み立て
    // wireway.ch の場合は api.wireway.ch か pipedapi.wireway.ch を試す
    const url = `https://${domain}/api/v1/search?q=${encodeURIComponent(query)}&filter=videos`;
    
    console.log("Fetching from:", url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            mode: 'cors' // Safariに「これは許可された通信だ」と伝える
        });

        if (!response.ok) {
            throw new Error(`サーバー反応なし (ステータス: ${response.status})`);
        }

        const data = await response.json();
        
        if (!data.items) {
            return [];
        }

        return data.items.map(function(item) {
            // URLから動画IDを抽出
            const parts = item.url.split('v=');
            const videoId = parts.length > 1 ? parts[1] : "";
            return {
                id: videoId,
                title: item.title,
                thumbnail: item.thumbnail
            };
        });
    } catch (error) {
        console.error("Fetch error details:", error);
        // Piped自体が死んでいる可能性も考えてメッセージを出す
        throw new Error("Pipedとの通信に失敗したぜ。ドメインが間違ってるか、サーバーが混んでるかも。");
    }
};
