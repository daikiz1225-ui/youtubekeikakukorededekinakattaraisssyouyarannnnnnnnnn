/**
 * 教育用ドメインを使って動画を埋め込む
 */
window.playVideo = function(videoId) {
    const playerContainer = document.getElementById('player-container');
    const viewHome = document.getElementById('view-home');
    const viewPlayer = document.getElementById('view-player');

    // だいき指定のドメインでURLを作成
    const videoUrl = `https://www.youtubeeducation.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;

    playerContainer.innerHTML = `
        <iframe 
            src="${videoUrl}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            style="width:100%; height:100%; aspect-ratio: 16/9;">
        </iframe>
    `;

    if (viewHome) viewHome.style.display = 'none';
    if (viewPlayer) viewPlayer.style.display = 'block';
};
