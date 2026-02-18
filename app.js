// --- Storage: データの保存・管理 ---
const Storage = {
    get(key, def = []) { return JSON.parse(localStorage.getItem(key)) || def; },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

    getLiked() { return this.get('yt_liked'); },
    toggleLike(v) {
        let l = this.getLiked();
        const idx = l.findIndex(x => x.id === v.id);
        if (idx > -1) l.splice(idx, 1); else l.unshift(v);
        this.set('yt_liked', l);
    },

    getPlaylists() { return this.get('yt_playlists', {}); },
    savePlaylists(p) { this.set('yt_playlists', p); },
    deletePlaylist(name) {
        let p = this.getPlaylists();
        if (confirm(`プレイリスト「${name}」を削除しますか？`)) {
            delete p[name];
            this.savePlaylists(p);
            Actions.renderSidebar();
        }
    },
    removeFromPlaylist(name, videoId) {
        let p = this.getPlaylists();
        p[name] = p[name].filter(x => x.id !== videoId);
        this.savePlaylists(p);
    }
};

// --- Theme: ダーク・ライト切り替え ---
const Theme = {
    init() {
        const t = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        this.updateBtn(t);
    },
    toggle() {
        const curr = document.documentElement.getAttribute('data-theme');
        const next = curr === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        this.updateBtn(next);
    },
    updateBtn(t) {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) btn.innerText = t === 'dark' ? '🌙' : '☀️';
    }
};

// --- Actions: メインロジック ---
const Actions = {
    currentList: [],
    currentIndex: -1,
    nextToken: "",
    channelIcons: {},
    player: null,

    init() {
        Theme.init();
        this.renderSidebar();
        this.goHome();
    },

    renderSidebar() {
        const playlists = Storage.getPlaylists();
        const playlistHTML = Object.keys(playlists).map(name => `
            <div class="nav-item">
                <span onclick="Actions.showPlaylist('${name}')" style="flex:1;">📁 ${name}</span>
                <button class="del-btn" onclick="Storage.deletePlaylist('${name}')">🗑️</button>
            </div>
        `).join('');

        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome()">🏠 <span>ホーム</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div>
            <div class="nav-item" onclick="Actions.showSubs()">🔔 <span>登録</span></div>
            <div class="sidebar-section">
                <div class="sidebar-title">ライブラリ</div>
                <div class="nav-item" onclick="Actions.showLiked()">👍 <span>評価した動画</span></div>
                <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div>
                ${playlistHTML}
                <div class="nav-item" onclick="Actions.promptNewPlaylist()" style="color:var(--accent)">➕ <span>新規作成</span></div>
            </div>
        `;
    },

    async play(video, index = -1) {
        this.currentIndex = index;
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        this.showView();
        
        const isLiked = Storage.getLiked().some(x => x.id === videoId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="display:flex; gap:20px; padding:20px; flex-wrap:wrap;">
                <div style="flex:3; min-width:600px;">
                    <div id="yt-player-placeholder" style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;"></div>
                    <div style="padding:15px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <h2 style="font-size:20px; margin:0;">${video.snippet.title}</h2>
                            <div class="video-actions">
                                <button class="action-btn ${isLiked ? 'active' : ''}" onclick="Actions.handleLike('${videoId}')">👍</button>
                                <button class="action-btn" onclick="Actions.showPlaylistSelector('${videoId}')">➕</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="side-list" style="flex:1; min-width:300px;"></div>
            </div>`;

        // YouTube Playerの初期化 (連続再生用)
        this.player = new YT.Player('yt-player-placeholder', {
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'rel': 0 },
            events: { 'onStateChange': (e) => { if(e.data === 0) Actions.playNext(); } }
        });

        // 履歴追加
        Storage.set('yt_history', [video, ...Storage.get('yt_history').filter(x => (x.id.videoId||x.id) !== videoId)].slice(0, 50));
    },

    playNext() {
        if (this.currentIndex >= 0 && this.currentIndex < this.currentList.length - 1) {
            this.play(this.currentList[this.currentIndex + 1], this.currentIndex + 1);
        }
    },

    async search(q = document.getElementById('search-input').value) {
        if (!q) return;
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 24 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'view-container');
    },

    async fetchTrending() {
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'view-container');
    },

    renderGrid(items, targetId, listType = "normal") {
        const container = document.getElementById(targetId);
        container.innerHTML = `<div class="grid">` + items.map((item, i) => {
            const vId = item.id.videoId || item.id;
            return `
            <div class="v-card">
                <div class="thumb-container" onclick="Actions.playFromList(${i})">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                </div>
                <div class="v-text">
                    <h3 onclick="Actions.playFromList(${i})">${item.snippet.title}</h3>
                    ${listType === 'playlist_edit' ? `<button class="del-btn" onclick="Actions.removeVideoFromUI('${vId}')">✕</button>` : ''}
                </div>
                <p style="font-size:12px; color:var(--text-sub);">${item.snippet.channelTitle}</p>
            </div>`;
        }).join('') + `</div>`;
    },

    playFromList(index) { this.play(this.currentList[index], index); },

    showPlaylist(name) {
        this.currentPlaylistName = name;
        const items = Storage.getPlaylists()[name] || [];
        this.currentList = items.map(v => ({ id: v.id, snippet: { title: v.title, thumbnails: { high: { url: v.thumb } }, channelTitle: v.channelTitle } }));
        this.showView();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>📁 ${name}</h1><div id="pl-grid"></div></div>`;
        this.renderGrid(this.currentList, 'pl-grid', 'playlist_edit');
    },

    removeVideoFromUI(videoId) {
        Storage.removeFromPlaylist(this.currentPlaylistName, videoId);
        this.showPlaylist(this.currentPlaylistName);
    },

    showLiked() {
        const items = Storage.getLiked();
        this.currentList = items.map(v => ({ id: v.id, snippet: { title: v.title, thumbnails: { high: { url: v.thumb } }, channelTitle: v.channelTitle } }));
        this.showView();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>👍 高評価した動画</h1><div id="liked-grid"></div></div>`;
        this.renderGrid(this.currentList, 'liked-grid');
    },

    promptNewPlaylist() {
        const name = prompt("新しいプレイリスト名:");
        if (name) { Storage.createPlaylist(name); this.renderSidebar(); }
    },

    showPlaylistSelector(videoId) {
        const playlists = Storage.getPlaylists();
        const html = Object.keys(playlists).map(name => `<div class="playlist-item" onclick="Actions.addToPL('${name}', '${videoId}')">📁 ${name}</div>`).join('');
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
        modal.innerHTML = `<div class="modal-content"><h3>リストに保存</h3>${html}<button onclick="this.parentElement.parentElement.remove()" style="width:100%; margin-top:10px;">閉じる</button></div>`;
        document.body.appendChild(modal);
    },

    addToPL(name, videoId) {
        const v = this.currentList.find(x => (x.id.videoId||x.id) === videoId) || Storage.get('yt_history').find(x => (x.id.videoId||x.id) === videoId);
        Storage.addToPlaylist(name, { id: videoId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        alert("追加しました");
    },

    goHome() { this.fetchTrending(); },
    showView() { window.scrollTo(0,0); }
};

// YouTube API Ready
function onYouTubeIframeAPIReady() { Actions.init(); }
