// window.をつけることで、HTMLのonclickから絶対に見えるようにする
window.fetchVideos = async function() {
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    
    if (!input || !input.value) return;
    const query = input.value;

    // config.jsからキーを直接取得
    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // YouTubeからの返り値をそのまま整形
        const videos = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
            channelName: item.snippet.channelTitle
        }));

        // 描画関数を叩く
        window.renderThumbnails(videos);

    } catch (error) {
        console.error('Fetch error:', error);
    }
};
