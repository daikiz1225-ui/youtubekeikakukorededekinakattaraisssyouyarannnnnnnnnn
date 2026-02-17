window.renderThumbnails = function(videos) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    // ここで videos が存在するか、配列かを確認するぜ
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#aaa;">動画が見つかりませんでした</p>';
        return;
    }

    videos.forEach(function(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        
        // 特殊文字対策
        const safeTitle = video.title.replace(/'/g, "\\'");
        const safeChannel = video.channelName.replace(/'/g, "\\'");

        card.onclick = function() { 
            window.playVideo(video.id, safeTitle, safeChannel); 
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
