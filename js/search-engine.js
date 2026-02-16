import { InstanceManager } from './instance-manager.js';

export async function fetchVideos(query) {
    const domain = InstanceManager.getDomain();
    
    // Pipedの検索URLを組み立て
    // filter=videos をつけると動画だけ取れる
    const url = `https://${domain}/api/v1/search?q=${encodeURIComponent(query)}&filter=videos`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("インスタンスが反応してないか、URLが間違ってるぜ");
        
        const data = await response.json();
        
        // Pipedのデータ形式から kick tube 用に変換
        // url項目が "/watch?v=ID" になってるから、ID部分だけ切り出す
        return data.items.map(item => {
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
