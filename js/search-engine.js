window.fetchVideos = async function() {
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const query = input.value.trim();
    
    if (!query) return;

    // 検索開始の合図
    resultsContainer.innerHTML = '<p style="text-align:center; color:white;">検索中...</p>';

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    // snippetを含めて、タイトル、サムネイル、チャンネル名を取得する標準的なURL
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // APIエラー（キー制限など）がある場合
        if (data.error) {
            console.error('API Error:', data.error);
            resultsContainer.innerHTML = `
                <div style="color:#ff4b4b; text-align:center; padding:20px;">
                    <p>検索エラーが発生しました</p>
                    <p style="font-size:12px;">理由: ${data.error.message}</p>
                </div>`;
            return;
        }

        // 検索結果が空の場合
        if (!data.items || data.items.length === 0) {
            resultsContainer.innerHTML = '<p style="text-align:center; color:#aaa;">動画が見つかりませんでした</p>';
            return;
        }

        // データを整形して描画関数へ
        const videos = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
            channelName: item.snippet.channelTitle
        }));

        if (window.renderThumbnails) {
            window.renderThumbnails(videos);
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        resultsContainer.innerHTML = '<p style="color:red;">通信エラーが発生しました</p>';
    }
};

// 予備の名前も定義
window.searchVideos = window.fetchVideos;
