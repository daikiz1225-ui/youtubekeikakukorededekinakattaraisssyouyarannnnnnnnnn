window.renderThumbnails = function(videos) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    videos.forEach(video => {
        const div = document.createElement('div');
        div.className = 'video-card';
        
        // エスケープ処理（タイトルに " とかがあると壊れるのを防ぐ）
        const safeTitle = video.title.replace(/'/g, "\\'");
        const safeChannel = video.channelName.replace(/'/g, "\\'");

        div.onclick = function() {
            // ここで全てのデータをプレイヤーに渡す
            window.playVideo(video.id, video.title, video.channelName);
        };

        div.innerHTML = `
            <img src="${video.thumbnail}" style="width:100%">
            <div style="padding:10px;">
                <h3 style="font-size:14px; margin:0;">${video.title}</h3>
                <p style="font-size:12px; color:#aaa;">${video.channelName}</p>
            </div>
        `;
        resultsContainer.appendChild(div);
    });
};
