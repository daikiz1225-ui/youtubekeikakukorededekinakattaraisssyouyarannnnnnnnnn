window.renderThumbnails = function(videos) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    // 💡 videos が undefined や null でも絶対にエラーを出さないようにする
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px;">表示できる動画がありません。</p>';
        return;
    }

    // ここまで来れば、絶対に forEach でエラーは出ない
    videos.forEach(function(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.onclick = function() { 
            window.playVideo(video.id, video.title); 
        };

        card.innerHTML = `
            <img src="${video.thumbnail}" style="width:100%; border-radius:8px;">
            <div style="padding:8px;">
                <h3 style="font-size:14px; margin:0; color:white;">${video.title}</h3>
                <p style="font-size:12px; color:#aaa;">${video.channelName}</p>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
};
