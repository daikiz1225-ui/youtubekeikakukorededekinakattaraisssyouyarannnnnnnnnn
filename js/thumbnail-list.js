window.renderThumbnails = function(videos) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    // 💡 ここが守りの要！ videosが配列じゃなかったら即終了させる
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px;">動画が見つかりませんでした。APIキーの設定や検索語を確認してください。</p>';
        return;
    }

    videos.forEach(function(video) {
        // IDがないデータ（チャンネルなど）は飛ばす
        if (!video.id) return;

        const card = document.createElement('div');
        card.className = 'video-card';
        
        const safeTitle = video.title.replace(/'/g, "\\'");
        const safeChannel = video.channelName.replace(/'/g, "\\'");

        card.onclick = function() { 
            window.playVideo(video.id, video.title, video.channelName); 
        };

        card.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" style="width:100%; border-radius:8px;">
            <div style="padding:10px;">
                <h3 style="font-size:14px; margin:0; color:white;">${video.title}</h3>
                <p style="font-size:12px; color:#aaa; margin:4px 0 0 0;">${video.channelName}</p>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
};
