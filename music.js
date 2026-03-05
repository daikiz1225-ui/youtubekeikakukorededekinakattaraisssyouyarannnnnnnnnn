/* music.js - YouTube Music Full Clone Mode */

const MusicMode = {
    active: false,
    currentTrack: null,

    // 1. Musicモード起動
    init() {
        this.active = true;
        this.renderMusicShell();
        this.setupSearchOverride();
        this.fetchHotTracks();
        Actions.showStatusNotification("Musicモード起動 🎵");
    },

    // 2. Music専用のガワを作成
    renderMusicShell() {
        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div id="music-root" style="background:#000; min-height:100vh; color:white; padding:20px;">
                <div id="music-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                    <h1 style="color:#ff3eab; margin:0; font-size:24px;">🎵 Music</h1>
                    <div style="display:flex; gap:15px;">
                        <button class="btn" onclick="MusicMode.fetchHotTracks()" style="background:#333;">急上昇</button>
                        <button class="btn" onclick="MusicMode.exit()" style="background:#444;">通常に戻る</button>
                    </div>
                </div>
                <div id="music-display-area">
                    <div id="music-results" class="grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:20px;"></div>
                </div>
            </div>`;
    },

    // 3. 検索のオーバーライド（Music専用検索）
    setupSearchOverride() {
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');

        const performMusicSearch = () => {
            if (this.active) this.searchMusic(searchInput.value);
            else Actions.search();
        };

        searchBtn.onclick = performMusicSearch;
        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performMusicSearch();
                searchInput.blur();
            }
        };
    },

    // 4. 超・音楽特化検索
    async searchMusic(query) {
        if (!query) return;
        const resultsContainer = document.getElementById('music-results');
        resultsContainer.innerHTML = "<p>探索中...</p>";

        // 検索ワードを音楽用に最適化
        const refinedQuery = `${query} (official audio OR topic OR lyrics)`;
        
        const data = await YT.fetchAPI('search', {
            q: refinedQuery,
            part: 'snippet',
            type: 'video',
            videoCategoryId: '10', // Music Category
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
            maxResults: 20,
            regionCode: 'JP'
        });
        this.renderMusicItems(data.items);
    },

    // 5. 正方形ジャケ画レンダリング
    renderMusicItems(items) {
        const container = document.getElementById('music-results');
        container.innerHTML = items.map(item => {
            const vId = item.id?.videoId || item.id;
            const snip = item.snippet;
            const jakeUrl = `/api/jake?id=${vId}`; // 先程作成したAPIを使用

            return `
            <div class="music-card" onclick="MusicMode.playPlayer('${vId}', '${snip.title.replace(/'/g,"")}', '${snip.channelTitle.replace(/'/g,"")}')" style="cursor:pointer; transition: transform 0.2s;">
                <div style="aspect-ratio:1/1; position:relative; overflow:hidden; border-radius:8px; background:#222;">
                    <img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover;">
                    <div class="hover-play" style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                        <span style="font-size:40px;">▶</span>
                    </div>
                </div>
                <div style="margin-top:10px;">
                    <div style="font-weight:bold; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${snip.title}</div>
                    <div style="font-size:12px; color:#aaa;">${snip.channelTitle}</div>
                </div>
            </div>`;
        }).join('');
    },

    // 6. Music専用再生画面 (動画なし・ジャケ画メイン)
    playPlayer(vId, title, artist) {
        const container = document.getElementById('view-container');
        const jakeUrl = `/api/jake?id=${vId}`;
        
        container.innerHTML = `
            <div id="music-player-full" style="position:fixed; inset:0; background:#000; z-index:2000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;">
                <div style="position:absolute; inset:0; background:url(${jakeUrl}) center/cover; filter:blur(60px) brightness(0.4); opacity:0.6; z-index:-1;"></div>
                
                <button onclick="MusicMode.renderMusicShell()" style="position:absolute; top:20px; left:20px; background:none; border:none; color:#fff; font-size:24px; cursor:pointer;">✕</button>

                <div id="player-jake" style="width:min(80vw, 400px); aspect-ratio:1/1; box-shadow:0 20px 50px rgba(0,0,0,0.8); border-radius:15px; overflow:hidden; margin-bottom:40px;">
                    <img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover;">
                </div>

                <div style="text-align:center; width:100%; max-width:600px; margin-bottom:40px;">
                    <h2 style="font-size:24px; margin:0 0 10px 0;">${title}</h2>
                    <p style="color:#ff3eab; font-size:18px; margin:0;">${artist}</p>
                </div>

                <div style="width:1px; height:1px; opacity:0; pointer-events:none;">
                    <div id="music-video-hidden"></div>
                </div>

                <div style="display:flex; gap:30px; align-items:center;">
                    <button class="btn" style="font-size:24px; background:none;" onclick="Actions.playRelative(-1)">⏮</button>
                    <button class="btn" style="font-size:50px; background:none; color:#ff3eab;" onclick="MusicMode.togglePlay()">⏸</button>
                    <button class="btn" style="font-size:24px; background:none;" onclick="Actions.playRelative(1)">⏭</button>
                </div>
            </div>`;

        // 実際に再生を開始（YouTube Iframe APIを使用するためiframeを生成）
        const embedUrl = `https://www.youtubeeducation.com/embed/${vId}?autoplay=1&enablejsapi=1&modestbranding=1`;
        document.getElementById('music-video-hidden').innerHTML = `<iframe id="music-iframe" src="${embedUrl}" allow="autoplay"></iframe>`;
        
        // 履歴に追加
        Storage.addHistory({ id: vId, title: title, thumb: jakeUrl, channelTitle: artist });
    },

    togglePlay() {
        const iframe = document.getElementById('music-iframe');
        if (!iframe) return;
        // 簡易的な一時停止/再生切り替え
        const cmd = this.playing ? 'pauseVideo' : 'playVideo';
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: [] }), '*');
        this.playing = !this.playing;
    },

    exit() {
        this.active = false;
        location.reload(); // 一旦リロードでリセットするのが確実
    }
};
