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

const Actions = {
    currentList: [],
    relatedList: [],
    nextToken: "",
    channelIcons: {},
    isHome: false,
    isShortsMode: false,
    currentShortIndex: 0,
    currentVideo: null,

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
            <div class="nav-item" onclick="Actions.goHome(true)">🏠 <span>ホーム</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div>
            <div class="nav-item" onclick="Actions.showSubs()">🔔 <span>登録チャンネル</span></div>
            <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div>
            <div class="sidebar-section" style="border-top:1px solid #222; margin-top:10px; padding-top:10px;">
                <div style="font-size:12px; color:#aaa; padding:0 15px 5px;">ライブラリ</div>
                <div class="nav-item" onclick="Actions.showLiked()">👍 <span>評価した動画</span></div>
                ${playlistHTML}
                <div class="nav-item" onclick="Actions.promptNewPlaylist()" style="color: #3ea6ff;">➕ <span>新しいリスト</span></div>
            </div>
        `;
    },

    promptNewPlaylist() {
        const name = prompt("プレイリストの名前を入力してください:");
        if (name) { Storage.createPlaylist(name); this.renderSidebar(); }
    },

    async search(q = document.getElementById('search-input').value, isMore = false) {
        if (!q) return;
        this.isHome = false;
        let params = { q, part: 'snippet', type: 'video', maxResults: 30, pageToken: isMore ? this.nextToken : "" };

        if (this.isShortsMode) {
            params.q = q + " #Shorts";
            const data = await YT.fetchAPI('search', params);
            this.relatedList = isMore ? [...this.relatedList, ...data.items] : data.items;
            this.showView();
            document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>⚡ ショート検索: ${q}</h1><div id="shorts-grid" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div></div>`;
            this.renderShortsGrid(this.relatedList, 'shorts-grid');
        } else {
            const data = await YT.fetchAPI('search', params);
            this.processData(data, isMore);
        }
    },

    async fetchTrending(isMore = false) {
        this.isHome = true;
        this.isShortsMode = false;
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24, pageToken: isMore ? this.nextToken : "" });
        this.processData(data, isMore);
    },

    async processData(data, isMore) {
        this.nextToken = data.nextPageToken || "";
        const chIds = [...new Set(data.items.map(i => i.snippet.channelId))].join(',');
        await this.fetchChannelIcons(chIds);
        if (isMore) this.currentList.push(...data.items); else { this.currentList = data.items; this.showView(); }
        this.renderGrid(this.currentList, 'view-container');
        document.getElementById('load-more').style.display = this.nextToken ? 'block' : 'none';
    },

    async fetchChannelIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if(data.items) data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
    },

    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        container.innerHTML = `<div class="grid">` + items.map((item, i) => {
            const chId = item.snippet.channelId;
            return `
            <div class="v-card" onclick="Actions.playFromList(${i}, '${targetId}')">
                <div class="thumb-container">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                    <img src="${this.channelIcons[chId] || ''}" style="position:absolute; top:8px; right:8px; width:28px; height:28px; border-radius:4px; border:1px solid rgba(255,255,255,0.3); object-fit:cover;">
                </div>
                <div class="v-text">
                    <h3 style="font-size:14px; margin:8px 0 0; line-height:1.4;">${item.snippet.title}</h3>
                    <p style="font-size:12px; color:#aaa; margin:4px 0;">${item.snippet.channelTitle}</p>
                </div>
            </div>`;
        }).join('') + `</div>`;
    },

    async play(video) {
        this.isShortsMode = false;
        this.currentVideo = video;
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        this.showView();
        
        const isLiked = Storage.getLiked().some(x => x.id === videoId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="padding:20px;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${YT.getEmbedUrl(videoId)}?autoplay=1" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                </div>
                <div style="padding:15px 0;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h2 style="font-size:18px;">${video.snippet.title}</h2>
                        <div style="display:flex; gap:10px;">
                            <button class="sub-btn" onclick="Actions.handleLike()" style="background:#333; color:white; border:none; padding:8px 15px; border-radius:20px;">${isLiked ? '❤️' : '👍'} 評価</button>
                            <button class="sub-btn" onclick="Actions.showPlaylistSelector()" style="background:#333; color:white; border:none; padding:8px 15px; border-radius:20px;">➕ 保存</button>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px; margin-top:15px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                        <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                        <p style="margin:0; font-weight:bold;">${video.snippet.channelTitle}</p>
                        <button class="sub-btn" id="sub-btn" onclick="event.stopPropagation(); Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')" style="background:#cc0000; color:white; border:none; padding:8px 15px; border-radius:20px; font-weight:bold;">登録</button>
                    </div>
                </div>
            </div>`;

        this.updateSubButton(video.snippet.channelId);
        Storage.addHistory({ id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url, channelId: video.snippet.channelId, channelTitle: video.snippet.channelTitle });
    },

    showPlaylistSelector() {
        const playlists = Storage.getPlaylists();
        const html = Object.keys(playlists).map(name => `
            <div class="playlist-item" onclick="Actions.addToPlaylist('${name}')" style="padding:12px; cursor:pointer; border-radius:8px;">📁 ${name}</div>
        `).join('');

        const modal = document.createElement('div');
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; display:flex; justify-content:center; align-items:center;";
        modal.id = 'playlist-modal';
        modal.onclick = (e) => { if(e.target.id === 'playlist-modal') modal.remove(); };
        modal.innerHTML = `<div style="background:#212121; padding:20px; border-radius:12px; width:300px; color:white;"><h3>保存先を選択</h3>${html}</div>`;
        document.body.appendChild(modal);
    },

    addToPlaylist(name) {
        const v = this.currentVideo;
        const videoId = v.id.videoId || (typeof v.id === 'string' ? v.id : v.id.resourceId?.videoId);
        Storage.addToPlaylist(name, { id: videoId, title: v.snippet.title, thumb: v.snippet.thumbnails.medium.url, channelTitle: v.snippet.channelTitle });
        alert(`「${name}」に追加しました`);
        document.getElementById('playlist-modal').remove();
    },

    async openChannel(id, name, order = 'date', type = 'video') {
        this.isShortsMode = (type === 'shorts');
        this.showView();
        await this.fetchChannelIcons(id);
        const icon = this.channelIcons[id] || '';
        
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px; display:flex; align-items:center; gap:20px; border-bottom:1px solid #222;">
                <img src="${icon}" style="width:60px; height:60px; border-radius:50%;">
                <h2 style="margin:0;">${name}</h2>
            </div>
            <div class="tabs" style="display:flex; gap:20px; padding:0 20px; border-bottom:1px solid #222;">
                <div class="tab ${type==='video'&&order==='date'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date','video')" style="padding:15px 5px; cursor:pointer;">新規順</div>
                <div class="tab ${type==='video'&&order==='viewCount'?'active':''}" onclick="Actions.openChannel('${id}','${name}','viewCount','video')" style="padding:15px 5px; cursor:pointer;">人気順</div>
                <div class="tab ${type==='shorts'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date','shorts')" style="padding:15px 5px; cursor:pointer;">ショート</div>
                <div class="tab ${type==='playlists'?'active':''}" onclick="Actions.openChannel('${id}','${name}','','playlists')" style="padding:15px 5px; cursor:pointer;">再生リスト</div>
            </div>
            <div id="ch-grid" class="grid"></div>`;
        
        const chGrid = document.getElementById('ch-grid');
        if (type === 'playlists') {
            const data = await YT.fetchAPI('playlists', { channelId: id, part: 'snippet', maxResults: 20 });
            chGrid.innerHTML = data.items.map(pl => `
                <div class="v-card" onclick="Actions.showCHPlaylist('${pl.id}', '${pl.snippet.title}')">
                    <div class="thumb-container"><img src="${pl.snippet.thumbnails.high.url}" class="main-thumb"></div>
                    <div class="v-text"><h3>${pl.snippet.title}</h3></div>
                </div>`).join('');
        } else {
            const data = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order, q: type==='shorts' ? '#Shorts' : '', maxResults: 30 });
            this.currentList = data.items;
            this.renderGrid(this.currentList, 'ch-grid', type === 'shorts' ? 'shorts' : 'normal');
        }
    },

    async showCHPlaylist(playlistId, title) {
        const data = await YT.fetchAPI('playlistItems', { playlistId, part: 'snippet', maxResults: 50 });
        this.currentList = data.items;
        this.showView();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>${title}</h2><div id="pl-items-grid" class="grid"></div></div>`;
        this.renderGrid(this.currentList, 'pl-items-grid');
    },

    async showShortsFeed() {
        this.isShortsMode = true; this.showView();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>⚡ ショート</h1><div id="shorts-grid" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div></div>`;
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 30 });
        this.relatedList = data.items;
        this.renderShortsGrid(this.relatedList, 'shorts-grid');
    },

    renderShortsGrid(items, targetId) {
        const container = document.getElementById(targetId);
        container.innerHTML = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playShort(${i})">
                <div class="thumb-container" style="aspect-ratio: 9/16;"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3></div>
            </div>`).join('');
    },

    async playShort(index) {
        this.currentShortIndex = index;
        const video = this.relatedList[index];
        const videoId = video.id.videoId;
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container" id="sh-zone" style="display:flex; justify-content:center; align-items:center; height:80vh; background:#000;">
                <iframe src="${YT.getEmbedUrl(videoId)}?autoplay=1&loop=1&playlist=${videoId}" style="height:90%; aspect-ratio:9/16; border:none;"></iframe>
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

    playFromList(index, targetId) {
        const list = (targetId === 'pl-items-grid' || targetId === 'shorts-grid') ? this.relatedList : this.currentList;
        this.play(list[index]);
    },

    showHistory() {
        this.isShortsMode = false; this.showView();
        const h = Storage.getHistory();
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelId: x.channelId, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>🕒 履歴</h1><div id="hist-grid"></div></div>`;
        this.renderGrid(this.currentList, 'hist-grid');
    },

    showSubs() {
        this.isShortsMode = false; this.showView();
        const s = Storage.getSubs();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>🔔 登録チャンネル</h1>` + s.map(ch => `<div class="nav-item" style="background:#222; margin-bottom:10px;" onclick="Actions.openChannel('${ch.id}', '${ch.name}')">${ch.name}</div>`).join('') + `</div>`;
    },

    showLiked() {
        this.isShortsMode = false; this.showView();
        const items = Storage.getLiked();
        this.currentList = items.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>👍 高評価</h1><div id="liked-grid"></div></div>`;
        this.renderGrid(this.currentList, 'liked-grid');
    },

    showPlaylist(name) {
        this.isShortsMode = false; this.showView();
        const items = Storage.getPlaylists()[name] || [];
        this.currentList = items.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>📁 ${name}</h1><div id="pl-grid"></div></div>`;
        this.renderGrid(this.currentList, 'pl-grid');
    },

    goHome(clear = false) { if(clear) document.getElementById('search-input').value = ""; this.fetchTrending(); },
    showView() { document.getElementById('main-content').scrollTop = 0; },
    handleSub(id, name) { Storage.toggleSub({ id, name }); this.updateSubButton(id); this.renderSidebar(); },
    updateSubButton(id) {
        const b = document.getElementById('sub-btn');
        if (!b) return;
        const is = Storage.getSubs().some(x => x.id === id);
        b.innerText = is ? "登録済み" : "登録";
        b.style.background = is ? "#333" : "#cc0000";
    },
    loadMore() { if(this.isHome) this.fetchTrending(true); else this.search(undefined, true); },
    handleLike() { const v = this.currentVideo; const vId = v.id.videoId || (typeof v.id === 'string' ? v.id : v.id.resourceId?.videoId); Storage.toggleLike({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.medium.url, channelTitle: v.snippet.channelTitle }); this.play(v); }
};

window.onload = () => Actions.init();
