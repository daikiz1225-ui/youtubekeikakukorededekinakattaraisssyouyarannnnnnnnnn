window.fetchVideos = async function() {
    const input = document.getElementById('search-input');
    const query = input.value;
    if (!query) return;

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // データが正しく取れているかチェック
        if (data && data.items) {
            const videos = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high.url,
                channelName: item.snippet.channelTitle
            }));
            
            // 描画関数を呼ぶ
            if (window.renderThumbnails) {
                window.renderThumbnails(videos);
            }
        } else {
            console.error('Invalid data structure:', data);
            alert('動画が見つかりませんでした');
        }

    } catch (error) {
        console.error('Fetch error:', error);
    }
};

window.searchVideos = window.fetchVideos;
