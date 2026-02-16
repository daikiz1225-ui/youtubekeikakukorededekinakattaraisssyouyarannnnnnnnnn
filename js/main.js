import { fetchVideos } from './search-engine.js';
import { renderThumbnails } from './thumbnail-list.js';
import { UISwitcher } from './ui-switcher.js';

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsContainer = document.getElementById('search-results');

/**
 * 検索を実行し、画面を更新する司令塔機能
 */
async function executeSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    // 1. ホーム画面に切り替え
    UISwitcher.showHome();

    // 2. 「検索中...」を表示（だいきのリクエスト！）
    resultsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
            <p style="font-size: 20px; color: #aaa;">検索中...</p>
        </div>
    `;

    try {
        // 3. APIで動画取得
        const videos = await fetchVideos(query);

        // 4. 結果を表示
        if (videos && videos.length > 0) {
            renderThumbnails(videos);
        } else {
            resultsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
                    <p>動画が見つかりませんでした。APIキーを確認してください。</p>
                </div>
            `;
        }
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color: red;">エラーが発生しました: ${error.message}</p>`;
    }
}

// イベント設定
searchButton.addEventListener('click', executeSearch);

// iPad対応：Enterキーで検索
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        executeSearch();
        searchInput.blur(); // キーボードを閉じる
    }
});
