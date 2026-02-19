const YT = {
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    currentEduKey: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",

    async refreshEduKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            if (data && data.key) this.currentEduKey = data.key;
        } catch (e) { console.error("Key refresh error"); }
    },

    getCurrentKey() {
        const index = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[index];
    },

    async fetchAPI(endpoint, params) {
        const queryParams = new URLSearchParams({ ...params, key: this.getCurrentKey() });
        const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams}`);
        if (res.status === 403) {
            let next = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
            if (next < this.keys.length) {
                localStorage.setItem('yt_key_index', next);
                return this.fetchAPI(endpoint, params);
            }
        }
        return await res.json();
    },

    getEmbedUrl(id) {
        const params = new URLSearchParams({
            autoplay: 1, origin: "https://create.kahoot.it",
            embed_config: JSON.stringify({ enc: this.currentEduKey, hideTitle: true }),
            rel: 0, modestbranding: 1, enablejsapi: 1
        });
        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

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
    // 💡 いいね機能
    getLikes() { return JSON.parse(localStorage.getItem('yt_likes')) || []; },
    toggleLike(v) {
        let l = this.getLikes();
        const idx = l.findIndex(x => x.id === v.id);
        if (idx > -1) l.splice(idx, 1); else l.push(v);
        localStorage.setItem('yt_likes', JSON.stringify(l));
    },
    // 💡 プレイリスト機能
    getPlaylists() { return JSON.parse(localStorage.getItem('yt_playlists')) || []; },
    createPlaylist(name) {
        let p = this.getPlaylists();
        p.push({ name, videos: [] });
        localStorage.setItem('yt_playlists', JSON.stringify(p));
    },
    deletePlaylist(name) {
        let p = this.getPlaylists().filter(x => x.name !== name);
        localStorage.setItem('yt_playlists', JSON.stringify(p));
    },
    addToPlaylist(pName, video) {
        let p = this.getPlaylists();
        const target = p.find(x => x.name === pName);
        if (target && !target.videos.find(x => x.id === video.id)) {
            target.videos.push(video);
            localStorage.setItem('yt_playlists', JSON.stringify(p));
        }
    },
    removeFromPlaylist(pName, vId) {
        let p = this.getPlaylists();
        const target = p.find(x => x.name === pName);
        if (target) {
            target.videos = target.videos.filter(x => x.id !== vId);
            localStorage.setItem('yt_playlists', JSON.stringify(p));
        }
    }
};

const Actions = {
    currentList: [], relatedList: [], nextToken: "", channelIcons: {},
    isShortsMode: false, currentShortIndex: 0, currentPlayVideo: null,
    currentView: "home", currentChannelInfo: null, isDarkMode: true,

    async init() {
        this.loadTheme();
        this.renderSidebar();
        await YT.refreshEduKey();
        this.goHome();
        
        const input = document.getElementById('search-input');
        if(input) {
            input.onkeydown = (e) => { 
                if(e.key === 'Enter') { 
                    e.preventDefault(); 
                    this.search(); 
                    input.blur(); 
                } 
            };
        }
        const sBtn = document.getElementById('search-btn');
        if(sBtn) sBtn.onclick = () => this.search();

        const tBtn = document.getElementById('theme-toggle-btn');
        if(tBtn) tBtn.onclick = () => this.toggleTheme();
    },

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        localStorage.setItem('yt_theme', this.isDarkMode ? 'dark' : 'light');
    },

    loadTheme() {
        const saved = localStorage.getItem('yt_theme');
        this.isDarkMode = (saved === null) ? true : (saved === 'dark');
        this.applyTheme();
    },

    applyTheme() {
        const root = document.documentElement;
        if (this.isDarkMode) {
            root.style.setProperty('--bg-color', '#0f0f0f');
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--card-bg', 'rgba(128, 128, 128, 0.1)');
            root.style.setProperty('--border-color', '#333');
            root.style.setProperty('--input-bg', 'rgba(128, 128, 128, 0.05)');
        } else {
            root.style.setProperty('--bg-color', '#ffffff');
            root.style.setProperty('--text-color', '#0f0f0f');
            root.style.setProperty('--card-bg', '#f2f2f2');
            root.style.setProperty('--border-color', '#ccc');
            root.style.setProperty('--input-bg', '#eeeeee');
        }
    },

    renderSidebar() {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;
        nav.innerHTML = `
            <div class="nav-item" onclick="Actions.goHome()">🏠<span>ホーム</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡<span>ショート</span></div>
            <div class="nav-item" onclick="Actions.showLikes()">👍<span>いいね</span></div>
            <div class="nav-item" onclick="Actions.showPlaylists()">📁<span>リスト</span></div>
            <div class="nav-item" onclick="Actions.showSubs()">🔔<span>登録中</span></div>
            <div class="nav-item" onclick="Actions.showHistory()">🕒<span>履歴</span></div>
        `;
    },

    async goHome() {
        this.isShortsMode = false; this.currentView = "home";
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.nextToken = data.nextPageToken || "";
        this.currentList = data.items || [];
        this.renderMain();
    },

    async search(isMore = false) {
        const q = document.getElementById('search-input').value;
        if(!q) return;
        if(!isMore) { this.currentView = "search"; window.scrollTo(0,0); }
        let query = this.isShortsMode ? q + " #Shorts" : q;
        let params = { q: query, part: 'snippet', type: 'video', maxResults: 30, pageToken: isMore ? this.nextToken : "" };
        const data = await YT.fetchAPI('search', params);
        this.nextToken = data.nextPageToken || "";
        if(isMore) this.currentList.push(...data.items); else this.currentList = data.items;
        this.renderMain();
    },

    renderMain() {
        const container = document.getElementById('view-container');
        if(!container) return;
        const chIds = [...new Set(this.currentList.map(i => i.snippet?.channelId))].filter(id => id && !this.channelIcons[id]).join(',');
        this.fetchChannelIcons(chIds);
        const gridHtml = this.currentList.map((item, i) => {
            const snip = item.snippet;
            if(!snip) return '';
            return `
            <div class="v-card" onclick="${this.isShortsMode ? `Actions.playShort(${i})` : `Actions.playFromList(${i})`}">
                <div class="thumb-container" style="${this.isShortsMode ? 'aspect-ratio:9/16;' : ''}">
                    <img src="${snip.thumbnails.high.url}" class="main-thumb" style="${this.isShortsMode ? 'aspect-ratio:9/16; object-fit:cover;' : ''}">
                    ${!this.isShortsMode ? `<img src="${this.channelIcons[snip.channelId] || ''}" class="ch-icon-img">` : ''}
                </div>
                <div class="v-text"><h3>${snip.title}</h3><p>${snip.channelTitle}</p></div>
            </div>`;
        }).join('');
        container.innerHTML = `<div class="grid">${gridHtml}</div><div style="padding: 20px 0 120px 0; text-align:center;"><button class="btn" onclick="Actions.loadMore()">更に読み込む</button></div>`;
    },

    async play(video) {
        if(!video) return;
        this.isShortsMode = false;
        this.currentPlayVideo = video;
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        await YT.refreshEduKey();
        window.scrollTo(0,0);
        
        const isLiked = Storage.getLikes().some(x => x.id === videoId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-container">
                <div class="player-main">
                    <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;"><iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe></div>
                    <div style="padding:15px 0;">
                        <h2 style="font-size:18px;">${video.snippet.title}</h2>
                        <div class="action-bar">
                            <button class="icon-btn" id="like-btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '🤍'} いいね</button>
                            <button class="icon-btn" onclick="Actions.openPlaylistModal()">➕ 保存</button>
                            <button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')">登録</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px; margin-top:15px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                            <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                            <strong>${video.snippet.channelTitle}</strong>
                        </div>
                    </div>
                </div>
                <div id="related-side" style="flex:1; min-width:300px;">
                    <p style="font-weight:bold; margin-bottom:10px;">関連動画</p>
                    <div id="related-list"></div>
                </div>
            </div>`;
        this.updateSubButton(video.snippet.channelId);
        Storage.addHistory({ id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url, channelId: video.snippet.channelId, channelTitle: video.snippet.channelTitle });
        this.loadMoreRelated(true);
    },

    // --- いいねロジック ---
    handleLike() {
        const v = this.currentPlayVideo;
        const vId = v.id.videoId || (typeof v.id === 'string' ? v.id : v.id.resourceId?.videoId);
        Storage.toggleLike({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        const isLiked = Storage.getLikes().some(x => x.id === vId);
        document.getElementById('like-btn').innerHTML = (isLiked ? '❤️' : '🤍') + ' いいね';
    },

    showLikes() {
        this.isShortsMode = false;
        const likes = Storage.getLikes();
        this.currentList = likes.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>いいねした動画</h2></div>`;
        this.renderMain();
    },

    // --- プレイリストロジック ---
    showPlaylists() {
        this.isShortsMode = false;
        const p = Storage.getPlaylists();
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>プレイリスト</h2><div class="grid" id="playlist-grid"></div></div>`;
        const grid = document.getElementById('playlist-grid');
        grid.innerHTML = p.map(list => `
            <div class="v-card" style="padding:20px; text-align:center;">
                <button class="delete-btn" onclick="event.stopPropagation(); Actions.handleDeletePlaylist('${list.name}')">削除</button>
                <div onclick="Actions.viewPlaylist('${list.name}')">
                    <div style="font-size:40px; margin-bottom:10px;">📁</div>
                    <h3 style="margin:0;">${list.name}</h3>
                    <p style="color:#aaa;">${list.videos.length}本の動画</p>
                </div>
            </div>
        `).join('');
    },

    handleDeletePlaylist(name) {
        if(confirm(`プレイリスト「${name}」を削除しますか？`)) {
            Storage.deletePlaylist(name);
            this.showPlaylists();
        }
    },

    viewPlaylist(name) {
        const list = Storage.getPlaylists().find(x => x.name === name);
        if(!list) return;
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>${name}</h2></div><div id="p-list-grid" class="grid"></div>`;
        const grid = document.getElementById('p-list-grid');
        grid.innerHTML = list.videos.map((v, i) => `
            <div class="v-card" onclick="Actions.playPlaylistVideo('${name}', ${i})">
                <button class="delete-btn" onclick="event.stopPropagation(); Actions.removeFromPlaylist('${name}', '${v.id}')">✖</button>
                <div class="thumb-container"><img src="${v.thumb}" class="main-thumb"></div>
                <div class="v-text"><h3>${v.title}</h3><p>${v.channelTitle}</p></div>
            </div>
        `).join('');
    },

    removeFromPlaylist(pName, vId) {
        Storage.removeFromPlaylist(pName, vId);
        this.viewPlaylist(pName);
    },

    playPlaylistVideo(pName, index) {
        const list = Storage.getPlaylists().find(x => x.name === pName);
        const v = list.videos[index];
        this.play({ id: v.id, snippet: { title: v.title, thumbnails: { high: { url: v.thumb } }, channelTitle: v.channelTitle, channelId: '' } });
    },

    openPlaylistModal() {
        document.getElementById('modal-overlay').style.display = 'flex';
        const selector = document.getElementById('playlist-selector');
        const p = Storage.getPlaylists();
        selector.innerHTML = p.map(list => `<div style="padding:10px; border-bottom:1px solid #333; cursor:pointer;" onclick="Actions.addCurrentToPlaylist('${list.name}')">${list.name}</div>`).join('');
    },

    closeModal() { document.getElementById('modal-overlay').style.display = 'none'; },

    createNewPlaylist() {
        const name = document.getElementById('new-playlist-name').value;
        if(name) {
            Storage.createPlaylist(name);
            document.getElementById('new-playlist-name').value = '';
            this.openPlaylistModal();
        }
    },

    addCurrentToPlaylist(pName) {
        const v = this.currentPlayVideo;
        const vId = v.id.videoId || (typeof v.id === 'string' ? v.id : v.id.resourceId?.videoId);
        Storage.addToPlaylist(pName, { id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        alert('追加しました');
        this.closeModal();
    },

    // --- 既存機能 ---
    async loadMore() {
        if(this.currentView === "home" || this.currentView === "search") this.search(true);
        else if(this.currentView === "channel") {
            const { id, name, type, order } = this.currentChannelInfo;
            this.openChannel(id, name, type, order, true);
        }
    },

    async loadMoreRelated(isNew = false) {
        const q = this.currentPlayVideo.snippet.title.substring(0, 15);
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 20 });
        const html = data.items.map((v) => `<div class="side-card" onclick="Actions.playFromSearch('${v.id.videoId}')"><img src="${v.snippet.thumbnails.medium.url}" style="width:120px; border-radius:8px;"><div><h4 style="font-size:13px; margin:0;">${v.snippet.title}</h4></div></div>`).join('');
        document.getElementById('related-list').innerHTML = html;
    },

    playFromSearch(id) { this.play({ id: id, snippet: { title: 'Video', thumbnails: { high: { url: '' } }, channelTitle: 'Channel' } }); },
    playFromList(i) { this.play(this.currentList[i]); },
    handleSub(id, name) { Storage.toggleSub({id, name}); this.updateSubButton(id); },
    updateSubButton(id) { const b = document.getElementById('sub-btn'); if(b) b.innerText = Storage.getSubs().some(x=>x.id===id) ? "登録済み" : "チャンネル登録"; },
    async fetchChannelIcons(ids) { if(!ids) return; const data = await YT.fetchAPI('channels', {id:ids, part:'snippet'}); if(data.items) data.items.forEach(ch => this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url); },
    showShortsFeed() { this.isShortsMode = true; this.search(); },
    showSubs() {
        this.isShortsMode = false;
        const s = Storage.getSubs();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録中のチャンネル</h2><div class="grid" id="subs-list"></div></div>`;
        document.getElementById('subs-list').innerHTML = s.map(ch => `<div class="v-card" style="padding:15px; text-align:center;" onclick="Actions.openChannel('${ch.id}', '${ch.name}')"><img src="${this.channelIcons[ch.id] || ''}" style="width:80px; height:80px; border-radius:50%; margin-bottom:10px;"><h3>${ch.name}</h3></div>`).join('');
    },
    showHistory() {
        this.isShortsMode = false;
        const h = Storage.getHistory();
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>履歴</h2></div>`;
        this.renderMain();
    }
};

window.onload = () => Actions.init();
