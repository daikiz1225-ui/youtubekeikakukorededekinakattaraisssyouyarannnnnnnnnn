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

        // 🚨 ここが重要：エラー内容を画面に出す
        if (data.error) {
            resultsContainer.innerHTML = `
                <div style="color:red; padding:20px; border:1px solid red;">
                    <h3>APIエラーが発生しています</h3>
                    <p>理由: ${data.error.message}</p>
                    <p>コード: ${data.error.code}</p>
                </div>`;
            return;
        }

        // 💡 data.items があるか厳重にチェック
        if (data && data.items) {
            const videos = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high.url,
                channelName: item.snippet.channelTitle
            }));
            window.renderThumbnails(videos);
        } else {
            // itemsがない場合
            window.renderThumbnails([]);
        }

    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:red;">通信に失敗: ${error.message}</p>`;
    }
};

window.searchVideos = window.fetchVideos;
