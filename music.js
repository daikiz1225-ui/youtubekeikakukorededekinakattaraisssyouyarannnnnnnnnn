/* music.js - YouTube Music Full Overdrive Mode */

const MusicMode = {
    active: false,
    playing: false,

    // 1. Musicモード起動：既存の検索バーを隠す専用UIを生成
    init() {
        this.active = true;
        this.renderMusicFullUI();
        this.fetchHotTracks();
        Actions.showStatusNotification("Musicモード起動 🎵");
    },

    // 2. 画面全体をMusic専用に塗り替える（既存ヘッダーを隠す）
    renderMusicFullUI() {
        // bodyにMusic専用ヘッダーを注入（z-index: 9999で元のヘッダーの上に被せる）
        let musicHeader = document.getElementById('music-custom-header');
        if (!musicHeader) {
            musicHeader = document.createElement('div');
            musicHeader.id = 'music-custom-header';
            document.body.appendChild(musicHeader);
        }

        // スタイル設定：元のヘッダーを完全に覆い隠す
        musicHeader.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 60px;
            background: #000; display: flex; align-items: center; padding: 0 20px;
            z-index: 9999; border-bottom: 1px solid #333; gap: 20px;
        `;

        musicHeader.innerHTML = `
            <div style="color:#ff3eab; font-weight:bold; font-size:20px; cursor:pointer;" onclick="MusicMode.fetchHotTracks()">🎵 Music</div>
            <div style="flex-grow: 1; display: flex; max-width: 600px; background: #222; border-radius: 20px; padding: 5px 15px;">
                <input type="text" id="music-search-input" placeholder="曲、アーティスト、アルバムを検索" 
                    style="background:none; border:none; color:white; width:100%; outline:none; font-size:16px;">
                <button onclick="MusicMode.searchMusic()" style="background:none; border:none; cursor:pointer; font-size:18px;">🔍</button>
            </div>
            <button onclick="MusicMode.exit()" style="background:#333; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">通常に戻る</button>
        `;

        // エンターキー対応
        document.getElementById('music-search-input').onkeydown = (e) => {
            if (e.key === 'Enter') this.searchMusic();
        };

        // メインコンテンツエリアの準備
        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div id="music-results" class="grid" style="padding: 20px; margin-top: 20px; display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:20px;">
                </div>
        `;
    },

    // 3. 音楽専用の検索
    async searchMusic() {
        const query = document.getElementById('music-search-input').value;
        if (!query) return;

        const resultsContainer = document.getElementById('music-results');
        resultsContainer.innerHTML = "<p>探索中...</p>";

        // 検索ワードを音楽用に最適化（カテゴリ10を強制）
        const data = await YT.fetchAPI('search', {
            q: `${query} (official audio OR lyrics)`,
            part: 'snippet',
            type: 'video',
            videoCategoryId: '10', 
            maxResults: 30,
            regionCode: 'JP'
        });

        this.renderMusicItems(data.items);
    },

    async fetchHotTracks() {
        const data = await YT.fetchAPI('videos', {
            chart: 'mostPopular',
            videoCategoryId: '10',
            part: 'snippet',
            maxResults: 24,
            regionCode: 'JP'
        });
        this.renderMusicItems(data.items);
    },

    // 4. 正方形アイテムの描画
    renderMusicItems(items) {
        const container = document.getElementById('music-results');
        if (!items || items.length === 0) {
            container.innerHTML = "<p>音楽が見つかりませんでした。</p>";
            return;
        }
        container.innerHTML = items.map(item => {
            const vId = item.id?.videoId || item.id;
            const snip = item.snippet;
            const jakeUrl = `/api/jake?id=${vId}`;

            return `
            <div class="music-card" onclick="MusicMode.playPlayer('${vId}', '${snip.title.replace(/'/g,"")}', '${snip.channelTitle.replace(/'/g,"")}')" style="cursor:pointer; transition: transform 0.2s;">
                <div style="aspect-ratio:1/1; position:relative; overflow:hidden; border-radius:12px; background:#222; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    <img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="margin-top:10px;">
                    <div style="font-weight:bold; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${snip.title}</div>
                    <div style="font-size:12px; color:#ff3eab;">${snip.channelTitle}</div>
                </div>
            </div>`;
        }).join('');
    },

    // 5. 再生画面（動画を完全に隠す）
    playPlayer(vId, title, artist) {
        const jakeUrl = `/api/jake?id=${vId}`;
        
        const playerOverlay = document.createElement('div');
        playerOverlay.id = 'music-player-full';
        playerOverlay.style = `
            position:fixed; inset:0; background:#000; z-index:10000; 
            display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;
        `;
        
        playerOverlay.innerHTML = `
            <div style="position:absolute; inset:0; background:url(${jakeUrl}) center/cover; filter:blur(80px) brightness(0.3); z-index:-1;"></div>
            <button onclick="this.parentElement.remove()" style="position:absolute; top:20px; left:20px; background:none; border:none; color:#fff; font-size:30px; cursor:pointer;">✕</button>
            
            <div style="width:min(85vw, 380px); aspect-ratio:1/1; border-radius:20px; overflow:hidden; box-shadow:0 30px 60px rgba(0,0,0,0.8);">
                <img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover;">
            </div>

            <div style="text-align:center; margin-top:40px; width:90%;">
                <h2 style="font-size:24px; margin:0;">${title}</h2>
                <p style="color:#ff3eab; font-size:18px; margin:10px 0;">${artist}</p>
            </div>

            <iframe id="music-iframe" src="https://www.youtubeeducation.com/embed/${vId}?autoplay=1&enablejsapi=1" 
                style="width:1px; height:1px; position:absolute; opacity:0;"></iframe>

            <div style="display:flex; gap:40px; align-items:center; margin-top:30px;">
                <button style="background:none; border:none; color:white; font-size:30px; cursor:pointer;" onclick="MusicMode.control('previous')">⏮</button>
                <button id="m-play-btn" style="background:white; color:black; width:70px; height:70px; border-radius:50%; border:none; font-size:30px; cursor:pointer;" onclick="MusicMode.togglePlay()">⏸</button>
                <button style="background:none; border:none; color:white; font-size:30px; cursor:pointer;" onclick="MusicMode.control('next')">⏭</button>
            </div>
        `;
        document.body.appendChild(playerOverlay);
        this.playing = true;
    },

    togglePlay() {
        const iframe = document.getElementById('music-iframe');
        const btn = document.getElementById('m-play-btn');
        const cmd = this.playing ? 'pauseVideo' : 'playVideo';
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: [] }), '*');
        this.playing = !this.playing;
        btn.innerText = this.playing ? '⏸' : '▶';
    },

    exit() {
        const h = document.getElementById('music-custom-header');
        if (h) h.remove();
        this.active = false;
        Actions.goHome(); // app.jsの機能でホームに戻す
    }
};
