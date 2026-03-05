/* music.js - YouTube Music Education Edition with Auto-Play */

const MusicMode = {
    active: false,
    playing: false,
    albums: {},
    currentList: [], // 現在表示・再生中の曲リスト
    currentIndex: 0, // 現在何曲目か

    init() {
        this.active = true;
        this.loadAlbums();
        this.renderMusicFullUI();
        this.fetchHotTracks();
        Actions.showStatusNotification("Musicモード (Edu) 起動 🎵");
    },

    loadAlbums() {
        const saved = localStorage.getItem('yt_music_albums');
        this.albums = saved ? JSON.parse(saved) : { "お気に入り": [] };
    },

    saveAlbums() {
        localStorage.setItem('yt_music_albums', JSON.stringify(this.albums));
    },

    renderMusicFullUI() {
        let musicHeader = document.getElementById('music-custom-header');
        if (!musicHeader) {
            musicHeader = document.createElement('div');
            musicHeader.id = 'music-custom-header';
            document.body.appendChild(musicHeader);
        }

        musicHeader.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 60px;
            background: #000; display: flex; align-items: center; padding: 0 20px;
            z-index: 9999; border-bottom: 1px solid #333; gap: 15px;
        `;

        musicHeader.innerHTML = `
            <div style="color:#ff3eab; font-weight:bold; font-size:18px; cursor:pointer;" onclick="MusicMode.fetchHotTracks()">🎵 Music</div>
            <div style="flex-grow: 1; display: flex; background: #222; border-radius: 20px; padding: 5px 12px;">
                <input type="text" id="music-search-input" placeholder="曲、アーティストを検索" 
                    style="background:none; border:none; color:white; width:100%; outline:none; font-size:14px;">
                <button onclick="MusicMode.searchMusic()" style="background:none; border:none; cursor:pointer;">🔍</button>
            </div>
            <button onclick="MusicMode.showAlbumList()" style="background:#ff3eab; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:12px;">マイリスト</button>
            <button onclick="MusicMode.exit()" style="background:#333; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-size:12px;">終了</button>
        `;

        document.getElementById('music-search-input').onkeydown = (e) => { if (e.key === 'Enter') this.searchMusic(); };

        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding: 20px; margin-top: 20px;"><div id="music-results" class="grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:20px;"></div></div>`;
    },

    // 再生画面（Educationドメイン ＆ 自動再生対応）
    playPlayer(vId, title, artist, index) {
        this.currentIndex = index;
        const jakeUrl = `/api/jake?id=${vId}`;
        
        let playerOverlay = document.getElementById('music-player-full');
        if (!playerOverlay) {
            playerOverlay = document.createElement('div');
            playerOverlay.id = 'music-player-full';
            document.body.appendChild(playerOverlay);
        }

        playerOverlay.style = `position:fixed; inset:0; background:#000; z-index:10000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;`;
        
        playerOverlay.innerHTML = `
            <div style="position:absolute; inset:0; background:url(${jakeUrl}) center/cover; filter:blur(80px) brightness(0.3); z-index:-1;"></div>
            <button onclick="document.getElementById('music-player-full').remove()" style="position:absolute; top:20px; left:20px; background:none; border:none; color:#fff; font-size:30px; cursor:pointer;">✕</button>
            
            <div style="position:absolute; width:1px; height:1px; opacity:0.01; pointer-events:none;">
                <iframe id="music-iframe" 
                    src="https://www.youtubeeducation.com/embed/${vId}?autoplay=1&enablejsapi=1&rel=0" 
                    style="width:100%; height:100%; border:none;" allow="autoplay"></iframe>
            </div>

            <div style="width:min(80vw, 350px); aspect-ratio:1/1; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.8); z-index:10;">
                <img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover;">
            </div>

            <div style="text-align:center; margin-top:30px; width:90%; z-index:10;">
                <h2 style="font-size:20px; color:white; margin:0;">${title}</h2>
                <p style="color:#ff3eab; font-size:16px; margin:8px 0;">${artist}</p>
                <button onclick="MusicMode.addToAlbumMenu('${vId}', '${title.replace(/'/g,"")}', '${artist.replace(/'/g,"")}')" 
                    style="background:rgba(255,255,255,0.1); border:1px solid #ff3eab; color:white; padding:6px 12px; border-radius:20px; cursor:pointer; margin-top:10px; font-size:12px;">➕ リストに追加</button>
            </div>

            <div style="display:flex; gap:40px; align-items:center; margin-top:40px; z-index:10;">
                <button style="background:none; border:none; color:white; font-size:30px; cursor:pointer;" onclick="MusicMode.playNext(-1)">⏮</button>
                <button style="background:white; color:black; width:65px; height:65px; border-radius:50%; border:none; font-size:30px; cursor:pointer;" onclick="MusicMode.togglePlay()">⏸</button>
                <button style="background:none; border:none; color:white; font-size:30px; cursor:pointer;" onclick="MusicMode.playNext(1)">⏭</button>
            </div>
            <p style="margin-top:20px; color:#666; font-size:11px;">※曲が終わると自動で次の曲を再生します</p>
        `;

        this.playing = true;
        this.setupAutoNext();
    },

    // 自動再生の仕掛け
    setupAutoNext() {
        // YouTube APIの終了イベントをとるのが理想ですが、簡易的に
        // メッセージを監視して「動画終了」を検知します
        window.onmessage = (e) => {
            if (typeof e.data === 'string') {
                const data = JSON.parse(e.data);
                if (data.event === 'infoDelivery' && data.info && data.info.playerState === 0) {
                    // playerState 0 は「終了」を意味します
                    console.log("曲が終了しました。次へ移動します。");
                    this.playNext(1);
                }
            }
        };
    },

    playNext(offset) {
        let nextIndex = this.currentIndex + offset;
        if (nextIndex >= this.currentList.length) nextIndex = 0; // 最初に戻る
        if (nextIndex < 0) nextIndex = this.currentList.length - 1; // 最後に飛ぶ

        const nextTrack = this.currentList[nextIndex];
        if (nextTrack) {
            const vId = nextTrack.id?.videoId || nextTrack.id;
            const snip = nextTrack.snippet || nextTrack;
            this.playPlayer(vId, snip.title, snip.channelTitle || snip.artist, nextIndex);
        }
    },

    // リスト描画時に currentList を更新するように変更
    renderMusicItemsHTML(items) {
        this.currentList = items; // ここで現在のリストを記憶
        return items.map((item, index) => {
            const vId = item.id?.videoId || item.id;
            const snip = item.snippet || item;
            const jakeUrl = `/api/jake?id=${vId}`;
            return `
            <div class="music-card" onclick="MusicMode.playPlayer('${vId}', '${snip.title.replace(/'/g,"")}', '${snip.channelTitle || snip.artist}', ${index})" style="cursor:pointer;">
                <div style="aspect-ratio:1/1; border-radius:12px; overflow:hidden; background:#222;"><img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover;"></div>
                <div style="margin-top:10px;">
                    <div style="font-weight:bold; font-size:13px; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${snip.title}</div>
                    <div style="font-size:11px; color:#ff3eab;">${snip.channelTitle || snip.artist}</div>
                </div>
            </div>`;
        }).join('');
    },

    // 以下、検索やアルバム表示の関数（前回のロジックを維持しつつ、renderMusicItemsHTMLを呼び出す）
    async searchMusic() {
        const query = document.getElementById('music-search-input').value;
        if (!query) return;
        const data = await YT.fetchAPI('search', { q: `${query} (official audio)`, part: 'snippet', type: 'video', videoCategoryId: '10', maxResults: 25 });
        document.getElementById('music-results').innerHTML = this.renderMusicItemsHTML(data.items);
    },

    async fetchHotTracks() {
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', videoCategoryId: '10', part: 'snippet', maxResults: 24, regionCode: 'JP' });
        document.getElementById('music-results').innerHTML = this.renderMusicItemsHTML(data.items);
    },

    showAlbumList() {
        const container = document.getElementById('music-results');
        container.innerHTML = `<div style="grid-column: 1/-1;"><h2 style="color:#ff3eab;">📁 マイ・アルバム</h2></div>` + 
            Object.keys(this.albums).map(name => `
                <div class="music-card" onclick="MusicMode.viewAlbum('${name}')" style="cursor:pointer; text-align:center;">
                    <div style="aspect-ratio:1/1; background:#1a1a1a; border:2px solid #ff3eab; border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:40px;">💿</div>
                    <h3 style="margin:10px 0 5px 0; font-size:14px;">${name}</h3>
                </div>`).join('');
    },

    viewAlbum(name) {
        document.getElementById('music-results').innerHTML = this.renderMusicItemsHTML(this.albums[name]);
    },

    togglePlay() {
        const iframe = document.getElementById('music-iframe');
        const cmd = this.playing ? 'pauseVideo' : 'playVideo';
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: [] }), '*');
        this.playing = !this.playing;
    },

    exit() { location.reload(); }
};
