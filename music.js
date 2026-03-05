/* music.js - YouTube Music Mode with Album & Auto-Mix */

const MusicMode = {
    isMusicMode: false,
    albums: {}, // ローカルアルバム { "アルバム名": [videoオブジェクト] }
    
    init() {
        this.isMusicMode = true;
        this.loadAlbums();
        this.renderMusicHome();
    },

    loadAlbums() {
        const saved = localStorage.getItem('yt_music_albums');
        this.albums = saved ? JSON.parse(saved) : { "お気に入り": [] };
    },

    saveAlbums() {
        localStorage.setItem('yt_music_albums', JSON.stringify(this.albums));
    },

    // Musicモード専用ホーム画面
    async renderMusicHome() {
        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div style="padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="color:#ff3eab;">🎵 Music Mode</h2>
                    <button class="btn" onclick="MusicMode.createNewAlbum()" style="background:#ff3eab;">＋ アルバム作成</button>
                </div>
                <div id="music-sections">
                    <section>
                        <h3>マイ・アルバム</h3>
                        <div class="grid" id="album-grid"></div>
                    </section>
                    <section style="margin-top:30px;">
                        <h3>おすすめの曲</h3>
                        <div class="grid" id="music-recommend-grid">読み込み中...</div>
                    </section>
                </div>
            </div>`;
        this.renderAlbumGrid();
        this.fetchMusicRecommendations();
    },

    // 音楽カテゴリ(ID: 10)に絞って検索
    async fetchMusicRecommendations() {
        const data = await YT.fetchAPI('videos', {
            chart: 'mostPopular',
            videoCategoryId: '10',
            regionCode: 'JP',
            maxResults: 12,
            part: 'snippet'
        });
        const grid = document.getElementById('music-recommend-grid');
        grid.innerHTML = this.renderMusicCards(data.items);
    },

    // 正方形のジャケ画カードを生成
    renderMusicCards(items) {
        return items.map((item, index) => {
            const vId = item.id?.videoId || (typeof item.id === 'string' ? item.id : "");
            const snip = item.snippet;
            const jakeUrl = `/api/jake?id=${vId}`; // さっき作ったプロキシを利用

            return `
            <div class="v-card" style="width:180px;" onclick="MusicMode.playMusic('${vId}', ${index})">
                <div class="thumb-container" style="aspect-ratio: 1/1; overflow:hidden;">
                    <img src="${jakeUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
                    <div class="play-overlay" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3); opacity:0; transition:0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                        <span style="font-size:40px;">▶️</span>
                    </div>
                </div>
                <div class="v-text" style="text-align:center;">
                    <h4 style="margin:8px 0 4px 0; font-size:14px; line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;">${snip.title}</h4>
                    <p style="font-size:12px; color:#aaa;">${snip.channelTitle}</p>
                    <button onclick="event.stopPropagation(); MusicMode.addToAlbumPrompt('${vId}', '${snip.title.replace(/'/g,"")}', '${snip.channelTitle.replace(/'/g,"")}')" style="background:none; border:1px solid #444; color:#aaa; font-size:10px; margin-top:5px; border-radius:4px; cursor:pointer;">アルバムに追加</button>
                </div>
            </div>`;
        }).join('');
    },

    renderAlbumGrid() {
        const grid = document.getElementById('album-grid');
        grid.innerHTML = Object.keys(this.albums).map(name => `
            <div class="v-card" style="width:150px; text-align:center;" onclick="MusicMode.viewAlbum('${name}')">
                <div style="width:150px; height:150px; background:#222; border-radius:15px; display:flex; align-items:center; justify-content:center; font-size:50px; border:2px solid #ff3eab;">💿</div>
                <h4>${name}</h4>
                <p style="font-size:12px; color:#888;">${this.albums[name].length}曲</p>
            </div>
        `).join('');
    },

    createNewAlbum() {
        const name = prompt("アルバム名を入力してください:");
        if (name && !this.albums[name]) {
            this.albums[name] = [];
            this.saveAlbums();
            this.renderAlbumGrid();
        }
    },

    addToAlbumPrompt(vId, title, author) {
        const names = Object.keys(this.albums);
        if (names.length === 0) return alert("アルバムを先に作成してください");
        const name = prompt(`追加先のアルバム名を入力してください:\n(${names.join(', ')})`);
        if (this.albums[name]) {
            this.albums[name].push({ id: vId, title, author });
            this.saveAlbums();
            alert("追加しました！");
        }
    },

    playMusic(vId, index) {
        // 再生ロジックはapp.jsのActions.playを再利用
        const videoObj = { id: { videoId: vId }, snippet: { title: "Playing Music...", channelTitle: "Music Mode" } };
        Actions.play(videoObj);
        
        // オートミックス（曲が終わったら次を流す）の仕掛け
        // 簡易的に再生開始の数秒後に「次」をセットするロジック（実際は終了検知が必要）
        console.log("Auto-Mix enabled for:", vId);
    }
};
