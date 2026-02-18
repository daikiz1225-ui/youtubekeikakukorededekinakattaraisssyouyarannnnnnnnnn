const YT = {
    async getEducationKey() {
        try {
            const response = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await response.json();
            this.EDU_KEY = data.key; 
        } catch (e) {
            console.error("Education Key fetch failed");
        }
    },
    KEY: '', 
    EDU_KEY: '', 
    async fetchAPI(endpoint, params) {
        const apiKey = this.KEY || this.EDU_KEY;
        const query = new URLSearchParams({ ...params, key: apiKey }).toString();
        const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`);
        return await res.json();
    },
    getEmbedUrl(id) {
        if (!this.EDU_KEY) return `https://www.youtubeeducation.com/embed/${id}`;
        return `https://www.youtubeeducation.com/embed/${id}?set_edufilter=${this.EDU_KEY}`; 
    }
};

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
        document.getElementById('search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.search(document.getElementById('search-input').value, false); }
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
            if (!isMore) document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>⚡ ショート</h1><div id="shorts-grid" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div></div>`;
            this.renderShortsGrid(this.relatedList, 'shorts-grid');
        } else {
            this.currentList = isMore ? [...this.currentList, ...data.items] : data.items;
            this.renderGrid(this.currentList, 'view-container');
        }
        document.getElementById('load-more').style.display = this.nextToken ? 'block' : 'none';
    },

    async processData(data, isMore) {
        this.nextToken = data.nextPageToken || "";
        const chIds = [...new Set(data.items.map(i => i.snippet.channelId))].join(',');
        await this.fetchChannelIcons(chIds);
        this.currentList = isMore ? [...this.currentList, ...data.items] : data.items;
        this.renderGrid(this.currentList, 'view-container');
        document.getElementById('load-more').style.display = this.nextToken ? 'block' : 'none';
    },

    async fetchChannelIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if(data.items) data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
    },

    renderGrid(items, targetId) {
        const html = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playFromList(${i}, '${targetId}')">
                <div class="thumb-container"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="video-meta-row">
                    <img src="${this.channelIcons[item.snippet.channelId] || ''}" class="channel-icon-mini" onclick="event.stopPropagation(); Actions.openChannel('${item.snippet.channelId}')">
                    <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
                </div>
            </div>`).join('');
        document.getElementById(targetId).innerHTML = (targetId === 'view-container') ? `<div class="grid">${html}</div>` : html;
    },

    async play(video) {
        this.isShortsMode = false; this.currentVideo = video;
        const vId = video.id.videoId || video.id; const chId = video.snippet.channelId;
        const isLiked = Storage.getLiked().some(x => x.id === vId);
        const isSubbed = Storage.getSubs().some(x => x.id === chId);
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${YT.getEmbedUrl(vId)}&autoplay=1" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>
                </div>
                <div style="padding:15px 0;">
                    <div style="display:flex; justify-content:space-between;">
                        <h2>${video.snippet.title}</h2>
                        <div style="display:flex; gap:10px;"><button class="btn" onclick="Actions.handleLike()">${isLiked?'❤️':'👍'}</button><button class="btn" onclick="Actions.showPlaylistSelector()">➕</button></div>
                    </div>
                    <div style="display:flex; align-items:center; gap:15px; margin-top:10px;">
                        <img src="${this.channelIcons[chId]||''}" class="channel-icon-mini" onclick="Actions.openChannel('${chId}')">
                        <span style="font-weight:bold;">${video.snippet.channelTitle}</span>
                        <button class="btn" style="background:${isSubbed?'#444':'#fff'}; color:${isSubbed?'#fff':'#000'}" onclick="Actions.handleSub('${chId}','${video.snippet.channelTitle}')">${isSubbed?'登録済み':'登録'}</button>
                    </div>
                </div>
                <div id="related-grid" class="grid"></div>
            </div>`;
        const relData = await YT.fetchAPI('search', { q: video.snippet.title, part: 'snippet', type: 'video', maxResults: 12 });
        this.relatedList = relData.items; this.renderGrid(this.relatedList, 'related-grid');
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
    },

    async playShort(index) {
        if (index < 0 || index >= this.relatedList.length) return;
        const video = this.relatedList[index]; this.currentVideo = video;
        const vId = video.id.videoId; const chId = video.snippet.channelId;
        const isLiked = Storage.getLiked().some(x => x.id === vId);
        const isSubbed = Storage.getSubs().some(x => x.id === chId);
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container">
                <div class="shorts-wrapper">
                    <iframe src="${YT.getEmbedUrl(vId)}&autoplay=1&loop=1&playlist=${vId}" style="width:100%;height:100%;border:none;"></iframe>
                    <div class="shorts-info-overlay">
                        <div class="shorts-channel-row" onclick="Actions.openChannel('${chId}')">
                            <img src="${this.channelIcons[chId]||''}" style="width:36px;height:36px;border-radius:50%;border:1px solid white;">
                            <span style="color:white;font-weight:bold;">@${video.snippet.channelTitle}</span>
                        </div>
                        <div style="color:white;font-weight:bold;">${video.snippet.title}</div>
                    </div>
                </div>
                <div class="shorts-right-controls">
                    <button class="short-action-btn" onclick="Actions.playShort(${index-1})">▲</button>
                    <button class="short-action-btn" onclick="Actions.playShort(${index+1})">▼</button>
                    <button class="short-action-btn" onclick="Actions.handleLike()">${isLiked?'❤️':'👍'}</button>
                    <button class="short-action-btn" onclick="Actions.showPlaylistSelector()">➕</button>
                    <button class="short-action-btn" style="background:${isSubbed?'#444':'#f00'};font-size:11px;" onclick="Actions.handleSub('${chId}','${video.snippet.channelTitle}')">${isSubbed?'済':'登録'}</button>
                </div>
            </div>`;
    },

    showView() { document.getElementById('main-content').scrollTop = 0; },
    playFromList(i, tId) { this.play((tId==='related-grid'||tId==='shorts-grid'||tId==='ch-content'||tId==='subs-grid') ? this.relatedList[i] : this.currentList[i]); },
    // （他、openChannel, showSubsPage, showHistory, showPlaylist, handleLike/Sub などの機能は全て維持）
    async openChannel(chId, tab = 'latest') {
        this.isShortsMode = false; this.showView();
        const chData = await YT.fetchAPI('channels', { id: chId, part: 'snippet,statistics,brandingSettings' });
        const channel = chData.items[0];
        document.getElementById('view-container').innerHTML = `<div class="channel-page"><div class="banner" style="height:150px; background:url(${channel.brandingSettings?.image?.bannerExternalUrl || ''}) center/cover #333;"></div><div style="padding:20px; display:flex; align-items:center; gap:20px;"><img src="${channel.snippet.thumbnails.high.url}" style="width:80px;height:80px;border-radius:50%;"><div><h1>${channel.snippet.title}</h1><p>${parseInt(channel.statistics.subscriberCount).toLocaleString()} 登録者</p></div></div><div class="ch-tabs"><div class="tab ${tab==='latest'?'active':''}" onclick="Actions.openChannel('${chId}','latest')">最新順</div><div class="tab ${tab==='popular'?'active':''}" onclick="Actions.openChannel('${chId}','popular')">人気順</div></div><div id="ch-content" class="grid"></div></div>`;
        const order = tab === 'popular' ? 'viewCount' : 'date';
        const data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 20 });
        this.relatedList = data.items; this.renderGrid(this.relatedList, 'ch-content');
    },
    showHistory() {
        const h = Storage.getHistory();
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>🕒 履歴</h1><div id="hist-grid" class="grid"></div></div>`;
        this.renderGrid(this.currentList, 'hist-grid');
    },
    handleLike() {
        const v = this.currentVideo; const vId = v.id.videoId || v.id;
        Storage.toggleLike({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        this.isShortsMode ? this.playShort(this.relatedList.findIndex(x => (x.id.videoId||x.id) === vId)) : this.play(v);
    },
    handleSub(id, name) { Storage.toggleSub({ id, name }); this.renderSidebar(); if(this.isShortsMode) this.playShort(this.relatedList.findIndex(x => x.snippet.channelId === id)); else this.play(this.currentVideo); },
    showPlaylistSelector() {
        const p = Storage.getPlaylists();
        const html = Object.keys(p).map(n => `<div class="nav-item" onclick="Actions.confirmAdd('${n}')">📁 ${n}</div>`).join('');
        const m = document.createElement('div'); m.id = "pl-modal"; m.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;justify-content:center;align-items:center;";
        m.onclick = (e) => { if(e.target.id==='pl-modal') m.remove(); };
        m.innerHTML = `<div style="background:var(--bg-side);padding:20px;border-radius:12px;width:280px;"><h3>保存先</h3>${html || 'なし'}</div>`;
        document.body.appendChild(m);
    },
    confirmAdd(n) {
        const v = this.currentVideo; const vId = v.id.videoId || v.id;
        let p = Storage.getPlaylists(); if(!p[n].find(x => x.id === vId)) p[n].unshift({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        localStorage.setItem('yt_playlists', JSON.stringify(p)); document.getElementById('pl-modal').remove();
    }
};
window.onload = () => Actions.init();
