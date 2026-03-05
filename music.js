/* music.js - YouTube Music Full Mode with Album System */

const MusicMode = {
    active: false,
    playing: false,
    albums: {},

    init() {
        this.active = true;
        this.loadAlbums();
        this.renderMusicFullUI();
        this.fetchHotTracks();
        Actions.showStatusNotification("Musicモード起動 🎵");
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
            z-index: 9999; border-bottom: 1px solid #333; gap: 20px;
        `;

        musicHeader.innerHTML = `
            <div style="color:#ff3eab; font-weight:bold; font-size:20px; cursor:pointer;" onclick="MusicMode.fetchHotTracks()">🎵 Music</div>
            <div style="flex-grow: 1; display: flex; max-width: 600px; background: #222; border-radius: 20px; padding: 5px 15px;">
                <input type="text" id="music-search-input" placeholder="曲、アーティストを検索" 
                    style="background:none; border:none; color:white; width:100%; outline:none; font-size:16px;">
                <button onclick="MusicMode.searchMusic()" style="background:none; border:none; cursor:pointer; font-size:18px;">🔍</button>
            </div>
            <button onclick="MusicMode.exit()" style="background:#333; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">終了</button>
        `;

        document.getElementById('music-search-input').onkeydown = (e) => {
            if (e.key === 'Enter') this.searchMusic();
        };

        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div style="padding: 20px; margin-top: 20px;">
                <div id="music-results" class="grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:20px;"></div>
            </div>
        `;
    },

    async searchMusic() {
        const query = document.getElementById('music-search-input').value;
        if (!query) return;
        const resultsContainer = document.getElementById('music-results');
        resultsContainer.innerHTML = "<p>検索中...</p>";

        const data = await YT.fetchAPI('search', {
            q: `${query} (official audio)`,
            part: 'snippet', type: 'video', videoCategoryId: '10', maxResults: 25, regionCode: 'JP'
        });
        this.renderMusicItems(data.items);
    },

    async fetchHotTracks() {
        const data = await YT.fetchAPI('videos', {
            chart: 'mostPopular', videoCategoryId: '10', part: 'snippet', maxResults: 24, regionCode: 'JP'
        });
        this.renderMusicItems(data.items);
    },

    renderMusicItems(items) {
        const container = document.getElementById('music-results');
        container.innerHTML = items.map(item => {
            const vId = item.id?.videoId || item.id;
            const snip = item.snippet;
            const jakeUrl = `/api/jake?id=${vId}`;
            return `
            <div class="music-card" onclick="MusicMode.playPlayer('${vId}', '${snip.title.replace(/'/g,"")}', '${snip.channelTitle.replace(/'/g,"")}')" style="cursor:pointer;">
                <div style="aspect-ratio:1/1; border-radius:12px; overflow:hidden; background:#222;">
                    <img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="margin-top:10px;">
                    <div style="font-weight:bold; font-size:13px; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${snip.title}</div>
                    <div style="font-size:11px; color:#ff3eab;">${snip.channelTitle}</div>
                </div>
            </div>`;
        }).join('');
    },

    // 5. 再生画面 + アルバム追加ボタン
    playPlayer(vId, title, artist) {
        const jakeUrl = `/api/jake?id=${vId}`;
        
        let playerOverlay = document.getElementById('music-player-full');
        if (!playerOverlay) {
            playerOverlay = document.createElement('div');
            playerOverlay.id = 'music-player-full';
            document.body.appendChild(playerOverlay);
        }

        playerOverlay.style = `
            position:fixed; inset:0; background:#000; z-index:10000; 
            display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;
        `;
        
        playerOverlay.innerHTML = `
            <div style="position:absolute; inset:0; background:url(${jakeUrl}) center/cover; filter:blur(80px) brightness(0.3); z-index:-1;"></div>
            <button onclick="document.getElementById('music-player-full').remove()" style="position:absolute; top:20px; left:20px; background:none; border:none; color:#fff; font-size:30px; cursor:pointer;">✕</button>
            
            <div style="width:min(80vw, 350px); aspect-ratio:1/1; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.8);">
                <img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover;">
            </div>

            <div style="text-align:center; margin-top:30px; width:90%;">
                <h2 style="font-size:22px; margin:0; color:white;">${title}</h2>
                <p style="color:#ff3eab; font-size:16px; margin:8px 0;">${artist}</p>
                
                <button onclick="MusicMode.addToAlbumMenu('${vId}', '${title.replace(/'/g,"")}', '${artist.replace(/'/g,"")}')" 
                    style="background:rgba(255,255,255,0.1); border:1px solid #ff3eab; color:white; padding:8px 15px; border-radius:20px; cursor:pointer; margin-top:10px; font-size:14px;">
                    ➕ アルバムに追加
                </button>
            </div>

            <iframe id="music-iframe" 
                src="https://www.youtube-nocookie.com/embed/${vId}?autoplay=1&enablejsapi=1&origin=${window.location.origin}" 
                style="width:1px; height:1px; position:absolute; opacity:0; pointer-events:none;"
                allow="autoplay"></iframe>

            <div style="display:flex; gap:40px; align-items:center; margin-top:40px;">
                <button style="background:none; border:none; color:white; font-size:35px; cursor:pointer;" onclick="MusicMode.togglePlay()">⏸</button>
            </div>
        `;
        this.playing = true;
    },

    // 6. 自作アルバムへの追加ロジック
    addToAlbumMenu(vId, title, artist) {
        const albumNames = Object.keys(this.albums);
        let msg = "追加先のアルバム名を入力してください:\n\n現在あるアルバム:\n" + albumNames.join(", ");
        const target = prompt(msg, "お気に入り");

        if (target) {
            if (!this.albums[target]) {
                if(confirm(`アルバム「${target}」は存在しません。新しく作りますか？`)) {
                    this.albums[target] = [];
                } else {
                    return;
                }
            }
            this.albums[target].push({ id: vId, title, artist, date: new Date().getTime() });
            this.saveAlbums();
            Actions.showStatusNotification(`「${target}」に追加しました！`);
        }
    },

    togglePlay() {
        const iframe = document.getElementById('music-iframe');
        const cmd = this.playing ? 'pauseVideo' : 'playVideo';
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: [] }), '*');
        this.playing = !this.playing;
    },

    exit() {
        const h = document.getElementById('music-custom-header');
        if (h) h.remove();
        this.active = false;
        location.reload();
    }
};
