window.fetchVideos = async function() {
    const resultsContainer = document.getElementById('search-results');
    const input = document.getElementById('search-input');
    const query = input.value;
    
    if (!query) return;

    // 検索中に「検索中...」と出す
    resultsContainer.innerHTML = '<p style="text-align:center; color:white;">検索中...</p>';

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    
    // 最もシンプルな検索URL（まずはこれで試す）
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // 🚨 APIエラーが発生している場合
        if (data.error) {
            let errorMsg = `APIエラー: ${data.error.message}`;
            if (data.error.code === 403) errorMsg = "APIキーの制限（1日の上限）を超えているか、キーが間違っています。";
            
            resultsContainer.innerHTML = `
                <div style="color:#ff6b6b; padding:20px; text-align:center;">
                    <p>${errorMsg}</p>
                    <p style="font-size:10px; color:#aaa;">Code: ${data.error.code}</p>
                </div>`;
            return;
        }

        // ✅ 正常にデータが取れた場合
        if (data.items && data.items.length > 0) {
            const videos = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high.url,
                channelName: item.snippet.channelTitle
            }));
            
            window.renderThumbnails(videos);
        } else {
            resultsContainer.innerHTML = '<p style="text-align:center; color:#aaa;">ヒットする動画がありませんでした</p>';
        }

    } catch (error) {
        resultsContainer.innerHTML = `<p style="color:red;">通信エラー: ${error.message}</p>`;
    }
};

window.searchVideos = window.fetchVideos;
