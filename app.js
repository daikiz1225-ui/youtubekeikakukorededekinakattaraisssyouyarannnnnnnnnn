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
            <div class="sidebar-section">
                <div class="sidebar-title">ライブラリ</div>
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
            data.items = data.items.filter(item => {
                const t = item.snippet.title.toLowerCase();
                return !t.includes('#shorts');
            });
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
            const videoId = item.id.videoId || item.id;
            return `
            <div class="v-card" onclick="Actions.playFromList(${i}, '${targetId}')">
                <div class="thumb-container">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                    <img src="${this.channelIcons[chId] || ''}" class="ch-icon-img">
                </div>
                <div class="v-text">
                    <h3>${item.snippet.title}</h3>
                    <p>${item.snippet.channelTitle}</p>
                </div>
            </div>`;
        }).join('') + `</div>`;
    },

    async play(video) {
        this.isShortsMode = false;
        this.currentVideo = video;
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : (video.id.resourceId ? video.id.resourceId.videoId : ""));
        const title = video.snippet.title;
        await YT.refreshEduKey();
        this.showView();
        
        const isLiked = Storage.getLiked().some(x => x.id === videoId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="display:flex; gap:20px; padding:20px; flex-wrap:wrap;">
                <div class="player-main" style="flex:3; min-width:600px;">
                    <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                        <iframe src="${YT.getEmbedUrl(videoId)}?autoplay=1" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                    </div>
                    <div style="padding:15px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <h2 style="font-size:20px; margin:0; flex:1;">${title}</h2>
                            <div class="video-actions">
                                <button class="action-btn ${isLiked ? 'active' : ''}" onclick="Actions.handleLike()">
                                    ${isLiked ? '❤️' : '👍'} <span>${isLiked ? '評価済み' : '高評価'}</span>
                                </button>
                                <button class="action-btn" onclick="Actions.showPlaylistSelector()">
                                    ➕ <span>保存</span>
                                </button>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                            <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                                <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                                <p style="margin:0; font-size:16px; font-weight:bold;">${video.snippet.channelTitle}</p>
                            </div>
                            <button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')">チャンネル登録</button>
                        </div>
                    </div>
                </div>
                <div class="related-side" id="related-items" style="flex:1; min-width:300px;"></div>
            </div>`;

        this.updateSubButton(video.snippet.channelId);
        Storage.addHistory({ id: videoId, title: title, thumb: video.snippet.thumbnails.medium.url, channelId: video.snippet.channelId, channelTitle: video.snippet.channelTitle });

        const relData = await YT.fetchAPI('search', { q: title.substring(0, 15), part: 'snippet', type: 'video', maxResults: 12 });
        this.relatedList = relData.items.filter(v => (v.id.videoId || v.id) !== videoId);
        document.getElementById('related-items').innerHTML = this.relatedList.map((v, i) => `
            <div class="side-card" style="display:flex; gap:10px; margin-bottom:12px; cursor:pointer;" onclick="Actions.playFromList(${i}, 'related-items')">
                <img src="${v.snippet.thumbnails.medium.url}" style="width:120px; aspect-ratio:16/9; border-radius:8px; object-fit:cover;">
                <div class="side-text"><h4 style="font-size:12px; margin:0; line-height:1.3;">${v.snippet.title}</h4><p style="font-size:11px; color:#aaa; margin:4px 0 0 0;">${v.snippet.channelTitle}</p></div>
            </div>`).join('');
    },

    handleLike() {
        const v = this.currentVideo;
        const videoId = v.id.videoId || (typeof v.id === 'string' ? v.id : (v.id.resourceId ? v.id.resourceId.videoId : ""));
        Storage.toggleLike({ id: videoId, title: v.snippet.title, thumb: v.snippet.thumbnails.medium.url, channelTitle: v.snippet.channelTitle });
        this.play(v); // UI更新
    },

    showPlaylistSelector() {
        const playlists = Storage.getPlaylists();
        const html = Object.keys(playlists).map(name => `
            <div class="playlist-item" onclick="Actions.addToPlaylist('${name}')">
                <span>📁 ${name}</span>
                <span>＋</span>
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'playlist-modal';
        modal.onclick = (e) => { if(e.target.id === 'playlist-modal') modal.remove(); };
        modal.innerHTML = `
            <div class="modal-content">
                <h3 style="margin-top:0;">プレイリストに保存</h3>
                ${html || '<p style="color:#aaa;">リストがありません</p>'}
                <button onclick="document.getElementById('playlist-modal').remove(); Actions.promptNewPlaylist();" style="width:100%; margin-top:15px; padding:12px; background:#3ea6ff; color:black; border:none; border-radius:8px; font-weight:bold;">＋ 新しいプレイリスト</button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    addToPlaylist(name) {
        const v = this.currentVideo;
        const videoId = v.id.videoId || (typeof v.id === 'string' ? v.id : (v.id.resourceId ? v.id.resourceId.videoId : ""));
        Storage.addToPlaylist(name, { id: videoId, title: v.snippet.title, thumb: v.snippet.thumbnails.medium.url, channelTitle: v.snippet.channelTitle });
        alert(`「${name}」に追加しました`);
        document.getElementById('playlist-modal').remove();
    },

    showLiked() {
        this.showView();
        const items = Storage.getLiked();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>👍 評価した動画</h1><div id="liked-grid"></div></div>`;
        if (items.length === 0) { document.getElementById('liked-grid').innerHTML = "まだありません"; return; }
        this.currentList = items.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid(this.currentList, 'liked-grid');
    },

    showPlaylist(name) {
        this.showView();
        const items = Storage.getPlaylists()[name] || [];
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>📁 ${name}</h1><div id="pl-grid"></div></div>`;
        if (items.length === 0) { document.getElementById('pl-grid').innerHTML = "動画がありません"; return; }
        this.currentList = items.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid(this.currentList, 'pl-grid');
    },

    // 💡 チャンネル欄（再生リスト復活版）
    async openChannel(id, name, order = 'date', type = 'video') {
        this.isShortsMode = (type === 'shorts');
        this.showView();
        await this.fetchChannelIcons(id);
        const icon = this.channelIcons[id] || '';
        document.getElementById('view-container').innerHTML = `
            <div class="channel-header" style="padding:30px 20px; display:flex; align-items:center; gap:25px; border-bottom:1px solid #222;">
                <img src="${icon}" style="width:80px; height:80px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;"><h2>${name}</h2><button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${id}', '${name}')">チャンネル登録</button></div>
            </div>
            <div class="tabs">
                <div class="tab ${type==='video'&&order==='date'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date','video')">新規順</div>
                <div class="tab ${type==='video'&&order==='viewCount'?'active':''}" onclick="Actions.openChannel('${id}','','viewCount','video')">人気順</div>
                <div class="tab ${type==='shorts'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date','shorts')">ショート</div>
                <div class="tab ${type==='playlists'?'active':''}" onclick="Actions.openChannel('${id}','${name}','','playlists')">再生リスト</div>
            </div>
            <div id="ch-grid" class="grid"></div>`;
        this.updateSubButton(id);
        
        const chGrid = document.getElementById('ch-grid');
        if (type === 'playlists') {
            const data = await YT.fetchAPI('playlists', { channelId: id, part: 'snippet', maxResults: 20 });
            chGrid.innerHTML = data.items.map(pl => `
                <div class="v-card" onclick="Actions.showChannelPlaylistItems('${pl.id}', '${pl.snippet.title}')">
                    <div class="thumb-container">
                        <img src="${pl.snippet.thumbnails.high.url}" class="main-thumb">
                        <div style="position:absolute; bottom:0; right:0; background:rgba(0,0,0,0.8); padding:5px 10px; font-size:12px;">Playlist ☰</div>
                    </div>
                    <div class="v-text"><h3>${pl.snippet.title}</h3><p>${pl.snippet.channelTitle}</p></div>
                </div>`).join('');
        } else if (type === 'shorts') {
            const data = await YT.fetchAPI('search', { channelId: id, q: '#Shorts', part: 'snippet', maxResults: 30 });
            this.relatedList = data.items;
            chGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(140px, 1fr))";
            this.renderShortsGrid(this.relatedList, 'ch-grid');
        } else {
            const data = await YT.fetchAPI('search', { channelId: id, type: 'video', order: order, part: 'snippet', maxResults: 30 });
            this.currentList = data.items;
            chGrid.style.gridTemplateColumns = "";
            this.renderGrid(this.currentList, 'ch-grid');
        }
    },

    async showChannelPlaylistItems(playlistId, title) {
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <button onclick="window.history.back()" style="background:#333; color:white; border:none; padding:8px 15px; border-radius:5px; margin-bottom:20px;">← 戻る</button>
                <h1>${title}</h1>
                <div id="pl-items-grid" class="grid"></div>
            </div>`;
        const data = await YT.fetchAPI('playlistItems', { playlistId: playlistId, part: 'snippet', maxResults: 50 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'pl-items-grid');
    },

    async showShortsFeed() {
        this.isShortsMode = true; this.isHome = false; this.showView();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>⚡ ショート</h1><div id="shorts-grid" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div></div>`;
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 30 });
        this.relatedList = data.items;
        this.renderShortsGrid(this.relatedList, 'shorts-grid');
    },

    renderShortsGrid(items, targetId) {
        const container = document.getElementById(targetId);
        container.innerHTML = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playShort(${i})">
                <div class="thumb-container" style="aspect-ratio: 9/16;"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb" style="aspect-ratio: 9/16;"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3></div>
            </div>`).join('');
    },

    async playShort(index) {
        this.currentShortIndex = index;
        const video = this.relatedList[index];
        const videoId = video.id.videoId;
        await YT.refreshEduKey();
        this.showView();
        const embedUrl = `${YT.getEmbedUrl(videoId)}?autoplay=1&mute=1&rel=0&controls=1&loop=1&playlist=${videoId}`;
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container" id="shorts-swipe-zone">
                <div class="shorts-wrapper"><iframe src="${embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>
                <div class="shorts-nav-btn"><button class="s-btn" onclick="Actions.nextShort(-1)">▲</button><button class="s-btn" onclick="Actions.nextShort(1)">▼</button></div>
                <div style="position:absolute; bottom:40px; left:40px; pointer-events:none; text-shadow: 0 2px 8px rgba(0,0,0,1); z-index:10;">
                    <h2 style="margin:0; font-size:20px;">${video.snippet.title}</h2><p style="margin:8px 0 0 0; font-weight:bold;">@${video.snippet.channelTitle}</p>
                </div>
            </div>`;
        const zone = document.getElementById('shorts-swipe-zone');
        let startY = 0;
        zone.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, {passive: true});
        zone.addEventListener('touchend', (e) => {
            let diff = startY - e.changedTouches[0].clientY;
            if (Math.abs(diff) > 30) Actions.nextShort(diff > 0 ? 1 : -1);
        }, {passive: true});
    },

    nextShort(dir) {
        let newIdx = this.currentShortIndex + dir;
        if (newIdx >= 0 && newIdx < this.relatedList.length) this.playShort(newIdx);
    },

    playFromList(index, targetId) {
        const list = (targetId === 'related-items' || targetId === 'pl-items-grid' || (targetId === 'ch-grid' && this.isShortsMode)) ? this.relatedList : this.currentList;
        this.play(list[index]);
    },

    showHistory() {
        this.isShortsMode = false; this.showView();
        const h = Storage.getHistory();
        if (h.length === 0) { document.getElementById('view-container').innerHTML = `<h2 style="text-align:center; padding:50px;">履歴なし</h2>`; return; }
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelId: x.channelId, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>🕒 視聴履歴</h1><div id="hist-grid"></div></div>`;
        this.renderGrid(this.currentList, 'hist-grid');
    },

    showSubs() {
        this.isShortsMode = false; this.showView();
        const s = Storage.getSubs();
        if (s.length === 0) { document.getElementById('view-container').innerHTML = `<h2 style="text-align:center; padding:50px;">登録なし</h2>`; return; }
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>🔔 登録チャンネル</h1>` + s.map(ch => `
            <div class="nav-item" style="background:#222; margin-bottom:10px; justify-content:space-between;" onclick="Actions.openChannel('${ch.id}', '${ch.name}')">
                <div style="display:flex; align-items:center; gap:10px;"><img src="${this.channelIcons[ch.id] || ''}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;"><h3>${ch.name}</h3></div>
                <span>➔</span>
            </div>`).join('') + `</div>`;
    },

    goHome(clear = false) { this.isShortsMode = false; if (clear) document.getElementById('search-input').value = ""; this.fetchTrending(); },
    showView() { window.scrollTo(0,0); document.getElementById('main-content').scrollTo(0,0); },
    handleSub(id, name) { Storage.toggleSub({ id, name }); this.updateSubButton(id); this.renderSidebar(); },
    updateSubButton(id) {
        const b = document.getElementById('sub-btn');
        if (!b) return;
        const is = Storage.getSubs().some(x => x.id === id);
        b.innerText = is ? "登録済み" : "チャンネル登録";
        b.style.background = is ? "#333" : "#cc0000";
    },
    loadMore() { if(this.isHome) this.fetchTrending(true); else this.search(undefined, true); }
};

window.onload = () => Actions.init();
