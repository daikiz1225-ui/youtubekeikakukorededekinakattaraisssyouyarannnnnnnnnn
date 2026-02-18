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
    getPlaylists() { return JSON.parse(localStorage.getItem('yt_playlists')) || {}; },
    createPlaylist(name) {
        let p = this.getPlaylists();
        if (!p[name]) p[name] = [];
        localStorage.setItem('yt_playlists', JSON.stringify(p));
    },
    addToPlaylist(name, v) {
        let p = this.getPlaylists();
        if (!p[name].find(x => x.id === v.id)) p[name].unshift(v);
        localStorage.setItem('yt_playlists', JSON.stringify(p));
    }
};

const Theme = {
    init() {
        const t = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        if(document.getElementById('theme-toggle')) document.getElementById('theme-toggle').innerText = t === 'dark' ? '🌙' : '☀️';
    },
    toggle() {
        const curr = document.documentElement.getAttribute('data-theme');
        const next = curr === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        document.getElementById('theme-toggle').innerText = next === 'dark' ? '🌙' : '☀️';
    }
};

const Actions = {
    currentList: [],
    relatedList: [],
    nextToken: "",
    isShortsMode: false,
    currentVideo: null,
    searchQuery: "",

    init() {
        Theme.init();
        this.renderSidebar();
        this.goHome();
    },

    renderSidebar() {
        const playlists = Storage.getPlaylists();
        const playlistHTML = Object.keys(playlists).map(name => `
            <div class="nav-item" onclick="Actions.showPlaylist('${name}')">📁 <span>${name}</span></div>
        `).join('');

        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome(true)">🏠 <span>ホーム</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div>
            <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div>
            <div class="sidebar-section" style="border-top:1px solid var(--border); margin-top:10px; padding-top:10px;">
                <div style="font-size:12px; color:var(--text-sub); padding:0 15px 5px;">ライブラリ</div>
                <div class="nav-item" onclick="Actions.showLiked()">👍 <span>高評価</span></div>
                ${playlistHTML}
                <div class="nav-item" onclick="Actions.promptNewPlaylist()" style="color: var(--accent);">➕ <span>新しいリスト</span></div>
            </div>
        `;
    },

    async goHome(clear = false) {
        if(clear) { document.getElementById('search-input').value = ""; this.searchQuery = ""; }
        this.isShortsMode = false;
        // ホームではショート動画を除外
        const data = await YT.fetchAPI('search', { q: '-#Shorts', part: 'snippet', type: 'video', maxResults: 24 });
        this.processData(data, false);
    },

    async search(q = document.getElementById('search-input').value, isMore = false) {
        if (!q) return;
        this.searchQuery = q;
        const query = this.isShortsMode ? q + " #Shorts" : q + " -#Shorts";
        const data = await YT.fetchAPI('search', { q: query, part: 'snippet', type: 'video', maxResults: 30, pageToken: isMore ? this.nextToken : "" });
        
        if (this.isShortsMode) {
            this.relatedList = isMore ? [...this.relatedList, ...data.items] : data.items;
            this.nextToken = data.nextPageToken || "";
            document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>⚡ ショート検索: ${q}</h1><div id="shorts-grid" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div></div>`;
            this.renderShortsGrid(this.relatedList, 'shorts-grid');
        } else {
            this.processData(data, isMore);
        }
    },

    async processData(data, isMore) {
        this.nextToken = data.nextPageToken || "";
        if (isMore) this.currentList.push(...data.items); else { this.currentList = data.items; this.showView(); }
        this.renderGrid(this.currentList, 'view-container');
        document.getElementById('load-more').style.display = this.nextToken ? 'inline-block' : 'none';
    },

    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        const html = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playFromList(${i}, '${targetId}')">
                <div class="thumb-container">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                </div>
                <div class="v-text">
                    <h3>${item.snippet.title}</h3>
                    <p>${item.snippet.channelTitle}</p>
                </div>
            </div>`).join('');
        container.innerHTML = targetId === 'view-container' ? `<div class="grid">${html}</div>` : html;
    },

    async play(video) {
        this.isShortsMode = false;
        this.currentVideo = video;
        const vId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        this.showView();
        
        const isLiked = Storage.getLiked().some(x => x.id === vId);
        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="padding:20px;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>
                </div>
                <div style="padding:15px 0; display:flex; justify-content:space-between; align-items:flex-start;">
                    <h2 style="font-size:18px; margin:0; flex:1;">${video.snippet.title}</h2>
                    <div style="display:flex; gap:10px;">
                        <button class="btn" id="like-btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '👍'}</button>
                        <button class="btn" onclick="Actions.showPlaylistSelector()">➕</button>
                    </div>
                </div>
                <hr style="border:0; border-top:1px solid var(--border); margin:20px 0;">
                <h3 style="padding:0 20px;">関連動画</h3>
                <div id="related-grid" class="grid"></div>
            </div>`;

        const relData = await YT.fetchAPI('search', { q: video.snippet.title, part: 'snippet', type: 'video', maxResults: 12 });
        this.relatedList = relData.items;
        this.renderGrid(this.relatedList, 'related-grid');
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
    },

    async showShortsFeed() {
        this.isShortsMode = true; this.showView();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>⚡ ショート</h1><div id="shorts-grid" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div></div>`;
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 30 });
        this.relatedList = data.items;
        this.renderShortsGrid(this.relatedList, 'shorts-grid');
    },

    renderShortsGrid(items, targetId) {
        document.getElementById(targetId).innerHTML = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playShort(${i})">
                <div class="thumb-container" style="aspect-ratio: 9/16;"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3></div>
            </div>`).join('');
    },

    async playShort(index) {
        if (index < 0 || index >= this.relatedList.length) return;
        const video = this.relatedList[index];
        this.currentVideo = video;
        const vId = video.id.videoId;
        const isLiked = Storage.getLiked().some(x => x.id === vId);

        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container">
                <div class="shorts-wrapper">
                    <div class="shorts-left-controls">
                        <button class="short-action-btn" id="short-like-btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '👍'}</button>
                        <button class="short-action-btn" onclick="Actions.showPlaylistSelector()">➕</button>
                    </div>
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1&loop=1&playlist=${vId}" style="width:100%; height:100%; border:none;"></iframe>
                    <div class="shorts-info">
                        <div style="font-weight:bold;">@${video.snippet.channelTitle}</div>
                        <div class="shorts-title">${video.snippet.title}</div>
                    </div>
                </div>
                <div style="position:absolute; right:20px; display:flex; flex-direction:column; gap:20px;">
                    <button class="btn" onclick="Actions.playShort(${index-1})" style="border-radius:50%; width:50px; height:50px;">▲</button>
                    <button class="btn" onclick="Actions.playShort(${index+1})" style="border-radius:50%; width:50px; height:50px;">▼</button>
                </div>
            </div>`;
    },

    handleLike() {
        const v = this.currentVideo;
        const vId = v.id.videoId || (typeof v.id === 'string' ? v.id : v.id.resourceId?.videoId);
        const added = Storage.toggleLike({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        const icon = added ? '❤️' : '👍';
        if(document.getElementById('like-btn')) document.getElementById('like-btn').innerText = icon;
        if(document.getElementById('short-like-btn')) document.getElementById('short-like-btn').innerText = icon;
    },

    showPlaylistSelector() {
        const playlists = Storage.getPlaylists();
        const html = Object.keys(playlists).map(name => `<div class="nav-item" onclick="Actions.confirmAddToPlaylist('${name}')" style="background:var(--hover); margin-bottom:5px;">📁 ${name}</div>`).join('');
        const modal = document.createElement('div');
        modal.id = "pl-modal";
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; display:flex; justify-content:center; align-items:center;";
        modal.onclick = (e) => { if(e.target.id === 'pl-modal') modal.remove(); };
        modal.innerHTML = `<div style="background:var(--bg-side); padding:20px; border-radius:12px; width:300px; color:white;"><h3>保存先</h3>${html || 'リストなし'}</div>`;
        document.body.appendChild(modal);
    },

    confirmAddToPlaylist(name) {
        const v = this.currentVideo;
        const vId = v.id.videoId || (typeof v.id === 'string' ? v.id : v.id.resourceId?.videoId);
        Storage.addToPlaylist(name, { id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        if(document.getElementById('pl-modal')) document.getElementById('pl-modal').remove();
        alert("追加しました");
    },

    showLiked() {
        this.isShortsMode = false; this.showView();
        const items = Storage.getLiked();
        this.currentList = items.map(x => ({ id: { videoId: x.id }, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>👍 高評価</h1><div id="liked-grid" class="grid"></div></div>`;
        this.renderGrid(this.currentList, 'liked-grid');
    },

    showHistory() {
        this.isShortsMode = false; this.showView();
        const h = Storage.getHistory();
        this.currentList = h.map(x => ({ id: { videoId: x.id }, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>🕒 履歴</h1><div id="hist-grid" class="grid"></div></div>`;
        this.renderGrid(this.currentList, 'hist-grid');
    },

    showPlaylist(name) {
        this.isShortsMode = false; this.showView();
        const items = Storage.getPlaylists()[name] || [];
        this.currentList = items.map(x => ({ id: { videoId: x.id }, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>📁 ${name}</h1><div id="pl-grid" class="grid"></div></div>`;
        this.renderGrid(this.currentList, 'pl-grid');
    },

    promptNewPlaylist() {
        const n = prompt("名前を入力:");
        if(n) { Storage.createPlaylist(n); this.renderSidebar(); }
    },

    playFromList(index, targetId) {
        const list = (targetId === 'related-grid' || targetId === 'shorts-grid') ? this.relatedList : this.currentList;
        this.play(list[index]);
    },

    loadMore() { this.search(this.searchQuery, true); },
    showView() { document.getElementById('main-content').scrollTop = 0; }
};

window.onload = () => Actions.init();
