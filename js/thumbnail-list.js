window.renderThumbnails = function(videos) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    // data.itemsが何らかの理由で空でも、ここでエラーを出さずに止める
    if (!videos) return;

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
