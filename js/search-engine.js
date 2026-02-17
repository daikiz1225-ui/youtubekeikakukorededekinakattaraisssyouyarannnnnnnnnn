window.fetchVideos = async function() {
    const resultsContainer = document.getElementById('search-results');
    const input = document.getElementById('search-input');
    const query = input.value.trim();
    
    if (!query) return;

    // 【超重要】もし検索欄に11文字の動画IDを入れたら、直接再生に飛ばす！
    // APIが死んでいても、これでキーのテストができるぜ
    if (query.length === 11 && !query.includes(' ')) {
        resultsContainer.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <p style="color:white;">動画IDを検知しました。直接再生します...</p>
                <button onclick="window.playVideo('${query}', '直接再生テスト', 'Unknown')" 
                        style="padding:10px 20px; background:#ff0000; color:white; border:none; border-radius:5px; cursor:pointer;">
                    再生を開始する
                </button>
            </div>`;
        return;
    }

    const apiKey = window.CONFIG.YOUTUBE_API_KEY;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const videos = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high.url,
                channelName: item.snippet.channelTitle
            }));
            window.renderThumbnails(videos);
        } else {
            // エラーの詳細をコンソールに出す
            console.log("API Response:", data);
            resultsContainer.innerHTML = '<p style="text-align:center; color:#aaa;">ヒットなし。検索設定を確認してください。</p>';
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
};
