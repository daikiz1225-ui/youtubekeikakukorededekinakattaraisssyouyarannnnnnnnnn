window.fetchVideos = async function() {
    const input = document.getElementById('search-input');
    const query = input.value;
    if (!query) return;

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // 判定を入れず、シンプルに map して渡す
        const videos = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
            channelName: item.snippet.channelTitle
        }));

        window.renderThumbnails(videos);
    } catch (error) {
        console.error('Error:', error);
    }
};

window.searchVideos = window.fetchVideos;
