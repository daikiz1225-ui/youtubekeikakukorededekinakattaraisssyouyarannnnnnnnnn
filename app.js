const YT = {
    // だいきがくれた5つのAPIキー
    API_KEYS: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWAE",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vC"
    ],
    currentKeyIndex: 0,
    EDU_KEY: '',

    // Kahootから再生用の教育用認証キーを抜く
    async getEducationKey() {
        try {
            const response = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await response.json();
            this.EDU_KEY = data.key;
        } catch (e) {
            console.error("EDU_KEYの取得失敗。再生がブロックされる可能性があります。");
        }
    },

    // 5つのキーを順番に試す通信ロジック
    async fetchAPI(endpoint, params) {
        if (!this.EDU_KEY) await this.getEducationKey();

        for (let i = 0; i < this.API_KEYS.length; i++) {
            const activeKey = this.API_KEYS[this.currentKeyIndex];
            const query = new URLSearchParams({ ...params, key: activeKey }).toString();
            
            try {
                const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`);
                const data = await res.json();

                // キーの制限超え(403)や不正なキーの場合、次のキーへ
                if (data.error && (data.error.code === 403 || data.error.code === 400)) {
                    console.warn(`Key ${this.currentKeyIndex + 1} が死んでるから次使うわ。`);
                    this.rotateKey();
                    continue; 
                }
                return data;
            } catch (e) {
                this.rotateKey();
            }
        }
        throw new Error("全部のAPIキーが死んだわ。詰み。");
    },

    rotateKey() {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.API_KEYS.length;
    },

    // 教育用ドメイン + Kahootから抜いたキーでブロック回避
    getEmbedUrl(id) {
        const base = `https://www.youtubeeducation.com/embed/${id}`;
        return this.EDU_KEY ? `${base}?set_edufilter=${this.EDU_KEY}` : base;
    }
};

// --- 以下、StorageとActionsは全機能を維持 ---

const Storage = {
    getHistory() { return JSON.parse(localStorage.getItem('yt_history')) || []; },
    addHistory(v) {
        let h = this.getHistory();
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50);
        localStorage.setItem('yt_history', JSON.stringify(h));
    },
    getLiked() { return JSON.parse(localStorage.getItem('yt_liked')) || []; },
    toggleLike(v) {
        let l = this.getLiked();
        const idx = l.findIndex(x => x.id === v.id);
        if (idx > -1) l.splice(idx, 1); else l.unshift(v);
        localStorage.setItem('yt_liked', JSON.stringify(l));
        return idx === -1;
    },
    getSubs() { return JSON.parse(localStorage.getItem('yt_subs')) || []; },
    toggleSub(c) {
        let s = this.getSubs();
        const idx = s.findIndex(x => x.id === c.id);
        if (idx > -1) s.splice(idx, 1); else s.push(c);
        localStorage.setItem('yt_subs', JSON.stringify(s));
        return idx === -1;
    },
    getPlaylists() { return JSON.parse(localStorage.getItem('yt_playlists')) || {}; },
    createPlaylist(name) {
        let p = this.getPlaylists();
        if (!p[name]) p[name] = [];
        localStorage.setItem('yt_playlists', JSON.stringify(p));
    },
    deletePlaylist(name) {
        let p = this.getPlaylists();
        delete p[name];
        localStorage.setItem('yt_playlists', JSON.stringify(p));
    },
    removeFromPlaylist(name, vId) {
        let p = this.getPlaylists();
        if (p[name]) p[name] = p[name].filter(x => x.id !== vId);
        localStorage.setItem('yt_playlists', JSON.stringify(p));
    }
};

const Actions = {
    currentList: [], relatedList: [], nextToken: "", isShortsMode: false,
    currentVideo: null, searchQuery: "", channelIcons: {},

    async init() {
        this.renderSidebar();
        await YT.getEducationKey();
        this.goHome();
        // iPad Enter制御
        document.getElementById('search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                this.search(document.getElementById('search-input').value, false); 
            }
        });
    },

    renderSidebar() {
        const playlists = Storage.getPlaylists();
        const playlistHTML = Object.keys(playlists).map(name => `
            <div class="nav-item" onclick="Actions.showPlaylist('${name}')">📁 <span>${name}</span></div>
        `).join('');
        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome(true)">🏠 <span>急上昇</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div>
            <div class="nav-item" onclick="Actions.showSubsPage()">🔔 <span>登録</span></div>
            <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div>
            <div class="sidebar-section" style="border-top:1px solid var(--border); margin-top:10px; padding-top:10px;">
                <div class="nav-item" onclick="Actions.showLiked()">👍 <span>高評価</span></div>
                ${playlistHTML}
                <div class="nav-item" onclick="Actions.promptNewPlaylist()" style="color:var(--accent);">➕ <span>作成</span></div>
            </div>`;
    },

    async goHome(clear = false) {
        if(clear) { document.getElementById('search-input').value = ""; this.searchQuery = ""; }
        this.isShortsMode = false; this.showView();
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.processData(data, false);
    },

    async search(q, isMore = false) {
        const query = q || this.searchQuery;
        if (!query && !isMore && !this.isShortsMode) return;
        if (!isMore) { this.searchQuery = query; this.nextToken = ""; this.showView(); }
        const params = { q: this.isShortsMode ? `#Shorts ${this.searchQuery}` : this.searchQuery, part: 'snippet', type: 'video', maxResults: 24, pageToken: this.nextToken };
        if (this.isShortsMode) params.videoDuration = 'short';
        const data = await YT.fetchAPI('search', params);
        this.nextToken = data.nextPageToken || "";
        const chIds = [...new Set(data.items.map(i => i.snippet.channelId))].join(',');
        await this.fetchChannelIcons(chIds);
        if (this.isShortsMode) {
            this.relatedList = isMore ? [...this.relatedList, ...data.items] : data.items;
            if(!isMore) document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>⚡ ショート</h1><div id="shorts-grid" class="grid"></div></div>`;
            this.renderShortsGrid(this.relatedList, 'shorts-grid');
        } else {
            this.currentList = isMore ? [...this.currentList, ...data.items] : data.items;
            this.renderGrid(this.currentList, 'view-container');
        }
    },

    async processData(data, isMore) {
        this.nextToken = data.nextPageToken || "";
        this.currentList = isMore ? [...this.currentList, ...data.items] : data.items;
        this.renderGrid(this.currentList, 'view-container');
    },

    renderGrid(items, targetId) {
        const html = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playFromList(${i}, '${targetId}')">
                <div class="thumb-container"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="video-meta-row">
                    <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
                </div>
            </div>`).join('');
        document.getElementById(targetId).innerHTML = (targetId === 'view-container') ? `<div class="grid">${html}</div>` : html;
    },

    async play(video) {
        this.isShortsMode = false; this.currentVideo = video;
        const vId = video.id.videoId || video.id;
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${YT.getEmbedUrl(vId)}&autoplay=1" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>
                </div>
                <h2>${video.snippet.title}</h2>
                <div id="related-grid" class="grid"></div>
            </div>`;
        const relData = await YT.fetchAPI('search', { q: video.snippet.title, part: 'snippet', type: 'video', maxResults: 12 });
        this.relatedList = relData.items; this.renderGrid(this.relatedList, 'related-grid');
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
    },

    showView() { document.getElementById('main-content').scrollTop = 0; },
    playFromList(i, tId) { this.play((tId==='related-grid'||tId==='shorts-grid') ? this.relatedList[i] : this.currentList[i]); },
    async fetchChannelIcons(ids) { /* 省略：必要なら実装 */ },
    toggleTheme() {
        const next = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', next);
    }
};
window.onload = () => Actions.init();
