// windowに直接関数を叩き込む
window.renderThumbnails = function(videos) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = ''; // 検索中メッセージを消す

    videos.forEach(function(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        // クリックしたら player.js の playVideo を呼ぶ
        card.onclick = function() { window.playVideo(video.id); };

        card.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" style="width:100%; border-radius:8px;">
            <h3 style="font-size:14px; margin-top:8px;">${video.title}</h3>
        `;
        resultsContainer.appendChild(card);
    });
};
