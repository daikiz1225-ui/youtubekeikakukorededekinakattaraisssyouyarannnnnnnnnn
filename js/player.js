window.playVideo = async function(videoId, title) {
    const playerContainer = document.getElementById('player-container');
    const viewHome = document.getElementById('view-home');
    const viewPlayer = document.getElementById('view-player');
    const titleElement = document.getElementById('current-video-title');

    // IDがない場合でも、教育用ドメインで最も「教材」っぽく見えるパラメータを盛る
    // rel=0 (関連動画を消す), controls=1 (操作可能), modestbranding=1 (ロゴ消し)
    const videoUrl = `https://www.youtubeeducation.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&showinfo=0&autoplay=1`;

    playerContainer.innerHTML = `
        <iframe 
            src="${videoUrl}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>
    `;

    if (titleElement) titleElement.innerText = title;

    if (viewHome) viewHome.style.display = 'none';
    if (viewPlayer) viewPlayer.style.display = 'block';

    // 関連動画の取得
    if (window.fetchRelatedVideos) {
        window.fetchRelatedVideos(videoId);
    }
};
