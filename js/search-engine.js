window.fetchVideos = async function() {
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const query = input.value.trim();
    
    if (!query) return;

    resultsContainer.innerHTML = '<p style="text-align:center; color:white;">検索中...</p>';

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // 🚨 APIエラーのチェック
        if (data.error) {
            resultsContainer.innerHTML = `<p style="color:#ff4b4b; text-align:center;">APIエラー: ${data.error.message}</p>`;
            return;
        }

        // ✅ データがあるか確認してから整形
        if (data.items && Array.isArray(data.items)) {
            const videos = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high.url,
                channelName: item.snippet.channelTitle
            }));
            
            // 描画関数へ
            if (window.renderThumbnails) {
                window.renderThumbnails(videos);
            }
        } else {
            // データが空の場合
            if (window.renderThumbnails) window.renderThumbnails([]);
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        resultsContainer.innerHTML = '<p style="color:red; text-align:center;">通信エラーが発生しました</p>';
    }
};

window.searchVideos = window.fetchVideos;
