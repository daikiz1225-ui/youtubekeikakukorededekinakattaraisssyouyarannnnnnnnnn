import { CONFIG } from './config.js';

/**
 * Piped APIを使用して動画を検索する（1ファイル1機能）
 */
export async function fetchVideos(query) {
    const domain = CONFIG.PIPED_DOMAIN;
    
    if (!domain) {
        throw new Error("js/config.js でドメインが設定されていません。");
    }

    const url = `https://${domain}/api/v1/search?q=${encodeURIComponent(query)}&filter=videos`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("インスタンスが反応していません。ドメインを確認してください。");
        
        const data = await response.json();
        
        return data.items.map(item => {
            // URLから動画IDを抽出 (/watch?v=XXXXXXXXXXX)
            const videoId = item.url.split('v=')[1];
            return {
                id: videoId,
                title: item.title
            };
        });
    } catch (error) {
        throw new Error(`Pipedエラー: ${error.message}`);
    }
}
