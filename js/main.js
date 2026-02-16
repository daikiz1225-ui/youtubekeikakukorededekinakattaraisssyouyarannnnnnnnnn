import { fetchVideos } from './search-engine.js';
import { renderThumbnails } from './thumbnail-list.js';
import { UISwitcher } from './ui-switcher.js';

/**
 * 検索処理のメインロジック
 */
async function executeSearch() {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    
    const query = searchInput.value.trim();
    if (!query) return;

    // 画面切り替えと「検索中」の表示
    UISwitcher.showHome();
    resultsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
            <p style="font-size: 20px; color: #aaa; font-weight: bold;">🔍 検索中...</p>
        </div>
    `;

    try {
        const videos = await fetchVideos(query);
        if (videos && videos.length > 0) {
            renderThumbnails(videos);
        } else {
            resultsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px;"><p>動画が見つかりませんでした。</p></div>`;
        }
    } catch (error) {
        resultsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #ff6b6b;"><p>エラー: ${error.message}</p></div>`;
    }
}

/**
 * 初期化：HTMLが読み込まれた後にイベントを紐付ける
 */
function init() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');

    if (searchButton) {
        // click だけでなく touchstart も考慮（iPad対策）
        searchButton.addEventListener('click', (e) => {
            e.preventDefault();
            executeSearch();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeSearch();
                searchInput.blur();
            }
        });
    }
}

// 画面の準備ができたら実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
