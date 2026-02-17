window.onload = function() {
    const form = document.getElementById('search-form');
    
    if (form) {
        form.onsubmit = async function(e) {
            e.preventDefault();
            
            // 動作確認用の赤いフラッシュ
            document.body.style.backgroundColor = "red";
            setTimeout(() => { document.body.style.backgroundColor = "#111"; }, 300);

            const input = document.getElementById('search-input');
            const results = document.getElementById('search-results');
            const query = input.value.trim();

            if (!query) return;

            results.innerHTML = `<div style="text-align:center; padding:50px; font-size:24px;">🔍 "${query}" をYouTube APIで検索中...</div>`;

            try {
                // 1. 検索実行
                const videos = await window.fetchVideos(query);
                // 2. サムネイル表示（thumbnail-list.jsが必要）
                window.renderThumbnails(videos); 
            } catch (err) {
                results.innerHTML = `<div style="color:red; padding:20px;">エラー: ${err.message}</div>`;
            }
        };
    }
};
