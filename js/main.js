import { fetchVideos } from './search-engine.js';
import { renderThumbnails } from './thumbnail-list.js';
import { UISwitcher } from './ui-switcher.js';

async function executeSearch() {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const query = searchInput.value.trim();

    if (!query) return;

    // 1. ボタンが反応したことを示すため、即座に「検索中」を出す
    UISwitcher.showHome();
    resultsContainer.innerHTML = `
        <div class="status-msg loading">
            <p>🔍 "${query}" を検索中...</p>
            <p style="font-size: 12px; margin-top: 10px;">Pipedインスタンスに接続しています</p>
        </div>
    `;

    try {
        const videos = await fetchVideos(query);
        
        if (videos.length === 0) {
            resultsContainer.innerHTML = '<div class="status-msg">動画が見つかりませんでした。</div>';
            return;
        }

        renderThumbnails(videos);
    } catch (error) {
        // 2. 接続エラーが起きたら、理由を画面に赤文字で出す
        console.error("Search Error:", error);
        resultsContainer.innerHTML = `
            <div class="status-msg error">
                <p>⚠️ エラーが発生しました</p>
                <p style="font-size: 14px; font-weight: normal; margin-top: 10px;">${error.message}</p>
                <button onclick="location.reload()" style="margin-top:15px; padding:8px; cursor:pointer;">再読み込み</button>
            </div>
        `;
    }
}

function init() {
    const btn = document.getElementById('search-button');
    const input = document.getElementById('search-input');

    if (btn) {
        // clickとtouchstartの両方で確実に反応させる
        btn.addEventListener('click', executeSearch);
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            executeSearch();
        }, {passive: false});
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                executeSearch();
                input.blur();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
