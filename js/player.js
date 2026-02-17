window.playVideo = async function(videoId, title) {
    const playerView = document.getElementById('view-player');
    const homeView = document.getElementById('view-home');

    // プレイヤーと関連動画の横並びレイアウトを作る
    playerView.innerHTML = `
        <div class="player-layout">
            <div class="player-main">
                <div id="player-container">
                    <iframe 
                        src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1" 
                        frameborder="0" 
                        allowfullscreen>
                    </iframe>
                </div>
                <div class="video-info">
                    <div class="channel-icon"></div> <h2 class="video-title">${title}</h2>
                </div>
            </div>
            <div id="related-videos" class="related-list">
                <p>関連動画を取得中...</p>
            </div>
        </div>
        <button class="btn-back" onclick="location.reload()">⬅️ 戻る</button>
    `;

    homeView.style.display = 'none';
    playerView.style.display = 'block';

    // 関連動画を取得して表示する（あとで定義するぜ）
    window.fetchRelatedVideos(videoId);
};
