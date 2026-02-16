import { ApiManager } from './api-manager.js';

export async function fetchVideos(query) {
    const apiKey = ApiManager.getActiveKey();
    if (!apiKey) {
        alert("APIキーが設定されていません。左下の設定から入力してください。");
        return [];
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=24&key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("API制限かキーが間違っています");
        const data = await response.json();
        return data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title // ID以外も一応保持
        }));
    } catch (error) {
        alert(error.message);
        return [];
    }
}
