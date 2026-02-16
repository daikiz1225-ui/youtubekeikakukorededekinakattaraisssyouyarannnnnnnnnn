import { fetchVideos } from './search-engine.js';
import { renderThumbnails } from './thumbnail-list.js';
import { UISwitcher } from './ui-switcher.js';

async function executeSearch() {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const query = searchInput.value.trim();

    if (!query) return;

    // 画面に即座に反応を出す
    UISwitcher.showHome();
    resultsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px;">🔍 検索中... (${query})</div>`;

    try {
        console.log("Searching for:", query);
        const videos = await fetchVideos(query);
        renderThumbnails(videos);
    } catch (error) {
        resultsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:red; padding:20px;">${error.message}</div>`;
    }
}

function init() {
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');

    if (form) {
        // clickではなく「送信(submit)」を監視。これならiPadのキーボードの「確定」でも動く
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // ページのリロードを防ぐ
            executeSearch();
            if (input) input.blur(); // キーボードを閉じる
        });
    }
    
    // バックアップ用：念のためボタン単体へのタッチも監視
    const btn = document.getElementById('search-button');
    if (btn) {
        btn.addEventListener('touchstart', () => {
            console.log("Button touched");
        }, {passive: true});
    }
}

// 確実に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
