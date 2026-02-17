/**
 * YouTube Data API v3 を使って検索結果（動画ID）を取得する
 */
window.fetchVideos = async function(query) {
    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    
    // GoogleのAPIサーバーにリクエストを送る
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        const errorDetail = await response.json();
        throw new Error(errorDetail.error.message || "APIエラー");
    }

    const data = await response.json();
    
    // 必要なデータ（ID、タイトル、サムネ）だけを整理して返す
    return data.items.map(function(item) {
        return {
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url
        };
    });
};
