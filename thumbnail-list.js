import { UISwitcher } from './ui-switcher.js';
import { launchPlayer } from './player.js';

export function renderThumbnails(videos) {
    const container = document.getElementById('search-results');
    container.innerHTML = videos.map(v => `
        <div class="video-card" onclick="playVideo('${v.id}')" style="cursor:pointer;">
            <img src="https://img.youtube.com/vi/${v.id}/mqdefault.jpg" style="width:100%; border-radius:10px;">
            <p style="font-size:14px; margin-top:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                動画を表示（Education）
            </p>
        </div>
    `).join('');
}

window.playVideo = (id) => {
    UISwitcher.showPlayer();
    launchPlayer(id);
};
