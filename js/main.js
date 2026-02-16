import { fetchVideos } from './search-engine.js';
import { renderThumbnails } from './thumbnail-list.js';
import { UISwitcher } from './ui-switcher.js';
import { InstanceManager } from './instance-manager.js';

async function executeSearch() {
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const query = searchInput.value.trim();
    if (!query) return;

    UISwitcher.showHome();
    resultsContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px;">🔍 検索中...</div>';

    try {
        const videos = await fetchVideos(query);
        renderThumbnails(videos);
    } catch (error) {
        resultsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:red;">${error.message}</div>`;
    }
}

function init() {
    // 1. 起動時にURLがなければ設定画面を強制的に出す
    if (!InstanceManager.isConfigured()) {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.add('active');
    }

    const btn = document.getElementById('search-button');
    const input = document.getElementById('search-input');

    if (btn) btn.addEventListener('click', executeSearch);
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
