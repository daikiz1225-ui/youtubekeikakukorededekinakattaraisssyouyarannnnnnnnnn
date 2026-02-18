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
    }
};

const Actions = {
    currentList: [],
    relatedList: [],
    nextToken: "",
    isShortsMode: false,
    isPlayingMode: false,
    searchQuery: "",
    channelIcons: {},

    init() {
        document.body.setAttribute('data-theme', localStorage.getItem('yt_theme') || 'light');
        this.renderSidebar();
        this.goHome();
        
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.isShortsMode = false;
                this.isPlayingMode = false;
                this.search(e.target.value, false);
            }
        });
    },

    toggleTheme() {
        const next = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('yt_theme', next);
    },

    async goHome(clear = false) {
        if(clear) { document.getElementById('search-input').value = ""; this.searchQuery = ""; }
        this.isShortsMode = false; this.isPlayingMode = false;
        this.showView();
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items;
        this.nextToken = data.nextPageToken || "";
        await this.fetchIconsForList(this.currentList);
        this.renderGrid(this.currentList, 'view-container');
        this.updateButton();
    },

    async search(q, isMore = false) {
        if (!q && !isMore) return;
        if (!isMore) { this.searchQuery = q; this.nextToken = ""; this.showView(); }

        const params = {
            q: this.isShortsMode ? `#Shorts ${this.searchQuery}` : this.searchQuery,
            part: 'snippet', type: 'video', maxResults: 24, pageToken: this.nextToken
        };
        if (this.isShortsMode) params.videoDuration = 'short';

        const data = await YT.fetchAPI('search', params);
        this.nextToken = data.nextPageToken || "";
        await this.fetchIconsForList(data.items);

        if (this.isShortsMode) {
            if (isMore) this.relatedList.push(...data.items); else this.relatedList = data.items;
            this.renderShortsGrid(this.relatedList);
        } else {
            if (isMore) this.currentList.push(...data.items); else this.currentList = data.items;
            this.renderGrid(this.currentList, 'view-container');
        }
        this.updateButton();
    },

    async loadMore() {
        if (this.isPlayingMode) {
            const data = await YT.fetchAPI('search', { q: this.searchQuery, part: 'snippet', type: 'video', maxResults: 12, pageToken: this.nextToken });
            this.nextToken = data.nextPageToken || "";
            this.relatedList.push(...data.items);
            await this.fetchIconsForList(data.items);
            this.renderGrid(this.relatedList, 'related-grid');
            this.updateButton();
        } else {
            this.search(this.searchQuery, true);
        }
    },

    updateButton() {
        const btn = document.getElementById('load-more');
        const isShortsPlaying = !!document.querySelector('.shorts-container');
        btn.style.display = (this.nextToken && !isShortsPlaying) ? 'block' : 'none';
    },

    async fetchIconsForList(items) {
        const ids = [...new Set(items.map(i => i.snippet.channelId))].join(',');
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        data.items.forEach(ch => this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url);
    },

    renderGrid(items, targetId) {
        const html = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playFromList(${i}, '${targetId}')">
                <div class="thumb-container"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="video-meta-row">
                    <img src="${this.channelIcons[item.snippet.channelId] || ''}" class="channel-icon-mini">
                    <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
                </div>
            </div>`).join('');
        const container = document.getElementById(targetId);
        if (targetId === 'view-container') container.innerHTML = `<div class="grid">${html}</div>`;
        else container.innerHTML = html;
    },

    async play(video) {
        this.isPlayingMode = true; this.currentVideo = video;
        const vId = video.id.videoId || video.id;
        this.searchQuery = video.snippet.title; // 関連動画読み込み用
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>
                </div>
                <h2>${video.snippet.title}</h2>
                <div id="related-grid" class="grid"></div>
            </div>`;
        
        const rel = await YT.fetchAPI('search', { q: this.searchQuery, part: 'snippet', type: 'video', maxResults: 12 });
        this.nextToken = rel.nextPageToken || "";
        this.relatedList = rel.items;
        await this.fetchIconsForList(this.relatedList);
        this.renderGrid(this.relatedList, 'related-grid');
        this.updateButton();
    },

    async showShortsFeed() {
        this.isShortsMode = true; this.isPlayingMode = false; this.searchQuery = "";
        await this.search("#Shorts", false);
    },

    renderShortsGrid(items) {
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;"><h1>⚡ ショート</h1>
            <div id="s-grid" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div></div>`;
        document.getElementById('s-grid').innerHTML = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playShort(${i})">
                <div class="thumb-container" style="aspect-ratio: 9/16;"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3></div>
            </div>`).join('');
    },

    playShort(idx) {
        const v = this.relatedList[idx];
        const vId = v.id.videoId;
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container">
                <div class="shorts-wrapper">
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1&loop=1&playlist=${vId}" style="width:100%;height:100%;border:none;"></iframe>
                </div>
                <div class="shorts-right-controls">
                    <button class="short-action-btn" onclick="Actions.playShort(${idx-1})">▲</button>
                    <button class="short-action-btn" onclick="Actions.playShort(${idx+1})">▼</button>
                </div>
            </div>`;
        this.updateButton();
    },

    playFromList(i, tId) {
        const list = (tId === 'related-grid') ? this.relatedList : this.currentList;
        this.play(list[i]);
    },

    showView() { document.getElementById('main-content').scrollTop = 0; },

    renderSidebar() {
        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome(true)">🏠 <span>急上昇</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div>`;
    }
};
window.onload = () => Actions.init();
