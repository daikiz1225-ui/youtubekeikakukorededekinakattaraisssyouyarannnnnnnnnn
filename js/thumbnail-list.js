window.renderThumbnails = function(videos) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';

    // videos が正しく届いている時だけ処理する
    if (videos && Array.isArray(videos)) {
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
    }
};
