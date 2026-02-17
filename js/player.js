window.playVideo = async function(videoId, title) {
    const playerContainer = document.getElementById('player-container');
    const viewHome = document.getElementById('view-home');
    const viewPlayer = document.getElementById('view-player');
    const titleElement = document.getElementById('current-video-title');

    // お前が苦労して見つけたID
    const eduId = "o-hmiN9tvUUI2EQM";
    const videoUrl = `https://www.youtubeeducation.com/embed/${videoId}?edufilter=${eduId}&rel=0&autoplay=1`;

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
    viewHome.style.display = 'none';
    viewPlayer.style.display = 'block';
};
