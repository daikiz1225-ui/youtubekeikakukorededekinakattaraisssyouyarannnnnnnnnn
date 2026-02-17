// 名前を main.js が呼んでいる fetchVideos に合わせるぜ
window.fetchVideos = async function() {
    const input = document.getElementById('search-input');
    const query = input.value;
    
    // 検索語がないときは何もしない
    if (!query) return;

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    
    // APIから動画情報を取得
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('API Error:', data.error);
            alert('APIキーが無効か、回数制限に達している可能性があります');
            return;
        }

        // データを整形して thumbnail-list.js に渡す
        const videos = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
            channelName: item.snippet.channelTitle
        }));

        // 描画関数を呼び出す
        if (window.renderThumbnails) {
            window.renderThumbnails(videos);
        } else {
            console.error('window.renderThumbnails is not defined');
        }

    } catch (error) {
        console.error('Fetch error:', error);
    }
};

// 念のため、searchVideos という名前でも呼べるようにしておく（予備）
window.searchVideos = window.fetchVideos;
