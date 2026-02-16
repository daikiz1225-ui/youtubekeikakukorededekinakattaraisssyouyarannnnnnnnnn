let currentVideoId = "";

export function launchPlayer(id) {
    currentVideoId = id;
    const container = document.getElementById('player-container');
    const embedUrl = `https://www.youtubeeducation.com/embed/${id}?autoplay=1&rel=0`;
    
    container.innerHTML = `
        <iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay"></iframe>
    `;
}

// 動画を再読み込みするボタン
document.getElementById('reload-video').addEventListener('click', () => {
    if (currentVideoId) launchPlayer(currentVideoId);
});
