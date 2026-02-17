window.playVideo = async function(videoId, title, channelName) {
    const playerContainer = document.getElementById('player-container');
    const viewHome = document.getElementById('view-home');
    const viewPlayer = document.getElementById('view-player');
    const titleElement = document.getElementById('current-video-title');
    const channelElement = document.getElementById('current-channel-name');

    // config.jsからIDを読み込む
    const eduId = window.CONFIG.YOUTUBE_EDU_FILTER;

    // 重要：URLの組み立て
    // youtubeeducation.com を使い、edufilterパラメータを先頭に持ってくる
    const videoUrl = `https://www.youtubeeducation.com/embed/${videoId}?edufilter=${eduId}&rel=0&autoplay=1&modestbranding=1&controls=1`;

    playerContainer.innerHTML = `
        <iframe 
            src="${videoUrl}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            style="width:100%; height:100%; border-radius:12px;">
        </iframe>
    `;

    // 表示情報の更新（undefined対策）
    if (titleElement) titleElement.innerText = title || "無題の動画";
    if (channelElement) channelElement.innerText = channelName || "チャンネル名不明";

    // 画面切り替え
    if (viewHome) viewHome.style.display = 'none';
    if (viewPlayer) viewPlayer.style.display = 'block';

    // 関連動画の取得
    if (window.fetchRelatedVideos) {
        window.fetchRelatedVideos(videoId);
    }
};
