// 他のファイルを待ってから動くようにする
window.onload = function() {
    console.log("Kick Tube Ready!");
    const form = document.getElementById('search-form');
    
    if (form) {
        form.onsubmit = async function(e) {
            e.preventDefault();
            
            // 【生存確認】これが動けば絶対に光る！
            document.body.style.backgroundColor = "red";
            setTimeout(() => { document.body.style.backgroundColor = "#111"; }, 300);

            const input = document.getElementById('search-input');
            const results = document.getElementById('search-results');
            const query = input.value.trim();

            if (!query) return;

            results.innerHTML = `<div style="text-align:center; padding:50px; font-size:24px;">🔍 検索中: ${query}</div>`;

            try {
                const videos = await window.fetchVideos(query);
                window.renderThumbnails(videos); // thumbnail-list.jsが必要
            } catch (err) {
                results.innerHTML = `<div style="color:red;">エラー: ${err.message}</div>`;
            }
        };
    }
};
