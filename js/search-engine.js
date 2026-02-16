import { ApiManager } from './api-manager.js';

export async function fetchVideos(query) {
    const apiKey = ApiManager.getActiveKey();
    
    if (!apiKey || apiKey.trim() === "") {
        return Promise.reject(new Error("APIキーが空だよ！左下の設定から入力してね。"));
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=24&key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            // Googleからのエラーメッセージを具体的に出す
            const errorMsg = data.error ? data.error.message : "不明なAPIエラー";
            throw new Error(`YouTube APIエラー: ${errorMsg}`);
        }

        return data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title
        }));
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}
