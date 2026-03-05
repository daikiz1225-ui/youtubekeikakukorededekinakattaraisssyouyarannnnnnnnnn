/* music.js - YouTube Music Mode: Search & UI Logic */

const MusicMode = {
    active: false,

    // Musicモードの起動
    init() {
        this.active = true;
        
        // UIの初期化（画面をMusic専用に書き換え）
        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div style="padding:20px; text-align:center;">
                <h2 style="color:#ff3eab; font-size:28px;">🎵 YouTube Music</h2>
                <p style="color:#aaa;">上の検索バーで曲やアーティストを探してね</p>
                <div id="music-results" class="grid" style="margin-top:30px;"></div>
            </div>`;

        // 検索ボタンとエンターキーの挙動をMusic用に書き換え
        this.setupSearchOverride();
        
        Actions.showStatusNotification("Musicモードに切り替えました🎵");
    },

    // 既存の検索機能をMusic用に一時的に乗っ取る
    setupSearchOverride() {
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');

        // ボタンクリック時
        searchBtn.onclick = () => {
            if (this.active) this.search();
            else Actions.search();
        };

        // エンターキー押下時
        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.active) this.search();
                else Actions.search();
                searchInput.blur();
            }
        };
    },

    // 音楽専用の検索ロジック
    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;

        const resultsContainer = document.getElementById('music-results');
        resultsContainer.innerHTML = "<p>音楽を探索中...</p>";

        // YouTube APIへのリクエストパラメータ
        // videoCategoryId: '10' が音楽カテゴリの証
        const params = {
            q: `${q} official audio`, // 精度を上げるために自動補完
            part: 'snippet',
            type: 'video',
            videoCategoryId: '10', 
            maxResults: 24,
            regionCode: 'JP'
        };

        try {
            const data = await YT.fetchAPI('search', params);
            this.renderMusicGrid(data.items);
        } catch (error) {
            resultsContainer.innerHTML = "<p>検索に失敗しました。</p>";
        }
    },

    // 音楽専用の正方形UIレンダリング
    renderMusicGrid(items) {
        const container = document.getElementById('music-results');
        if (!items || items.length === 0) {
            container.innerHTML = "<p>見つかりませんでした。</p>";
            return;
        }

        container.innerHTML = items.map(item => {
            const vId = item.id.videoId;
            const snip = item.snippet;
            // さっき作った api/jake を利用（なければ thumb で代用）
            const jakeUrl = `/api/jake?id=${vId}`;

            return `
            <div class="v-card" style="width:180px; cursor:pointer;" onclick="MusicMode.playMusic('${vId}')">
                <div class="jake-wrapper" style="width:180px; height:180px; overflow:hidden; border-radius:12px; position:relative; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover;">
                    <div style="position:absolute; bottom:8px; right:8px; background:rgba(255,62,171,0.8); width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px;">▶</div>
                </div>
                <div class="v-text" style="margin-top:10px; text-align:left;">
                    <h3 style="font-size:14px; margin:0; line-height:1.2; height:2.4em; overflow:hidden;">${snip.title}</h3>
                    <p style="font-size:12px; color:#ff3eab; margin:4px 0 0 0;">${snip.channelTitle}</p>
                </div>
            </div>`;
        }).join('');
    },

    // 音楽の再生（ここは次回のステップで「全く違う再生画面」に作り込みます）
    playMusic(vId) {
        // 一旦、既存の再生機能を呼ぶ（後に専用画面に差し替え）
        Actions.play({ id: { videoId: vId }, snippet: { title: "Loading...", channelTitle: "Music" } });
        Actions.showStatusNotification("Music再生中...");
    }
};
