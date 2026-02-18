const Storage = {
    get(key, def = []) { return JSON.parse(localStorage.getItem(key)) || def; },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    getPlaylists() { return this.get('yt_playlists', {}); },
    savePlaylists(p) { this.set('yt_playlists', p); }
};

const Actions = {
    currentList: [],
    currentIndex: -1,
    nextToken: "",
    channelIcons: {},

    init() {
        this.renderSidebar();
        this.goHome();
    },

    renderSidebar() {
        const playlists = Storage.getPlaylists();
        const playlistHTML = Object.keys(playlists).map(name => `
            <div class="nav-item" onclick="Actions.showPlaylist('${name}')">📁 <span>${name}</span></div>
        `).join('');

        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome()">🏠 <span>ホーム</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div>
            <div class="sidebar-section" style="border-top:1px solid #222; margin-top:10px; padding-top:10px;">
                <div style="font-size:12px; color:#aaa; padding:0 15px 5px;">ライブラリ</div>
                <div class="nav-item" onclick="Actions.showLiked()">👍 <span>高評価</span></div>
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
        
        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="padding:20px; max-width:1200px; margin:0 auto;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${YT.getEmbedUrl(videoId)}?autoplay=1" style="width:100%; height:100%; border:none;" allow="autoplay"></iframe>
                </div>
                <div style="padding:15px 0;">
                    <h2 style="font-size:20px; margin:0;">${video.snippet.title}</h2>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:15px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                        <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                        <b>${video.snippet.channelTitle}</b>
                    </div>
                    <div style="margin-top:15px; display:flex; gap:10px;">
                        <button class="btn" onclick="Actions.handleLike()">👍 高評価</button>
                        <button class="btn" onclick="Actions.showPlaylistSelector('${videoId}')">➕ 保存</button>
                    </div>
                </div>
            </div>`;
        this.addHistory(video);
    },

    async openChannel(channelId, channelName, order = 'date', type = 'video') {
        this.showView();
        await this.fetchIcons(channelId);
        
        document.getElementById('view-container').innerHTML = `
            <div class="ch-header">
                <img src="${this.channelIcons[channelId]}" style="width:80px; height:80px; border-radius:50%;">
                <h1>${channelName}</h1>
            </div>
            <div class="tabs">
                <div class="tab ${type==='video' && order==='date' ? 'active' : ''}" onclick="Actions.openChannel('${channelId}','${channelName}','date','video')">新規順</div>
                <div class="tab ${type==='video' && order==='viewCount' ? 'active' : ''}" onclick="Actions.openChannel('${channelId}','${channelName}','viewCount','video')">人気順</div>
                <div class="tab ${type==='shorts' ? 'active' : ''}" onclick="Actions.openChannel('${channelId}','${channelName}','','shorts')">ショート</div>
                <div class="tab ${type==='playlists' ? 'active' : ''}" onclick="Actions.openChannel('${channelId}','${channelName}','','playlists')">再生リスト</div>
            </div>
            <div id="ch-grid" class="grid"></div>`;

        const grid = document.getElementById('ch-grid');
        if (type === 'playlists') {
            const data = await YT.fetchAPI('playlists', { channelId, part: 'snippet', maxResults: 20 });
            grid.innerHTML = data.items.map(pl => `
                <div class="v-card" onclick="Actions.showCHPlaylist('${pl.id}', '${pl.snippet.title}')">
                    <div class="thumb-container"><img src="${pl.snippet.thumbnails.high.url}" class="main-thumb"></div>
                    <div class="v-text"><h3>${pl.snippet.title}</h3></div>
                </div>`).join('');
        } else {
            const data = await YT.fetchAPI('search', { channelId, part: 'snippet', type: 'video', order, q: type==='shorts' ? '#Shorts' : '', maxResults: 30 });
            this.currentList = data.items;
            this.renderGrid(this.currentList, 'ch-grid', type === 'shorts' ? 'shorts' : 'normal');
        }
    },

    async showCHPlaylist(playlistId, title) {
        const data = await YT.fetchAPI('playlistItems', { playlistId, part: 'snippet', maxResults: 50 });
        this.currentList = data.items;
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>${title}</h2><div id="pl-grid" class="grid"></div></div>`;
        this.renderGrid(this.currentList, 'pl-grid');
    },

    async fetchIcons(ids) {
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        data.items?.forEach(c => this.channelIcons[c.id] = c.snippet.thumbnails.default.url);
    },

    renderGrid(items, targetId, mode = 'normal') {
        const container = document.getElementById(targetId);
        container.innerHTML = items.map((item, i) => `
            <div class="v-card">
                <div class="thumb-container" onclick="Actions.playFromList(${i}, '${mode}')" style="${mode==='shorts' ? 'aspect-ratio:9/16;' : ''}">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                    ${mode!=='shorts' ? `<img src="${this.channelIcons[item.snippet.channelId] || ''}" class="ch-icon-img">` : ''}
                </div>
                <div class="v-text">
                    <h3 onclick="Actions.playFromList(${i}, '${mode}')">${item.snippet.title}</h3>
                    <p>${item.snippet.channelTitle}</p>
                </div>
            </div>`).join('');
    },

    async showShortsFeed() {
        this.showView();
        const data = await YT.fetchAPI('search', { q: '#Shorts', type: 'video', maxResults: 30, part: 'snippet' });
        this.currentList = data.items;
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>⚡ ショート</h1><div id="sh-grid" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))"></div></div>`;
        this.renderGrid(this.currentList, 'sh-grid', 'shorts');
    },

    playFromList(index, mode) {
        if (mode === 'shorts') this.playShort(index);
        else this.play(this.currentList[index], index);
    },

    async playShort(index) {
        this.currentIndex = index;
        const video = this.currentList[index];
        const vId = video.id.videoId;
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container" id="sh-zone">
                <div class="shorts-wrapper">
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1&loop=1&playlist=${vId}" style="width:100%; height:100%; border:none;"></iframe>
                </div>
                <div style="position:absolute; right:20px; display:flex; flex-direction:column; gap:20px;">
                    <button class="btn" onclick="Actions.playShort(${index-1})">▲</button>
                    <button class="btn" onclick="Actions.playShort(${index+1})">▼</button>
                </div>
            </div>`;
        
        let startY = 0;
        const zone = document.getElementById('sh-zone');
        zone.ontouchstart = e => startY = e.touches[0].clientY;
        zone.ontouchend = e => {
            const diff = startY - e.changedTouches[0].clientY;
            if (diff > 50) Actions.playShort(index + 1);
            else if (diff < -50) Actions.playShort(index - 1);
        };
    },

    async goHome() {
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        await this.fetchIcons(data.items.map(i => i.snippet.channelId).join(','));
        this.currentList = data.items;
        this.showView();
        document.getElementById('view-container').innerHTML = `<div id="home-grid" class="grid"></div>`;
        this.renderGrid(this.currentList, 'home-grid');
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 24 });
        this.currentList = data.items;
        this.showView();
        document.getElementById('view-container').innerHTML = `<div id="search-grid" class="grid"></div>`;
        this.renderGrid(this.currentList, 'search-grid');
    },

    showView() { document.getElementById('main-content').scrollTop = 0; }
};

window.onload = () => Actions.init();
