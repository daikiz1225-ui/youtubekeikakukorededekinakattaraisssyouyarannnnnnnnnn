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
            console.error("Failed to refresh EduKey");
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

    getEmbedUrl(id) {
        const p = new URLSearchParams({
            autoplay: 1,
            origin: "https://create.kahoot.it",
            embed_config: JSON.stringify({ enc: this.currentEduKey, hideTitle: true }),
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1
        });
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
    isDarkMode: true,
    currentPlayVideo: null,

    init() {
        this.isDarkMode = localStorage.getItem('yt_theme') !== 'light';
        this.applyTheme();
        
        // 検索窓のEnterキー動作修正 (iPad対応 & 検索トリガー)
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
        
        // モーダル内作成ボタンのバインド
        const createBtn = document.getElementById('create-playlist-btn');
        if (createBtn) {
            createBtn.onclick = () => this.createNewPlaylist();
        }

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
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.nextToken = data.nextPageToken;
        this.currentList = data.items || [];
        this.renderGrid();
    },

    async search(isMore = false) {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        
        if (!isMore) {
            this.currentView = "search";
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

    async showShorts() {
        this.currentView = "shorts";
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid();
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

    renderGrid() {
        const container = document.getElementById('view-container');
        window.scrollTo(0, 0);

        const chIds = [...new Set(this.currentList.map(i => i.snippet?.channelId))].filter(id => id && !this.channelIcons[id]).join(',');
        this.fetchChannelIcons(chIds);

        const html = this.currentList.map((item, i) => {
            const snip = item.snippet;
            if (!snip) return '';
            return `
            <div class="v-card" onclick="Actions.play(Actions.currentList[${i}])">
                <div class="thumb-container">
                    <img src="${snip.thumbnails.high.url}" class="main-thumb">
                    <img src="" class="ch-icon-img" data-chid="${snip.channelId}">
                </div>
                <div class="v-text">
                    <h3>${snip.title}</h3>
                    <p>${snip.channelTitle}</p>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div class="grid">${html}</div>
            <div style="text-align:center; padding-bottom: 50px;">
                <button class="btn primary-btn" onclick="Actions.loadMore()">更に読み込む</button>
            </div>`;
        this.updateIconsOnUI();
    },

    async loadMore() {
        if (this.currentView === "home" || this.currentView === "search") {
            this.search(true);
        }
    },

    async play(video) {
        if (!video) return;
        this.currentPlayVideo = video;
        const vId = (typeof video.id === 'string') ? video.id : (video.id.videoId || video.id.resourceId?.videoId);
        if (!vId) return;

        await YT.refreshEduKey();
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
                            <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:45px; height:45px; border-radius:50%;">
                            <div style="flex:1;">
                                <strong>${video.snippet.channelTitle}</strong>
                            </div>
                            <button class="sub-btn ${isSubbed ? 'active' : ''}" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
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
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => `
            <div class="v-card" style="padding:20px; text-align:center;">
                <img src="${this.channelIcons[ch.id] || ''}" style="width:80px; height:80px; border-radius:50%; margin-bottom:10px;">
                <h3>${ch.name}</h3>
                <button class="sub-btn active" onclick="Actions.handleSub('${ch.id}', '${ch.name}'); Actions.showSubs();">
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
        if (this.currentPlayVideo && this.currentPlayVideo.snippet.channelId === id) {
            this.play(this.currentPlayVideo);
        }
    },

    showPlaylists() {
        const p = Storage.get('yt_playlists');
        const html = p.map(l => `
            <div class="v-card" style="padding:20px; text-align:center;" onclick="Actions.viewList('${l.name}')">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.deleteList('${l.name}')">削除</span>
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
        const all = Storage.get('yt_playlists');
        const list = all.find(x => x.name === name);
        if (!list) return;

        const html = list.videos.map((v, i) => `
            <div class="v-card" onclick="Actions.playPlaylistVideo('${name}', ${i})">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.removeVideo('${name}', '${v.id}')">✖</span>
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
            <div class="p-item" onclick="Actions.addCurrentToList('${l.name}')">${l.name}</div>
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
        const likes = Storage.get('yt_likes');
        this.currentList = likes.map(x => ({
            id: x.id,
            snippet: {
                title: x.title,
                thumbnails: { high: { url: x.thumb } },
                channelTitle: x.channelTitle
            }
        }));
        this.renderGrid();
    },

    showHistory() {
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({
            id: x.id,
            snippet: {
                title: x.title,
                thumbnails: { high: { url: x.thumb } },
                channelTitle: x.channelTitle
            }
        }));
        this.renderGrid();
    }
};

window.onload = () => Actions.init();
