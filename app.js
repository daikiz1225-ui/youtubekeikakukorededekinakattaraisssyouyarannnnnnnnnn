const Storage = {
    get(k, d = []) { return JSON.parse(localStorage.getItem(k)) || d; },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    getPlaylists() { return this.get('yt_playlists', {}); },
    toggleLike(v) {
        let l = this.get('yt_liked');
        const i = l.findIndex(x => x.id === v.id);
        if (i > -1) l.splice(i, 1); else l.unshift(v);
        this.set('yt_liked', l);
    },
    addToPL(name, v) {
        let p = this.getPlaylists();
        if (!p[name].find(x => x.id === v.id)) p[name].unshift(v);
        this.set('yt_playlists', p);
    },
    removeFromPL(name, id) {
        let p = this.getPlaylists();
        p[name] = p[name].filter(x => x.id !== id);
        this.set('yt_playlists', p);
    }
};

const Theme = {
    init() {
        const t = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        this.updateBtn(t);
    },
    toggle() {
        const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', n);
        localStorage.setItem('theme', n);
        this.updateBtn(n);
    },
    updateBtn(t) { if(document.getElementById('theme-toggle-btn')) document.getElementById('theme-toggle-btn').innerText = t === 'dark' ? '🌙' : '☀️'; }
};

const Actions = {
    currentList: [], currentIndex: -1, channelIcons: {}, player: null, isShorts: false,

    init() { Theme.init(); this.renderSidebar(); this.goHome(); },

    renderSidebar() {
        const pl = Storage.getPlaylists();
        const plHtml = Object.keys(pl).map(n => `
            <div class="nav-item">
                <span onclick="Actions.showPlaylist('${n}')" style="flex:1;">📁 ${n}</span>
                <button class="del-btn" onclick="Actions.deletePL('${n}')">🗑️</button>
            </div>`).join('');
        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome()">🏠 <span>ホーム</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div>
            <div class="sidebar-section">
                <div class="sidebar-title">ライブラリ</div>
                <div class="nav-item" onclick="Actions.showLiked()">👍 <span>高評価</span></div>
                <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div>
                ${plHtml}
                <div class="nav-item" onclick="Actions.promptNewPL()" style="color:var(--accent)">➕ <span>新規作成</span></div>
            </div>`;
    },

    async play(video, index = -1) {
        this.isShorts = false; this.currentIndex = index;
        const vId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        this.showView();
        const isL = Storage.get('yt_liked').some(x => x.id === vId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="display:flex; gap:20px; padding:20px; flex-wrap:wrap;">
                <div style="flex:3; min-width:600px;">
                    <div id="player-api" style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;"></div>
                    <div style="padding:15px 0;">
                        <div style="display:flex; justify-content:space-between;">
                            <h2>${video.snippet.title}</h2>
                            <div class="video-actions">
                                <button class="action-btn ${isL?'active':''}" onclick="Actions.handleLike()">👍</button>
                                <button class="action-btn" onclick="Actions.showPLSelector('${vId}')">➕</button>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px; margin-top:15px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}','${video.snippet.channelTitle}')">
                            <img src="${this.channelIcons[video.snippet.channelId]||''}" style="width:40px; height:40px; border-radius:50%;">
                            <b>${video.snippet.channelTitle}</b>
                        </div>
                    </div>
                </div>
                <div id="related-area" style="flex:1; min-width:300px;"></div>
            </div>`;

        this.player = new YT.Player('player-api', { videoId: vId, playerVars: {autoplay:1}, events: {onStateChange: e => {if(e.data===0) Actions.playNext();}}});
        this.addHistory(video);
        this.loadRelated(video.snippet.title, vId);
    },

    playNext() { if(this.currentIndex >= 0 && this.currentIndex < this.currentList.length-1) this.playFromList(this.currentIndex+1); },

    async openChannel(id, name, order='date', type='video') {
        this.showView(); await this.fetchIcons(id);
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:20px;">
                <img src="${this.channelIcons[id]}" style="width:80px; border-radius:50%;">
                <h1>${name}</h1>
            </div>
            <div class="tabs">
                <div class="tab ${type==='video'&&order==='date'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date','video')">新規順</div>
                <div class="tab ${type==='video'&&order==='viewCount'?'active':''}" onclick="Actions.openChannel('${id}','${name}','viewCount','video')">人気順</div>
                <div class="tab ${type==='shorts'?'active':''}" onclick="Actions.openChannel('${id}','${name}','','shorts')">ショート</div>
                <div class="tab ${type==='playlists'?'active':''}" onclick="Actions.openChannel('${id}','${name}','','playlists')">再生リスト</div>
            </div>
            <div id="ch-grid" class="grid"></div>`;
        
        const grid = document.getElementById('ch-grid');
        if(type==='playlists') {
            const d = await YT.fetchAPI('playlists',{channelId:id, part:'snippet', maxResults:20});
            grid.innerHTML = d.items.map(p => `<div class="v-card" onclick="Actions.showCHPlaylist('${p.id}','${p.snippet.title}')"><div class="thumb-container"><img src="${p.snippet.thumbnails.high.url}" class="main-thumb"></div><h3>${p.snippet.title}</h3></div>`).join('');
        } else {
            const d = await YT.fetchAPI('search',{channelId:id, type:'video', order, q:type==='shorts'?'#Shorts':'', maxResults:30});
            this.currentList = d.items;
            this.renderGrid(this.currentList, 'ch-grid', type==='shorts'?'shorts':'normal');
        }
    },

    renderGrid(items, target, mode='normal') {
        const g = document.getElementById(target);
        g.innerHTML = items.map((item, i) => `
            <div class="v-card">
                <div class="thumb-container" onclick="Actions.playFromList(${i},'${mode}')" style="${mode==='shorts'?'aspect-ratio:9/16':''}">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                    ${mode!=='shorts'?`<img src="${this.channelIcons[item.snippet.channelId]||''}" class="ch-icon-img">`:''}
                </div>
                <div class="v-text">
                    <h3 onclick="Actions.playFromList(${i},'${mode}')">${item.snippet.title}</h3>
                    ${this.currentListName ? `<button class="del-btn" onclick="Actions.removeVideo('${item.id.videoId||item.id}')">✕</button>` : ''}
                </div>
                <p>${item.snippet.channelTitle}</p>
            </div>`).join('');
    },

    async showShortsFeed() {
        this.showView();
        const d = await YT.fetchAPI('search',{q:'#Shorts', type:'video', maxResults:30});
        this.currentList = d.items;
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>⚡ ショート</h1><div id="sh-grid" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))"></div></div>`;
        this.renderGrid(this.currentList, 'sh-grid', 'shorts');
    },

    playFromList(i, mode) { if(mode==='shorts') this.playShort(i); else this.play(this.currentList[i], i); },

    async playShort(index) {
        this.currentIndex = index; const v = this.currentList[index];
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container" id="sh-zone">
                <div class="shorts-wrapper"><iframe src="${YT.getEmbedUrl(v.id.videoId)}?autoplay=1&loop=1&playlist=${v.id.videoId}" style="width:100%; height:100%; border:none;"></iframe></div>
                <div style="position:absolute; right:20px; display:flex; flex-direction:column; gap:20px;">
                    <button class="btn" onclick="Actions.playShort(${index-1})">▲</button>
                    <button class="btn" onclick="Actions.playShort(${index+1})">▼</button>
                </div>
            </div>`;
        let startY = 0;
        const zone = document.getElementById('sh-zone');
        zone.ontouchstart = e => startY = e.touches[0].clientY;
        zone.ontouchend = e => { if(startY - e.changedTouches[0].clientY > 50) Actions.playShort(index+1); else if(startY - e.changedTouches[0].clientY < -50) Actions.playShort(index-1); };
    },

    async fetchIcons(ids) {
        const d = await YT.fetchAPI('channels', {id: ids, part: 'snippet'});
        d.items?.forEach(c => this.channelIcons[c.id] = c.snippet.thumbnails.default.url);
    },

    async goHome() {
        const d = await YT.fetchAPI('videos', {chart:'mostPopular', regionCode:'JP', maxResults:24});
        await this.fetchIcons(d.items.map(i=>i.snippet.channelId).join(','));
        this.currentList = d.items; this.showView();
        document.getElementById('view-container').innerHTML = `<div id="home-grid" class="grid"></div>`;
        this.renderGrid(this.currentList, 'home-grid');
    },

    async search() {
        const q = document.getElementById('search-input').value;
        const d = await YT.fetchAPI('search', {q, type:'video', maxResults:24});
        this.currentList = d.items; this.renderGrid(this.currentList, 'view-container');
    },

    showPlaylist(n) {
        this.currentListName = n; const items = Storage.getPlaylists()[n];
        this.currentList = items.map(v => ({id:v.id, snippet:{title:v.title, thumbnails:{high:{url:v.thumb}}, channelTitle:v.channelTitle}}));
        this.showView(); document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>📁 ${n}</h1><div id="pl-grid"></div></div>`;
        this.renderGrid(this.currentList, 'pl-grid');
    },

    removeVideo(id) { Storage.removeFromPL(this.currentListName, id); this.showPlaylist(this.currentListName); },
    deletePL(n) { if(confirm('削除？')) { let p=Storage.getPlaylists(); delete p[n]; Storage.set('yt_playlists',p); this.renderSidebar(); } },
    promptNewPL() { const n=prompt('名？'); if(n){ let p=Storage.getPlaylists(); p[n]=[]; Storage.set('yt_playlists',p); this.renderSidebar(); } },
    handleLike() { const v=this.currentList[this.currentIndex]; Storage.toggleLike({id:v.id.videoId||v.id, title:v.snippet.title, thumb:v.snippet.thumbnails.high.url, channelTitle:v.snippet.channelTitle}); this.renderSidebar(); },
    showView() { document.getElementById('main-content').scrollTop = 0; },
    addHistory(v) { let h = Storage.get('yt_history'); h = [v, ...h.filter(x=>(x.id.videoId||x.id)!==(v.id.videoId||v.id))].slice(0,50); Storage.set('yt_history', h); },
    showHistory() { this.currentList = Storage.get('yt_history'); this.renderGrid(this.currentList, 'view-container'); }
};

function onYouTubeIframeAPIReady() { Actions.init(); }
