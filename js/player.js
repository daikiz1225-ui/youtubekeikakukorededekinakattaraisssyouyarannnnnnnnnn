window.playVideo = async function(videoId, title) {
    const playerContainer = document.getElementById('player-container');
    const viewHome = document.getElementById('view-home');
    const viewPlayer = document.getElementById('view-player');
    const titleElement = document.getElementById('current-video-title');

    const eduId = window.CONFIG.YOUTUBE_EDU_FILTER;

    // この1行が、学校のフィルターとYouTubeの制限を同時に突破する「魔法のURL」だ
    const videoUrl = `https://www.youtubeeducation.com/embed/${videoId}?edufilter=${eduId}&rel=0&autoplay=1&modestbranding=1`;

    playerContainer.innerHTML = `
        <iframe 
            src="${videoUrl}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            style="width:100%; height:100%; border-radius:12px;">
        </iframe>
    `;

    if (titleElement) titleElement.innerText = title;

    // 画面切り替え
    if (viewHome) viewHome.style.display = 'none';
    if (viewPlayer) viewPlayer.style.display = 'block';

    // 関連動画の取得も忘れずに
    if (window.fetchRelatedVideos) {
        window.fetchRelatedVideos(videoId);
    }
};
