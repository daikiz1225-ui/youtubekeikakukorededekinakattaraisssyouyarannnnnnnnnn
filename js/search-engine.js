window.searchVideos = async function() {
    const input = document.getElementById('search-input');
    const query = input.value;
    if (!query) return;

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    // snippetを含めることで、タイトルやチャンネル名を取得
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // ここでデータを整形して渡す
        const videos = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
            channelName: item.snippet.channelTitle, // ここでチャンネル名を確保！
            channelId: item.snippet.channelId
        }));

        window.renderThumbnails(videos);
    } catch (error) {
        console.error('Search error:', error);
        alert('検索に失敗しました');
    }
};
