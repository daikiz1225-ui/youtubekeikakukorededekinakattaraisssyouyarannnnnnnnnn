import { fetchVideos } from './search-engine.js';
import { renderThumbnails } from './thumbnail-list.js';
import { UISwitcher } from './ui-switcher.js';

async function executeSearch() {
    console.log("executeSearch started");
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    
    // 【デバッグ用】JSが生きてれば、検索ボタンを押した瞬間に背景が少し赤くなる
    document.body.style.backgroundColor = "#1a0000";
    setTimeout(() => { document.body.style.backgroundColor = "#111"; }, 200);

    const query = searchInput.value.trim();
    if (!query) return;

    // 即座に「検索中」を出す
    UISwitcher.showHome();
    resultsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px; color:white; font-size:20px;">🔍 検索中: ${query}</div>`;

    try {
        const videos = await fetchVideos(query);
        renderThumbnails(videos);
    } catch (error) {
        resultsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:red; padding:20px;">エラー: ${error.message}</div>`;
    }
}

function init() {
    console.log("JS init started");
    const form = document.getElementById('search-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            executeSearch();
        });
    }
}

// ページ読み込み完了を待たずに実行を試みる（iPad対策）
init();
document.addEventListener('DOMContentLoaded', init);
