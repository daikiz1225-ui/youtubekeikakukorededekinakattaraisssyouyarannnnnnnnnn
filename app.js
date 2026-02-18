const Storage = {
    getHistory() { return JSON.parse(localStorage.getItem('yt_history')) || []; },
    addHistory(v) {
        let h = this.getHistory();
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50);
        localStorage.setItem('yt_history', JSON.stringify(h));
    },
    getSubs() { return JSON.parse(localStorage.getItem('yt_subs')) || []; },
    toggleSub(c) {
        let s = this.getSubs();
        const exists = s.find(x => x.id === c.id);
        if (exists) s = s.filter(x => x.id !== c.id); else s.push(c);
        localStorage.setItem('yt_subs', JSON.stringify(s));
    },
    getLiked() { return JSON.parse(localStorage.getItem('yt_liked')) || []; },
    toggleLike(v) {
        let l = this.getLiked();
        const idx = l.findIndex(x => x.id === v.id);
        if (idx > -1) l.splice(idx, 1); else l.unshift(v);
        localStorage.setItem('yt_liked', JSON.stringify(l));
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
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.innerText = t === 'dark' ? '🌙' : '☀️';
    }
};

const Actions = {
    currentList: [],
    relatedList: [],
    nextToken: "",
    channelIcons: {},
    isHome: false,
    isShortsMode: false,
    currentVideo: null,

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
            <div class="nav-item" onclick="Actions.showSubs()">🔔 <span>登録チャンネル</span></div>
            <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div>
            <div class="sidebar-section" style="border-top:1px solid var(--border); margin-top:10px; padding-top:10px;">
                <div style="font-size:12px; color:var(--text-sub); padding:0 15px 5px;">ライブラリ</div>
                <div class="nav-item" onclick="Actions.showLiked()">👍 <span>評価した動画</span></div>
                ${playlistHTML}
                <div class="nav-item" onclick="Actions.promptNewPlaylist()" style="color: var(--accent);">➕ <span>新しいリスト</span></div>
            </div>
        `;
    },

    async goHome(clear = false) {
        if(clear) document.getElementById('search-input').value = "";
        this.isHome = true; this.isShortsMode = false;
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.processData(data, false);
    },

    async search(q = document.getElementById('search-input').value, isMore = false) {
        if (!q) return;
        this.isHome = false;
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 30, pageToken: isMore ? this.nextToken : "" });
        this.processData(data, isMore);
    },

    async processData(data, isMore) {
        this.nextToken = data.nextPageToken || "";
        const chIds = [...new Set(data.items.map(i => i.snippet.channelId))].join(',');
        await this.fetchChannelIcons(chIds);
        if (isMore) this.currentList.push(...data.items); else { this.currentList = data.items; this.showView(); }
        this.renderGrid(this.currentList, 'view-container');
        document.getElementById('load-more').style.display = this.nextToken ? 'inline-block' : 'none';
    },

    async fetchChannelIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if(data.items) data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
    },

    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        container.innerHTML = `<div class="grid">` + items.map((item, i) => `
            <div class="v-card" onclick="Actions.playFromList(${i}, '${targetId}')">
                <div class="thumb-container">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                    <img src="${this.channelIcons[item.snippet.channelId] || ''}" class="ch-icon-img">
                </div>
                <div class="v-text">
                    <h3>${item.snippet.title}</h3>
                    <p>${item.snippet.channelTitle}</p>
                </div>
            </div>`).join('') + `</div>`;
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
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                </div>
                <div style="padding:15px 0;">
                    <div style="display:flex; justify-content:space-between;">
                        <h2 style="font-size:18px;">${video.snippet.title}</h2>
                        <div style="display:flex; gap:10px;">
                            <button class="btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '👍'} 評価</button>
                            <button class="btn" onclick="Actions.showPlaylistSelector()">➕ 保存</button>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px; margin-top:15px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                        <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                        <p style="margin:0; font-weight:bold;">${video.snippet.channelTitle}</p>
                    </div>
                </div>
            </div>`;
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url, channelId: video.snippet.channelId, channelTitle: video.snippet.channelTitle });
    },

    async openChannel(id, name, order = 'date', type = 'video') {
        this.showView();
        await this.fetchChannelIcons(id);
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px; display:flex; align-items:center; gap:20px; border-bottom:1px solid var(--border);">
                <img src="${this.channelIcons[id]}" style="width:60px; height:60px; border-radius:50%;">
                <h2 style="margin:0;">${name}</h2>
            </div>
            <div class="tabs">
                <div class="tab ${type==='video'&&order==='date'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date','video')">新規順</div>
                <div class="tab ${type==='video'&&order==='viewCount'?'active':''}" onclick="Actions.openChannel('${id}','${name}','viewCount','video')">人気順</div>
                <div class="tab ${type==='shorts'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date','shorts')">ショート</div>
                <div class="tab ${type==='playlists'?'active':''}" onclick="Actions.openChannel('${id}','${name}','','playlists')">再生リスト</div>
            </div>
            <div id="ch-grid"></div>`;
        
        if (type === 'playlists') {
            const data = await YT.fetchAPI('playlists', { channelId: id, part: 'snippet', maxResults: 20 });
            document.getElementById('ch-grid').innerHTML = `<div class="grid">` + data.items.map(pl => `<div class="v-card" onclick="Actions.showCHPlaylist('${pl.id}', '${pl.snippet.title}')"><div class="thumb-container"><img src="${pl.snippet.thumbnails.high.url}" class="main-thumb"></div><div class="v-text"><h3>${pl.snippet.title}</h3></div></div>`).join('') + `</div>`;
        } else {
            const data = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order, q: type==='shorts' ? '#Shorts' : '', maxResults: 30 });
            this.relatedList = data.items;
            this.renderGrid(this.relatedList, 'ch-grid');
        }
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
        const vId = video.id.videoId;
        const chId = video.snippet.channelId;
        if (!this.channelIcons[chId]) await this.fetchChannelIcons(chId);

        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container" id="sh-zone">
                <div class="shorts-wrapper">
                    <iframe src="${YT.getEmbedUrl(vId)}?autoplay=1&loop=1&playlist=${vId}" style="width:100%; height:100%; border:none;"></iframe>
                    <div class="shorts-info">
                        <div class="shorts-info-content">
                            <div class="shorts-ch-row" onclick="Actions.openChannel('${chId}', '${video.snippet.channelTitle}')" style="cursor:pointer;">
                                <img src="${this.channelIcons[chId]}">
                                <span style="font-weight:bold;">@${video.snippet.channelTitle}</span>
                            </div>
                            <div class="shorts-title">${video.snippet.title}</div>
                        </div>
                    </div>
                </div>
                <div style="position:absolute; right:20px; display:flex; flex-direction:column; gap:20px; z-index:10;">
                    <button class="btn" onclick="Actions.playShort(${index-1})" style="border-radius:50%; width:50px; height:50px;">▲</button>
                    <button class="btn" onclick="Actions.playShort(${index+1})" style="border-radius:50%; width:50px; height:50px;">▼</button>
                </div>
            </div>`;
        
        let startY = 0;
        document.getElementById('sh-zone').ontouchstart = e => startY = e.touches[0].clientY;
        document.getElementById('sh-zone').ontouchend = e => {
            const diff = startY - e.changedTouches[0].clientY;
            if (diff > 50) Actions.playShort(index + 1);
            else if (diff < -50) Actions.playShort(index - 1);
        };
    },

    playFromList(index, targetId) {
        const list = (targetId === 'pl-items-grid' || targetId === 'shorts-grid' || targetId === 'ch-grid') ? this.relatedList : this.currentList;
        this.play(list[index]);
    },

    showView() { document.getElementById('main-content').scrollTop = 0; },
    loadMore() { if(this.isHome) this.search(undefined, true); else this.search(undefined, true); },
    handleLike() { /* 既存 */ }, showHistory() { /* 既存 */ }, showLiked() { /* 既存 */ },
    promptNewPlaylist() { const n = prompt("名前:"); if(n) { Storage.createPlaylist(n); this.renderSidebar(); } }
};

window.onload = () => Actions.init();
