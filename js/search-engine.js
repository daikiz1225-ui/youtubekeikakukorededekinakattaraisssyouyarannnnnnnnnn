import { ApiManager } from './api-manager.js';

/**
 * YouTube APIを叩いて動画IDを取得する機能
 */
export async function fetchVideos(query) {
    const apiKey = ApiManager.getActiveKey();
    
    if (!apiKey || apiKey.trim() === "") {
        throw new Error("APIキーが設定されていません。左下の設定から入力してください。");
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=24&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        const errorData = await response.json();
        const message = errorData.error ? errorData.error.message : "APIエラー";
        throw new Error(message);
    }
    
    const data = await response.json();
    return data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title
    }));
}
