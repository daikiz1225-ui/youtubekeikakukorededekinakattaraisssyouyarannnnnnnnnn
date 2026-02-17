window.playVideo = async function(videoId, title, channelName) {
    const playerContainer = document.getElementById('player-container');
    const viewHome = document.getElementById('view-home');
    const viewPlayer = document.getElementById('view-player');
    
    // UI要素へのセット
    document.getElementById('current-video-title').innerText = title || "タイトル不明";
    document.getElementById('current-channel-name').innerText = channelName || "チャンネル不明";

    // コンフィグからキーを取得（念のため空文字チェック）
    const eduId = window.CONFIG.YOUTUBE_EDU_FILTER || "o-hmiN9tvUUI2EQM";

    // URL組み立て（edufilterを必ず ? の直後に置く！）
    const videoUrl = `https://www.youtubeeducation.com/embed/${videoId}?edufilter=${eduId}&rel=0&autoplay=1&modestbranding=1`;

    console.log("Generated URL:", videoUrl); // コンソール確認用

    playerContainer.innerHTML = `
        <iframe 
            src="${videoUrl}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            referrerpolicy="no-referrer"
            style="width:100%; height:100%; border-radius:12px;">
        </iframe>
        <p style="color:red; font-size:10px; word-break:break-all; margin-top:5px;">
            Debug URL: ${videoUrl}
        </p>
    `;

    // 画面切り替え
    viewHome.style.display = 'none';
    viewPlayer.style.display = 'block';

    // 関連動画取得
    if (window.fetchRelatedVideos) {
        window.fetchRelatedVideos(videoId);
    }
};
