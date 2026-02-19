const YT = {
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    currentEduKey: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",

    async refreshEduKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            if (data && data.key) this.currentEduKey = data.key;
        } catch (e) { console.error("Key refresh fail"); }
    },

    getCurrentKey() {
        const index = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[index];
    },

    async fetchAPI(endpoint, params) {
        const queryParams = new URLSearchParams({ ...params, key: this.getCurrentKey() });
        const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams}`);
        if (res.status === 403) {
            let next = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
            if (next < this.keys.length) {
                localStorage.setItem('yt_key_index', next);
                return this.fetchAPI(endpoint, params);
            }
        }
        return await res.json();
    },

    getEmbedUrl(id) {
        const params = new URLSearchParams({
            autoplay: 1, origin: "https://create.kahoot.it",
            embed_config: JSON.stringify({ enc: this.currentEduKey, hideTitle: true }),
            rel: 0, modestbranding: 1, enablejsapi: 1
        });
        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

const Storage = {
    get(k) { return JSON.parse(localStorage.getItem(k)) || []; },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },

    addHistory(v) {
        let h = this.get('yt_history');
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50);
        this.set('yt_history', h);
    },
    toggleSub(c) {
        let s = this.get('yt_subs');
        const idx = s.findIndex(x => x.id === c.id);
        if (idx > -1) s.splice(idx, 1); else s.push(c);
        this.set('yt_subs', s);
    },
    toggleLike(v) {
        let l = this.get('yt_likes');
        const idx = l.findIndex(x => x.id === v.id);
        if (idx > -1) l.splice(idx, 1); else l.push(v);
        this.set('yt_likes', l);
    },
    createPlaylist(name) {
        let p = this.get('yt_playlists');
        if (!p.find(x => x.name === name)) {
            p.push({ name, videos: [] });
            this.set('yt_playlists', p);
        }
    },
    addToPlaylist(pName, v) {
        let p = this.get('yt_playlists');
        const list = p.find(x => x.name === pName);
        if (list && !list.videos.find(x => x.id === v.id)) {
            list.videos.push(v);
            this.set('yt_playlists', p);
        }
    },
    removeFromPlaylist(pName, vId) {
        let p = this.get('yt_playlists');
        const list = p.find(x => x.name === pName);
        if (list) {
            list.videos = list.videos.filter(x => x.id !== vId);
            this.set('yt_playlists', p);
        }
    }
};

const Actions = {
    currentList: [], relatedList: [], channelIcons: {},
    isDarkMode: true, currentPlayVideo: null,

    async init() {
        this.loadTheme();
        this.renderSidebar();
        await YT.refreshEduKey();
        this.goHome();

        document.getElementById('search-input').onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.search(); e.target.blur(); }
        };
        document.getElementById('search-btn').onclick = () => this.search();
        document.getElementById('theme-toggle-btn').onclick = () => this.toggleTheme();
    },

    loadTheme() {
        this.isDarkMode = localStorage.getItem('yt_theme') !== 'light';
        this.applyTheme();
    },
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('yt_theme', this.isDarkMode ? 'dark' : 'light');
        this.applyTheme();
    },
    applyTheme() {
        const r = document.documentElement.style;
        if (this.isDarkMode) {
            r.setProperty('--bg-color', '#0f0f0f'); r.setProperty('--text-color', '#ffffff');
            r.setProperty('--card-bg', 'rgba(128, 128, 128, 0.1)'); r.setProperty('--border-color', '#333');
        } else {
            r.setProperty('--bg-color', '#ffffff'); r.setProperty('--text-color', '#0f0f0f');
            r.setProperty('--card-bg', '#f2f2f2'); r.setProperty('--border-color', '#ccc');
        }
    },

    renderSidebar() {
        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome()">🏠<span>ホーム</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡<span>ショート</span></div>
            <div class="nav-item" onclick="Actions.showLikes()">👍<span>いいね</span></div>
            <div class="nav-item" onclick="Actions.showPlaylists()">📁<span>リスト</span></div>
            <div class="nav-item" onclick="Actions.showSubs()">🔔<span>登録中</span></div>
            <div class="nav-item" onclick="Actions.showHistory()">🕒<span>履歴</span></div>
        `;
    },

    async goHome() {
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid();
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 30 });
        this.currentList = data.items || [];
        this.renderGrid();
    },

    async showShortsFeed() {
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 30 });
        this.currentList = data.items || [];
        this.renderGrid();
    },

    renderGrid() {
        const container = document.getElementById('view-container');
        const html = this.currentList.map((item, i) => `
            <div class="v-card" onclick="Actions.playFromList(${i})">
                <div class="thumb-container">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                </div>
                <div class="v-text">
                    <h3>${item.snippet.title}</h3>
                    <p>${item.snippet.channelTitle}</p>
                </div>
            </div>
        `).join('');
        container.innerHTML = `<div class="grid">${html}</div>`;
        window.scrollTo(0, 0);
    },

    async play(video) {
        if (!video) return;
        this.currentPlayVideo = video;
        const vId = (typeof video.id === 'string') ? video.id : (video.id.videoId || video.id.resourceId?.videoId);
        if (!vId) return;

        await YT.refreshEduKey();
        const isLiked = Storage.get('yt_likes').some(x => x.id === vId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-container">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${YT.getEmbedUrl(vId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                </div>
                <div style="padding:15px 0;">
                    <h2 style="font-size:18px;">${video.snippet.title}</h2>
                    <div class="action-bar">
                        <button class="icon-btn" id="like-btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '🤍'} いいね</button>
                        <button class="icon-btn" onclick="Actions.openPlaylistModal()">➕ 保存</button>
                    </div>
                    <p><strong>${video.snippet.channelTitle}</strong></p>
                </div>
                <hr style="border:0; border-top:1px solid var(--border-color);">
                <h3>関連動画</h3>
                <div id="related-grid" class="grid"></div>
            </div>
        `;
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
        this.loadRelated(video.snippet.title);
    },

    async loadRelated(q) {
        const data = await YT.fetchAPI('search', { q: q.substring(0, 15), part: 'snippet', type: 'video', maxResults: 12 });
        this.relatedList = data.items || [];
        document.getElementById('related-grid').innerHTML = this.relatedList.map((v, i) => `
            <div class="v-card" onclick="Actions.playFromRelated(${i})">
                <div class="thumb-container"><img src="${v.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${v.snippet.title}</h3><p>${v.snippet.channelTitle}</p></div>
            </div>`).join('');
    },

    // --- プレイリスト・いいね機能 ---
    openPlaylistModal() {
        document.getElementById('modal-overlay').style.display = 'flex';
        const p = Storage.get('yt_playlists');
        document.getElementById('playlist-selector').innerHTML = p.map(l => `
            <div class="p-item" onclick="Actions.addCurrentToList('${l.name}')">${l.name}</div>
        `).join('') || '<p style="padding:10px;">リストがありません</p>';
    },
    closeModal() { document.getElementById('modal-overlay').style.display = 'none'; },
    
    createNewPlaylist() {
        const name = document.getElementById('new-playlist-name').value.trim();
        if (name) {
            Storage.createPlaylist(name);
            document.getElementById('new-playlist-name').value = '';
            this.openPlaylistModal(); // リストを再描画
        }
    },
    addCurrentToList(pName) {
        const v = this.currentPlayVideo;
        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        Storage.addToPlaylist(pName, { id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        this.closeModal();
        alert('追加しました');
    },

    showPlaylists() {
        const p = Storage.get('yt_playlists');
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;"><h2>プレイリスト</h2><div class="grid" id="p-list-grid"></div></div>`;
        document.getElementById('p-list-grid').innerHTML = p.map(l => `
            <div class="v-card" style="padding:20px; text-align:center;">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.deleteList('${l.name}')">削除</span>
                <div onclick="Actions.viewList('${l.name}')">
                    <div style="font-size:40px;">📁</div>
                    <h3>${l.name}</h3>
                    <p>${l.videos.length}本</p>
                </div>
            </div>`).join('');
    },
    deleteList(name) { if(confirm('削除しますか？')) { let p = Storage.get('yt_playlists').filter(x=>x.name!==name); Storage.set('yt_playlists', p); this.showPlaylists(); } },
    viewList(name) {
        const l = Storage.get('yt_playlists').find(x=>x.name===name);
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>${name}</h2><div class="grid" id="p-v-grid"></div></div>`;
        document.getElementById('p-v-grid').innerHTML = l.videos.map((v, i) => `
            <div class="v-card" onclick="Actions.playFromObj('${name}', ${i})">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.removeVideoFromList('${name}', '${v.id}')">✖</span>
                <div class="thumb-container"><img src="${v.thumb}" class="main-thumb"></div>
                <div class="v-text"><h3>${v.title}</h3><p>${v.channelTitle}</p></div>
            </div>`).join('');
    },
    removeVideoFromList(pName, vId) { Storage.removeFromPlaylist(pName, vId); this.viewList(pName); },
    
    handleLike() {
        const v = this.currentPlayVideo;
        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        Storage.toggleLike({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        const isLiked = Storage.get('yt_likes').some(x => x.id === vId);
        document.getElementById('like-btn').innerText = (isLiked ? '❤️' : '🤍') + ' いいね';
    },
    showLikes() {
        const l = Storage.get('yt_likes');
        this.currentList = l.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid();
    },
    showHistory() {
        const h = Storage.get('yt_history');
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid();
    },
    showSubs() {
        document.getElementById('view-container').innerHTML = '<div style="padding:20px;"><h2>登録中のチャンネル（未実装）</h2></div>';
    },

    playFromList(i) { this.play(this.currentList[i]); },
    playFromRelated(i) { this.play(this.relatedList[i]); },
    playFromObj(pName, i) {
        const v = Storage.get('yt_playlists').find(x=>x.name===pName).videos[i];
        this.play({ id: v.id, snippet: { title: v.title, thumbnails: { high: { url: v.thumb } }, channelTitle: v.channelTitle } });
    }
};

window.onload = () => Actions.init();
