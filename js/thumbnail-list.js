window.renderThumbnails = function(videos) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    videos.forEach(function(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        
        // 特殊な文字が含まれていても壊れないように処理
        const safeTitle = video.title.replace(/"/g, '&quot;').replace(/'/g, "\\'");
        const safeChannel = video.channelName.replace(/"/g, '&quot;').replace(/'/g, "\\'");

        // クリックしたら再生
        card.onclick = function() { 
            window.playVideo(video.id, video.title, video.channelName); 
        };

        card.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" style="width:100%; border-radius:8px;">
            <div style="padding:8px;">
                <h3 style="font-size:14px; margin:0; color:white; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${video.title}
                </h3>
                <p style="font-size:12px; color:#aaa; margin:4px 0 0 0;">${video.channelName}</p>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
};
