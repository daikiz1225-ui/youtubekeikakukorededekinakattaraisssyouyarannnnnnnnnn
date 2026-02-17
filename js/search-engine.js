window.fetchVideos = async function() {
    const input = document.getElementById('search-input');
    const query = input.value;
    if (!query) return;

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    // 以前の、最もシンプルなマッピング
    const videos = data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        channelName: item.snippet.channelTitle
    }));

    window.renderThumbnails(videos);
};

window.searchVideos = window.fetchVideos;
