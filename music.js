/* music.js - 究極の「これでよくね？」エディション */

const MusicMode = {
    init() {
        // 1. 画面を音楽検索っぽく見せる
        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div style="padding:20px;">
                <h2 style="color:#ff3eab; display:flex; align-items:center; gap:10px;">
                    🎵 Music Mode <span style="font-size:12px; font-weight:normal; color:#888;">(Beta)</span>
                </h2>
                <div id="music-grid" class="grid" style="margin-top:20px;">
                    <p style="color:#666;">検索バーにアーティスト名を入れてみて！</p>
                </div>
            </div>`;

        // 2. 検索ボタンの挙動だけ「音楽専用」にジャックする
        document.getElementById('search-btn').onclick = () => this.search();
        
        Actions.showStatusNotification("Musicモード：検索が音楽特化になりました");
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;

        // 音楽カテゴリ(10)で検索して、そのままapp.jsの描画に投げる
        const data = await YT.fetchAPI('search', {
            q: q + " official audio",
            part: 'snippet',
            type: 'video',
            videoCategoryId: '10',
            maxResults: 20
        });

        // 描画はapp.jsに任せるか、自前でやる
        const grid = document.getElementById('music-grid');
        grid.innerHTML = data.items.map(item => `
            <div class="v-card" onclick="Actions.play(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <img src="/api/thumb?id=${item.id.videoId}" style="width:100%; border-radius:10px;">
                <div class="v-text">
                    <h4>${item.snippet.title}</h4>
                    <p>${item.snippet.channelTitle}</p>
                </div>
            </div>
        `).join('');
    }
};
