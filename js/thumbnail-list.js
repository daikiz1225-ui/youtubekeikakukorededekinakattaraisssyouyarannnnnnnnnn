window.renderThumbnails = function(videos) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    // ここで videos.forEach がエラーになるなら、data.items が空。
    // その原因を突き止めるために、console.log を1行だけ入れる（画面には影響しない）。
    console.log("Videos to render:", videos);

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
