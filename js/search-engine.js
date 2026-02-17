window.fetchVideos = async function() {
    const input = document.getElementById('search-input');
    const query = input.value;
    if (!query) return;

    // 紐付けチェック：config が読み込めていなかったら警告を出す
    if (!window.CONFIG || !window.CONFIG.YOUTUBE_API_KEY) {
        alert("エラー: config.js の APIキーが読み込めていません。ファイルの読み込み順を確認してください。");
        return;
    }

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // APIからエラーが返ってきた場合の処理
        if (data.error) {
            console.error('API Error:', data.error.message);
            return;
        }

        if (data.items) {
            const videos = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high.url,
                channelName: item.snippet.channelTitle
            }));

            window.renderThumbnails(videos);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
};

window.searchVideos = window.fetchVideos;
