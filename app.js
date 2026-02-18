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
    currentList: [],
    relatedList: [],
    nextToken: "",
    isShortsMode: false,
    currentVideo: null,
    searchQuery: "",

    init() {
        this.renderSidebar();
        this.goHome();
        // iPad対応：Enterで検索させない（ボタンのみ）
        document.getElementById('search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
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
            <div class="nav-item" onclick="Actions.showSubsPage()">🔔 <span>登録チャンネル</span></div>
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
        this.isShortsMode = false; this.showView();
        // 日本の急上昇を取得
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.processData(data, false);
        document.getElementById('view-container').insertAdjacentHTML('afterbegin', '<h1 style="padding:20px 20px 0;">🔥 日本の急上昇</h1>');
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
        const items = data.items.map(item => {
            if (item.kind === 'youtube#video') return item;
            return item; 
        });
        if (isMore) this.currentList.push(...items); else { this.currentList = items; this.showView(); }
        this.renderGrid(this.currentList, 'view-container');
        document.getElementById('load-more').style.display = this.nextToken ? 'inline-block' : 'none';
    },

    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        const html = items.map((item, i) => {
            const vId = item.id.videoId || item.id;
            return `
            <div class="v-card" onclick="Actions.playFromList(${i}, '${targetId}')">
                <div class="thumb-container">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                </div>
                <div class="v-text">
                    <h3>${item.snippet.title}</h3>
                    <p>${item.snippet.channelTitle}</p>
                </div>
            </div>`;
        }).join('');
        if (targetId === 'view-container') container.innerHTML = `<div class="grid">${html}</div>`;
        else container.innerHTML = html;
    },

    async play(video) {
        this.isShortsMode = false;
        this.currentVideo = video;
        const vId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        const chId = video.snippet.channelId;
        this.showView();
        
        const isLiked = Storage.getLiked().some(x => x.id === vId);
        const isSubbed = Storage.getSubs().some(x => x.id === chId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="padding:20px;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>
                </div>
                <div style="padding:15px 0;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h2 style="font-size:18px; margin:0; flex:1;">${video.snippet.title}</h2>
                        <div style="display:flex; gap:10px;">
                            <button class="btn" id="like-btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '👍'}</button>
                            <button class="btn" onclick="Actions.showPlaylistSelector()">➕</button>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:15px; margin-top:15px;">
                        <p style="font-weight:bold; margin:0;">${video.snippet.channelTitle}</p>
                        <button class="btn" style="background:${isSubbed?'#444':'#fff'}; color:${isSubbed?'#fff':'#000'}" onclick="Actions.handleSub('${chId}', '${video.snippet.channelTitle}')">
                            ${isSubbed ? '登録済み' : 'チャンネル登録'}
                        </button>
                    </div>
                </div>
                <hr style="border:0; border-top:1px solid var(--border); margin:20px 0;">
                <h3 style="padding-left:10px;">関連動画</h3>
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
        const chId = video.snippet.channelId;
        const isLiked = Storage.getLiked().some(x => x.id === vId);
        const isSubbed = Storage.getSubs().some(x => x.id === chId);

        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container">
                <div class="shorts-wrapper">
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1&loop=1&playlist=${vId}" style="width:100%; height:100%; border:none;"></iframe>
                    <div class="shorts-info">
                        <div style="font-weight:bold;">@${video.snippet.channelTitle}</div>
                        <div class="shorts-title">${video.snippet.title}</div>
                    </div>
                </div>
                <div class="shorts-right-controls">
                    <button class="short-action-btn" onclick="Actions.playShort(${index-1})">▲</button>
                    <button class="short-action-btn" onclick="Actions.playShort(${index+1})">▼</button>
                    <button class="short-action-btn" id="short-like-btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '👍'}</button>
                    <button class="short-action-btn" onclick="Actions.showPlaylistSelector()">➕</button>
                    <button class="short-action-btn" style="font-size:11px; background:${isSubbed?'#444':'#f00'}" onclick="Actions.handleSub('${chId}', '${video.snippet.channelTitle}')">
                        ${isSubbed ? '済' : '登録'}
                    </button>
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

    handleSub(id, name) {
        Storage.toggleSub({ id, name });
        this.renderSidebar();
        if (this.isShortsMode) this.playShort(this.relatedList.findIndex(x => (x.id.videoId || x.id) === (this.currentVideo.id.videoId || this.currentVideo.id)));
        else this.play(this.currentVideo);
    },

    showSubsPage() {
        this.isShortsMode = false; this.showView();
        const subs = Storage.getSubs();
        let html = `<div style="padding:20px;"><h1>🔔 登録チャンネル</h1><div style="display:flex; overflow-x:auto; padding-bottom:10px;">`;
        if (subs.length === 0) html += `<p>登録なし</p>`;
        else html += subs.map(ch => `<div class="ch-item" onclick="Actions.openChannelSearch('${ch.id}')"><div style="width:55px;height:55px;border-radius:50%;background:#444;display:flex;align-items:center;justify-content:center;margin-bottom:5px;">👤</div><span style="font-size:10px;text-align:center;">${ch.name}</span></div>`).join('');
        html += `</div><hr style="border:0; border-top:1px solid var(--border); margin:20px 0;"><h2>3日以内の新着</h2><div id="subs-grid" class="grid"></div></div>`;
        document.getElementById('view-container').innerHTML = html;

        if (subs.length > 0) {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const q = subs.map(s => `channelId:${s.id}`).join('|');
            YT.fetchAPI('search', { part: 'snippet', type: 'video', publishedAfter: threeDaysAgo.toISOString(), maxResults: 20 }).then(data => {
                this.currentList = data.items;
                this.renderGrid(this.currentList, 'subs-grid');
            });
        }
    },

    showPlaylist(name) {
        this.isShortsMode = false; this.showView();
        const items = Storage.getPlaylists()[name] || [];
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px; display:flex; justify-content:space-between; align-items:center;">
                <h1>📁 ${name}</h1>
                <button class="btn" style="background:#ff4d4d;" onclick="Actions.removeList('${name}')">削除</button>
            </div>
            <div id="pl-grid" class="grid"></div>`;
        this.renderGridWithDelete(items, 'pl-grid', name);
    },

    showLiked() {
        this.isShortsMode = false; this.showView();
        const items = Storage.getLiked();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>👍 高評価</h1><div id="liked-grid" class="grid"></div></div>`;
        this.renderGridWithDelete(items, 'liked-grid', 'LIKED_SPEC');
    },

    renderGridWithDelete(items, targetId, listName) {
        document.getElementById(targetId).innerHTML = items.map((item, i) => `
            <div class="v-card">
                <div onclick="Actions.playFromStorage('${item.id}')">
                    <div class="thumb-container"><img src="${item.thumb}" class="main-thumb"></div>
                    <div class="v-text"><h3>${item.title}</h3><p>${item.channelTitle}</p></div>
                </div>
                <button class="delete-btn" onclick="Actions.removeItem('${listName}', '${item.id}')">リストから抜く</button>
            </div>`).join('');
    },

    async playFromStorage(id) {
        const data = await YT.fetchAPI('videos', { id, part: 'snippet' });
        if(data.items[0]) this.play(data.items[0]);
    },

    removeItem(listName, vId) {
        if (listName === 'LIKED_SPEC') Storage.toggleLike({ id: vId });
        else Storage.removeFromPlaylist(listName, vId);
        listName === 'LIKED_SPEC' ? this.showLiked() : this.showPlaylist(listName);
    },

    removeList(name) { if(confirm("消す？")) { Storage.deletePlaylist(name); this.renderSidebar(); this.goHome(); } },
    playFromList(i, tId) { this.play((tId==='related-grid'||tId==='shorts-grid') ? this.relatedList[i] : this.currentList[i]); },
    showView() { document.getElementById('main-content').scrollTop = 0; },
    loadMore() { this.search(this.searchQuery, true); },
    promptNewPlaylist() { const n = prompt("名:"); if(n) { Storage.createPlaylist(n); this.renderSidebar(); } },
    showHistory() {
        const h = Storage.getHistory();
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>🕒 履歴</h1><div id="hist-grid" class="grid"></div></div>`;
        this.renderGrid(this.currentList, 'hist-grid');
    },
    showPlaylistSelector() {
        const p = Storage.getPlaylists();
        const html = Object.keys(p).map(n => `<div class="nav-item" onclick="Actions.confirmAdd('${n}')">📁 ${n}</div>`).join('');
        const m = document.createElement('div');
        m.id = "pl-modal"; m.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;justify-content:center;align-items:center;";
        m.onclick = (e) => { if(e.target.id==='pl-modal') m.remove(); };
        m.innerHTML = `<div style="background:var(--bg-side);padding:20px;border-radius:12px;width:280px;"><h3>保存先</h3>${html || 'なし'}</div>`;
        document.body.appendChild(m);
    },
    confirmAdd(n) {
        const v = this.currentVideo;
        const vId = v.id.videoId || (typeof v.id === 'string' ? v.id : v.id.resourceId?.videoId);
        let p = Storage.getPlaylists();
        if(!p[n].find(x => x.id === vId)) p[n].unshift({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        localStorage.setItem('yt_playlists', JSON.stringify(p));
        document.getElementById('pl-modal').remove();
    }
};

window.onload = () => Actions.init();
