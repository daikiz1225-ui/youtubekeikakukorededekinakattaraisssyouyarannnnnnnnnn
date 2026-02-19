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
            if (data?.key) {
                this.currentEduKey = data.key;
            }
        } catch (e) {
            console.error("Key refresh failed");
        }
    },

    getCurrentKey() {
        const idx = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[idx];
    },

    async fetchAPI(endpoint, params) {
        const q = new URLSearchParams({ ...params, key: this.getCurrentKey() });
        const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${q}`);
        
        if (res.status === 403) {
            let next = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
            if (next < this.keys.length) {
                localStorage.setItem('yt_key_index', next);
                return this.fetchAPI(endpoint, params);
            }
        }
        return await res.json();
    },

    getEmbedUrl(id, isShort = false) {
        const p = new URLSearchParams({
            autoplay: 1,
            origin: "https://create.kahoot.it",
            embed_config: JSON.stringify({ enc: this.currentEduKey, hideTitle: true }),
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1
        });
        if (isShort) {
            p.append('loop', '1');
            p.append('playlist', id);
        }
        return `https://www.youtubeeducation.com/embed/${id}?${p.toString()}`;
    }
};

const Storage = {
    get(k) {
        return JSON.parse(localStorage.getItem(k)) || [];
    },
    set(k, v) {
        localStorage.setItem(k, JSON.stringify(v));
    },
    addHistory(v) {
        let h = this.get('yt_history');
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50);
        this.set('yt_history', h);
    },
    toggleSub(c) {
        let s = this.get('yt_subs');
        const idx = s.findIndex(x => x.id === c.id);
        if (idx > -1) {
            s.splice(idx, 1);
        } else {
            s.push(c);
        }
        this.set('yt_subs', s);
    },
    toggleLike(v) {
        let l = this.get('yt_likes');
        const idx = l.findIndex(x => x.id === v.id);
        if (idx > -1) {
            l.splice(idx, 1);
        } else {
            l.push(v);
        }
        this.set('yt_likes', l);
    },
    createPlaylist(name) {
        let p = this.get('yt_playlists');
        if (!p.find(x => x.name === name)) {
            p.push({ name: name, videos: [] });
            this.set('yt_playlists', p);
        }
    }
};

const Actions = {
    currentList: [],
    relatedList: [],
    channelIcons: {},
    nextToken: "",
    currentView: "home",
    currentChId: "",
    currentChTitle: "",
    currentSearch: "",
    isDarkMode: true,
    currentPlayVideo: null,

    init() {
        this.isDarkMode = localStorage.getItem('yt_theme') !== 'light';
        this.applyTheme();
        
        const searchInput = document.getElementById('search-input');
        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.search();
                searchInput.blur();
            }
        };

        document.getElementById('search-btn').onclick = () => this.search();
        document.getElementById('theme-toggle-btn').onclick = () => this.toggleTheme();
        document.getElementById('create-playlist-btn').onclick = () => this.createNewPlaylist();

        YT.refreshEduKey().then(() => {
            this.goHome();
        });
    },

    applyTheme() {
        const r = document.documentElement.style;
        if (this.isDarkMode) {
            r.setProperty('--bg-color', '#0f0f0f');
            r.setProperty('--text-color', '#ffffff');
            r.setProperty('--card-bg', 'rgba(128,128,128,0.1)');
            r.setProperty('--border-color', '#333');
            document.getElementById('theme-toggle-btn').innerText = '🌙';
        } else {
            r.setProperty('--bg-color', '#ffffff');
            r.setProperty('--text-color', '#0f0f0f');
            r.setProperty('--card-bg', '#f2f2f2');
            r.setProperty('--border-color', '#ccc');
            document.getElementById('theme-toggle-btn').innerText = '☀️';
        }
    },

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('yt_theme', this.isDarkMode ? 'dark' : 'light');
        this.applyTheme();
    },

    async goHome() {
        this.currentView = "home";
        this.currentSearch = "";
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.nextToken = data.nextPageToken;
        this.currentList = data.items || [];
        this.renderGrid();
    },

    async showShorts() {
        this.currentView = "shorts";
        this.currentSearch = "#Shorts";
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 24 });
        this.nextToken = data.nextPageToken;
        this.currentList = data.items || [];
        this.renderGrid();
    },

    async search(isMore = false) {
        let q = document.getElementById('search-input').value || this.currentSearch;
        if (!q) return;

        if (this.currentView === "shorts" && !q.includes("#Shorts")) {
            q += " #Shorts";
        }
        this.currentSearch = q;

        if (!isMore) {
            if (this.currentView !== "shorts") {
                this.currentView = "search";
            }
        }

        const params = {
            q: q,
            part: 'snippet',
            type: 'video',
            maxResults: 24,
            pageToken: isMore ? this.nextToken : ""
        };
        
        const data = await YT.fetchAPI('search', params);
        this.nextToken = data.nextPageToken;
        
        if (isMore) {
            this.currentList.push(...data.items);
        } else {
            this.currentList = data.items;
        }
        this.renderGrid();
    },

    async loadMore() {
        if (this.currentView === "home") {
            const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24, pageToken: this.nextToken });
            this.nextToken = data.nextPageToken;
            this.currentList.push(...data.items);
            this.renderGrid();
        } else if (this.currentView === "search" || this.currentView === "shorts") {
            this.search(true);
        } else if (this.currentView === "channel") {
            const params = { channelId: this.currentChId, part: 'snippet', maxResults: 24, type: 'video', pageToken: this.nextToken };
            const data = await YT.fetchAPI('search', params);
            this.nextToken = data.nextPageToken;
            this.currentList.push(...data.items);
            this.renderGrid();
        }
    },

    async showChannel(id, title, type = 'date') {
        this.currentView = "channel";
        this.currentChId = id;
        this.currentChTitle = title;
        
        let params = {
            channelId: id,
            part: 'snippet',
            maxResults: 24,
            type: 'video'
        };
        
        if (type === 'viewCount') {
            params.order = 'viewCount';
        } else {
            params.order = 'date';
        }
        
        const data = await YT.fetchAPI('search', params);
        this.nextToken = data.nextPageToken;
        this.currentList = data.items || [];
        
        const headerHtml = `
            <div class="channel-header">
                <h2>${title}</h2>
                <div class="tab-bar">
                    <div class="tab-item ${type === 'date' ? 'active' : ''}" onclick="Actions.showChannel('${id}', '${title}', 'date')">最新順</div>
                    <div class="tab-item ${type === 'viewCount' ? 'active' : ''}" onclick="Actions.showChannel('${id}', '${title}', 'viewCount')">人気順</div>
                    <div class="tab-item" onclick="Actions.showChannelPlaylists('${id}')">再生リスト</div>
                </div>
            </div>`;
        this.renderGrid(headerHtml);
    },

    async showChannelPlaylists(id) {
        const data = await YT.fetchAPI('playlists', { channelId: id, part: 'snippet', maxResults: 24 });
        const playlists = data.items || [];
        
        const html = playlists.map(p => `
            <div class="v-card" onclick="Actions.viewExternalList('${p.id}', '${p.snippet.title.replace(/'/g, "\\'")}')">
                <div class="thumb-container">
                    <img src="${p.snippet.thumbnails.high.url}" class="main-thumb">
                </div>
                <div class="v-text">
                    <h3>${p.snippet.title}</h3>
                </div>
            </div>`).join('');
        
        document.getElementById('view-container').innerHTML = `
            <div class="channel-header">
                <h2>${this.currentChTitle} - 再生リスト</h2>
                <div class="tab-bar">
                    <div class="tab-item" onclick="Actions.showChannel('${id}', '${this.currentChTitle}', 'date')">動画に戻る</div>
                </div>
            </div>
            <div class="grid">${html}</div>`;
    },

    async viewExternalList(listId, title) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: listId, part: 'snippet', maxResults: 50 });
        this.currentList = data.items || [];
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    async fetchChannelIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if (data.items) {
            data.items.forEach(ch => {
                this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url;
            });
        }
        this.updateIconsOnUI();
    },

    updateIconsOnUI() {
        document.querySelectorAll('.ch-icon-img').forEach(img => {
            const chId = img.dataset.chid;
            if (this.channelIcons[chId]) {
                img.src = this.channelIcons[chId];
            }
        });
    },

    renderGrid(headerHtml = "") {
        const container = document.getElementById('view-container');
        window.scrollTo(0, 0);

        const chIds = [...new Set(this.currentList.map(i => i.snippet?.channelId))].filter(id => id && !this.channelIcons[id]).join(',');
        this.fetchChannelIcons(chIds);

        const html = this.currentList.map((item, i) => {
            const snip = item.snippet;
            if (!snip) return '';
            return `
            <div class="v-card">
                <div class="thumb-container">
                    <img src="${snip.thumbnails.high.url}" class="main-thumb" onclick="Actions.play(Actions.currentList[${i}])">
                    <img src="${this.channelIcons[snip.channelId] || ''}" class="ch-icon-img" data-chid="${snip.channelId}" onclick="event.stopPropagation(); Actions.showChannel('${snip.channelId}', '${snip.channelTitle.replace(/'/g, "\\'")}')">
                </div>
                <div class="v-text" onclick="Actions.play(Actions.currentList[${i}])">
                    <h3>${snip.title}</h3>
                    <p>${snip.channelTitle}</p>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div style="padding: 10px 20px 0 20px;">${headerHtml}</div>
            <div class="grid">${html}</div>
            <div style="text-align:center; padding-bottom: 50px;">
                <button class="btn primary-btn" onclick="Actions.loadMore()">更に読み込む</button>
            </div>`;
        this.updateIconsOnUI();
    },

    play(video) {
        if (!video) return;
        this.currentPlayVideo = video;
        const vId = (typeof video.id === 'string') ? video.id : (video.id.videoId || video.id.resourceId?.videoId);
        if (!vId) return;

        if (this.currentView === "shorts") {
            return this.playShort(vId);
        }

        window.scrollTo(0, 0);
        const isLiked = Storage.get('yt_likes').some(x => x.id === vId);
        const isSubbed = Storage.get('yt_subs').some(x => x.id === video.snippet.channelId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                        <iframe src="${YT.getEmbedUrl(vId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                    </div>
                    <div style="padding:15px 0;">
                        <h2 style="font-size:18px;">${video.snippet.title}</h2>
                        <div style="display:flex; align-items:center; gap:15px; margin:15px 0;">
                            <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:45px; height:45px; border-radius:50%; cursor:pointer;" onclick="Actions.showChannel('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g, "\\'")}')">
                            <div style="flex:1;">
                                <strong>${video.snippet.channelTitle}</strong>
                            </div>
                            <button class="sub-btn ${isSubbed ? 'active' : ''}" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g, "\\'")}')">
                                ${isSubbed ? '登録済み' : 'チャンネル登録'}
                            </button>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="btn" id="like-btn" onclick="Actions.handleLike()">
                                ${isLiked ? '❤️' : '🤍'} いいね
                            </button>
                            <button class="btn" onclick="Actions.openPlaylistModal()">
                                ➕ 保存
                            </button>
                        </div>
                    </div>
                </div>
                <div class="related-area">
                    <h3>関連動画</h3>
                    <div id="related-list"></div>
                </div>
            </div>`;
        
        Storage.addHistory({
            id: vId,
            title: video.snippet.title,
            thumb: video.snippet.thumbnails.high.url,
            channelTitle: video.snippet.channelTitle
        });

        this.loadRelated(video.snippet.title);
    },

    playShort(id) {
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container">
                <div class="shorts-wrapper">
                    <iframe src="${YT.getEmbedUrl(id, true)}" style="width:100%; height:100%; border:none; border-radius:15px;" allowfullscreen allow="autoplay"></iframe>
                    <div style="position:absolute; bottom:20px; right:-60px; display:flex; flex-direction:column; gap:20px;">
                        <button class="btn" style="border-radius:50%; width:50px; height:50px; padding:0;" onclick="Actions.handleLike()">❤️</button>
                        <button class="btn" style="border-radius:50%; width:50px; height:50px; padding:0;" onclick="Actions.openPlaylistModal()">➕</button>
                    </div>
                </div>
            </div>`;
    },

    async loadRelated(q) {
        const data = await YT.fetchAPI('search', { q: q.substring(0, 15), part: 'snippet', type: 'video', maxResults: 15 });
        this.relatedList = data.items || [];
        const container = document.getElementById('related-list');
        if (container) {
            container.innerHTML = this.relatedList.map((v, i) => `
                <div class="side-card" onclick="Actions.play(Actions.relatedList[${i}])">
                    <img src="${v.snippet.thumbnails.medium.url}">
                    <div>
                        <h4>${v.snippet.title}</h4>
                        <p style="font-size:11px; color:#aaa;">${v.snippet.channelTitle}</p>
                    </div>
                </div>`).join('');
        }
    },

    showSubs() {
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => `
            <div class="v-card" style="padding:20px; text-align:center;">
                <img src="${this.channelIcons[ch.id] || ''}" style="width:80px; height:80px; border-radius:50%; margin-bottom:10px; cursor:pointer;" onclick="Actions.showChannel('${ch.id}', '${ch.name.replace(/'/g, "\\'")}')">
                <h3>${ch.name}</h3>
                <button class="sub-btn active" onclick="Actions.handleSub('${ch.id}', '${ch.name.replace(/'/g, "\\'")}')">
                    登録済み
                </button>
            </div>`).join('');
        
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h2>登録中のチャンネル</h2>
                <div class="grid">${html}</div>
            </div>`;
    },

    handleSub(id, name) {
        Storage.toggleSub({ id, name });
        if (this.currentView === "subs") {
            this.showSubs();
        } else if (this.currentPlayVideo && this.currentPlayVideo.snippet.channelId === id) {
            this.play(this.currentPlayVideo);
        }
    },

    showPlaylists() {
        this.currentView = "playlists";
        const p = Storage.get('yt_playlists');
        const html = p.map(l => `
            <div class="v-card" style="padding:20px; text-align:center;" onclick="Actions.viewList('${l.name.replace(/'/g, "\\'")}')">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.deleteList('${l.name.replace(/'/g, "\\'")}')">削除</span>
                <div style="font-size:60px;">📁</div>
                <h3>${l.name}</h3>
                <p>${l.videos.length}本の動画</p>
            </div>`).join('');
        
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h2>マイプレイリスト</h2>
                <div class="grid">${html}</div>
            </div>`;
    },

    viewList(name) {
        const allPlaylists = Storage.get('yt_playlists');
        const list = allPlaylists.find(x => x.name === name);
        if (!list) return;

        const html = list.videos.map((v, i) => `
            <div class="v-card" onclick="Actions.playPlaylistVideo('${name.replace(/'/g, "\\'")}', ${i})">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.removeVideo('${name.replace(/'/g, "\\'")}', '${v.id}')">✖</span>
                <div class="thumb-container">
                    <img src="${v.thumb}" class="main-thumb">
                </div>
                <div class="v-text">
                    <h3>${v.title}</h3>
                    <p>${v.channelTitle}</p>
                </div>
            </div>`).join('');
        
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h2>${name}</h2>
                <div class="grid">${html}</div>
            </div>`;
    },

    deleteList(name) {
        if (confirm(`プレイリスト「${name}」を削除しますか？`)) {
            let p = Storage.get('yt_playlists').filter(x => x.name !== name);
            Storage.set('yt_playlists', p);
            this.showPlaylists();
        }
    },

    removeVideo(pName, vId) {
        let p = Storage.get('yt_playlists');
        const list = p.find(x => x.name === pName);
        if (list) {
            list.videos = list.videos.filter(x => x.id !== vId);
            Storage.set('yt_playlists', p);
            this.viewList(pName);
        }
    },

    playPlaylistVideo(pName, i) {
        const list = Storage.get('yt_playlists').find(x => x.name === pName);
        if (list && list.videos[i]) {
            const v = list.videos[i];
            this.play({
                id: v.id,
                snippet: {
                    title: v.title,
                    thumbnails: { high: { url: v.thumb } },
                    channelTitle: v.channelTitle,
                    channelId: ''
                }
            });
        }
    },

    openPlaylistModal() {
        document.getElementById('modal-overlay').style.display = 'flex';
        const playlists = Storage.get('yt_playlists');
        const selector = document.getElementById('playlist-selector');
        
        selector.innerHTML = playlists.map(l => `
            <div class="p-item" onclick="Actions.addCurrentToList('${l.name.replace(/'/g, "\\'")}')">${l.name}</div>
        `).join('') || '<p style="padding:15px;">プレイリストがありません</p>';
    },

    closeModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    },

    closeModalOutside(e) {
        if (e.target.id === 'modal-overlay') {
            this.closeModal();
        }
    },

    createNewPlaylist() {
        const input = document.getElementById('new-playlist-name');
        const name = input.value.trim();
        if (name) {
            Storage.createPlaylist(name);
            input.value = '';
            this.openPlaylistModal();
        }
    },

    addCurrentToList(pName) {
        const v = this.currentPlayVideo;
        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        
        let p = Storage.get('yt_playlists');
        const list = p.find(x => x.name === pName);
        
        if (list && !list.videos.find(x => x.id === vId)) {
            list.videos.push({
                id: vId,
                title: v.snippet.title,
                thumb: v.snippet.thumbnails.high.url,
                channelTitle: v.snippet.channelTitle
            });
            Storage.set('yt_playlists', p);
        }
        this.closeModal();
    },

    handleLike() {
        const v = this.currentPlayVideo;
        if (!v) return;
        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        
        Storage.toggleLike({
            id: vId,
            title: v.snippet.title,
            thumb: v.snippet.thumbnails.high.url,
            channelTitle: v.snippet.channelTitle
        });
        
        const isLiked = Storage.get('yt_likes').some(x => x.id === vId);
        const btn = document.getElementById('like-btn');
        if (btn) {
            btn.innerText = (isLiked ? '❤️' : '🤍') + ' いいね';
        }
    },

    showLikes() {
        this.currentView = "likes";
        const likes = Storage.get('yt_likes');
        this.currentList = likes.map(x => ({
            id: x.id,
            snippet: {
                title: x.title,
                thumbnails: { high: { url: x.thumb } },
                channelTitle: x.channelTitle
            }
        }));
        this.renderGrid("<h2>いいねした動画</h2>");
    },

    showHistory() {
        this.currentView = "history";
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({
            id: x.id,
            snippet: {
                title: x.title,
                thumbnails: { high: { url: x.thumb } },
                channelTitle: x.channelTitle
            }
        }));
        this.renderGrid("<h2>再生履歴</h2>");
    }
};

window.onload = () => Actions.init();
