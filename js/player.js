window.playVideo = async function(videoId, title) {
    const playerContainer = document.getElementById('player-container');
    const viewHome = document.getElementById('view-home');
    const viewPlayer = document.getElementById('view-player');
    const titleElement = document.getElementById('current-video-title');

    // だいきが抜き出した最強の通行証
    const eduId = "o-hmiN9tvUUI2EQM";

    // Gitのサイトが `${id}${params}` で組み立てていた形を再現
    // 最初のパラメータは ? で始め、その後に & で繋ぐのが基本だ
    const videoUrl = `https://www.youtubeeducation.com/embed/${videoId}?edufilter=${eduId}&rel=0&autoplay=1&modestbranding=1&controls=1&showinfo=0`;

    playerContainer.innerHTML = `
        <iframe 
            src="${videoUrl}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            style="width:100%; height:100%; border-radius:12px;">
        </iframe>
    `;

    // タイトルなどの情報をセット
    if (titleElement) titleElement.innerText = title;
    
    // 画面切り替え（iPadでスムーズに動くよう display を制御）
    if (viewHome) viewHome.style.display = 'none';
    if (viewPlayer) viewPlayer.style.display = 'block';

    // 関連動画の取得
    if (window.fetchRelatedVideos) {
        window.fetchRelatedVideos(videoId);
    }
};
