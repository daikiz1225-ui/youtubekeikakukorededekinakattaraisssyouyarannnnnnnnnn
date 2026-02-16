import { fetchVideos } from './search-engine.js';
import { renderThumbnails } from './thumbnail-list.js';
import { UISwitcher } from './ui-switcher.js';

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

async function executeSearch() {
    const query = searchInput.value;
    if (!query) return;

    UISwitcher.showHome(); // 検索時はホーム画面へ
    const videos = await fetchVideos(query);
    renderThumbnails(videos);
}

// 検索ボタンクリック
searchButton.addEventListener('click', executeSearch);

// iPad対応：Enterキーで検索（iPadのEnterは 'Enter' キーコード）
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        executeSearch();
        searchInput.blur(); // キーボードを閉じる
    }
});
