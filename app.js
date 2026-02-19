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
            if (data?.key) this.currentEduKey = data.key;
        } catch (e) { console.log("Key update failed"); }
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
            autoplay: 1, origin: "https://create.kahoot.it",
            embed_config: JSON.stringify({ enc: this.currentEduKey, hideTitle: true }),
            rel: 0, modestbranding: 1, enablejsapi: 1
        });
        return `https://www.youtubeeducation.com/embed/${id}?${p.toString()}`;
    }
};

const Storage = {
    get(k) { return JSON.parse(localStorage.getItem(k)) || []; },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    addHistory(v) {
        let h = this.get('yt_history');
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50);
        this.set('yt_history', h);
    },
    toggleSub(c) {
        let s = this.get('yt_subs');
        const idx = s.findIndex(x => x.id === c.id);
        if (idx > -1) s.splice(idx, 1); else s.push(c);
        this.set('yt_subs', s);
    },
    toggleLike(v) {
        let l = this.get('yt_likes');
        const idx = l.findIndex(x => x.id === v.id);
        if (idx > -1) l.splice(idx, 1); else l.push(v);
        this.set('yt_likes', l);
    },
    createPlaylist(name) {
        let p = this.get('yt_playlists');
        if (!p.find(x => x.name === name)) {
            p.push({ name, videos: [] });
            this.set('yt_playlists', p);
        }
    }
};

const Actions = {
    currentList: [], relatedList: [], channelIcons: {},
    nextToken: "", currentView: "home", isDarkMode: true, currentPlayVideo: null,

    init() {
        this.isDarkMode = localStorage.getItem('yt_theme') !== 'light';
        this.applyTheme();
        this.renderSidebar();
        YT.refreshEduKey().then(() => this.goHome());

        const searchInput = document.getElementById('search-input');
        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.search(); searchInput.blur(); }
        };
        document.getElementById('search-btn').onclick = () => this.search();
        document.getElementById('theme-toggle-btn').onclick = () => this.toggleTheme();
        
        // 作成ボタンのバインド
        const btn = document.getElementById('create-playlist-btn');
        if (btn) btn.onclick = () => this.createNewPlaylist();
    },

    applyTheme() {
        const r = document.documentElement.style;
        const dark = this.isDarkMode;
        r.setProperty('--bg-color', dark ? '#0f0f0f' : '#ffffff');
        r.setProperty('--text-color', dark ? '#ffffff' : '#0f0f0f');
        r.setProperty('--card-bg', dark ? 'rgba(128,128,128,0.1)' : '#f2f2f2');
        r.setProperty('--border-color', dark ? '#333' : '#ccc');
        document.getElementById('theme-toggle-btn').innerText = dark ? '🌙' : '☀️';
    },

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('yt_theme', this.isDarkMode ? 'dark' : 'light');
        this.applyTheme();
    },

    renderSidebar() {
        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome()"><div>🏠</div>ホーム</div>
            <div class="nav-item" onclick="Actions.showShorts()"><div>⚡</div>ショート</div>
            <div class="nav-item" onclick="Actions.showLikes()"><div>👍</div>いいね</div>
            <div class="nav-item" onclick="Actions.showPlaylists()"><div>📁</div>リスト</div>
            <div class="nav-item" onclick="Actions.showSubs()"><div>🔔</div>登録中</div>
            <div class="nav-item" onclick="Actions.showHistory()"><div>🕒</div>履歴</div>
        `;
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
        // 💡 どの画面からでも検索できるように修正
        if (!isMore) this.currentView = "search";
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 24, pageToken: isMore ? this.nextToken : "" });
        this.nextToken = data.nextPageToken;
        if (isMore) this.currentList.push(...data.items);
        else this.currentList = data.items;
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
        data.items?.forEach(ch => this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url);
        this.updateIconsOnUI();
    },

    updateIconsOnUI() {
        document.querySelectorAll('.ch-icon-img').forEach(img => {
            const chId = img.dataset.chid;
            if (this.channelIcons[chId]) img.src = this.channelIcons[chId];
        });
    },

    renderGrid() {
        const container = document.getElementById('view-container');
        const chIds = [...new Set(this.currentList.map(i => i.snippet?.channelId))].filter(id => id && !this.channelIcons[id]).join(',');
        this.fetchChannelIcons(chIds);

        const html = this.currentList.map((item, i) => {
            const snip = item.snippet;
            if(!snip) return '';
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
        if (this.currentView === "home" || this.currentView === "search") this.search(true);
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
                            <div style="flex:1;"><strong>${video.snippet.channelTitle}</strong></div>
                            <button class="sub-btn ${isSubbed ? 'active' : ''}" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                                ${isSubbed ? '登録済み' : 'チャンネル登録'}
                            </button>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="btn" id="like-btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '🤍'} いいね</button>
                            <button class="btn" onclick="Actions.openPlaylistModal()">➕ 保存</button>
                        </div>
                    </div>
                </div>
                <div class="related-area"><h3>関連動画</h3><div id="related-list"></div></div>
            </div>`;
        
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
        this.loadRelated(video.snippet.title);
    },

    async loadRelated(q) {
        const data = await YT.fetchAPI('search', { q: q.substring(0, 15), part: 'snippet', type: 'video', maxResults: 15 });
        this.relatedList = data.items || [];
        document.getElementById('related-list').innerHTML = this.relatedList.map((v, i) => `
            <div class="side-card" onclick="Actions.play(Actions.relatedList[${i}])">
                <img src="${v.snippet.thumbnails.medium.url}">
                <div><h4>${v.snippet.title}</h4><p style="font-size:11px; color:#aaa;">${v.snippet.channelTitle}</p></div>
            </div>`).join('');
    },

    // 💡 チャンネル表示を復活
    showSubs() {
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => `
            <div class="v-card" style="padding:20px; text-align:center;">
                <img src="${this.channelIcons[ch.id] || ''}" style="width:80px; height:80px; border-radius:50%; margin-bottom:10px;">
                <h3>${ch.name}</h3>
                <button class="sub-btn active" onclick="Actions.handleSub('${ch.id}', '${ch.name}'); Actions.showSubs();">登録済み</button>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録中のチャンネル</h2><div class="grid">${html}</div></div>`;
    },

    handleSub(id, name) {
        Storage.toggleSub({ id, name });
        if (this.currentPlayVideo) this.play(this.currentPlayVideo);
    },

    // 💡 プレイリスト表示・開けない問題を修正
    showPlaylists() {
        const p = Storage.get('yt_playlists');
        const html = p.map(l => `
            <div class="v-card" style="padding:20px; text-align:center;" onclick="Actions.viewList('${l.name}')">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.deleteList('${l.name}')">削除</span>
                <div style="font-size:60px;">📁</div>
                <h3>${l.name}</h3><p>${l.videos.length}本の動画</p>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>マイプレイリスト</h2><div class="grid">${html}</div></div>`;
    },

    viewList(name) {
        const l = Storage.get('yt_playlists').find(x=>x.name===name);
        if(!l) return;
        const html = l.videos.map((v, i) => `
            <div class="v-card" onclick="Actions.playPlaylistVideo('${name}', ${i})">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.removeVideo('${name}', '${v.id}')">✖</span>
                <div class="thumb-container"><img src="${v.thumb}" class="main-thumb"></div>
                <div class="v-text"><h3>${v.title}</h3></div>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>${name}</h2><div class="grid">${html}</div></div>`;
    },

    // 💡 モーダル・作成ボタン関連
    openPlaylistModal() {
        document.getElementById('modal-overlay').style.display = 'flex';
        const p = Storage.get('yt_playlists');
        document.getElementById('playlist-selector').innerHTML = p.map(l => `
            <div class="p-item" style="padding:15px; border-bottom:1px solid #333; cursor:pointer;" onclick="Actions.addCurrentToList('${l.name}')">${l.name}</div>
        `).join('') || '<p style="padding:15px;">リストがありません</p>';
    },
    closeModal() { document.getElementById('modal-overlay').style.display = 'none'; },
    closeModalOutside(e) { if(e.target.id === 'modal-overlay') this.closeModal(); },

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
            list.videos.push({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
            Storage.set('yt_playlists', p);
        }
        this.closeModal();
    },

    deleteList(name) { if(confirm('リストを削除しますか？')) { let p = Storage.get('yt_playlists').filter(x=>x.name!==name); Storage.set('yt_playlists', p); this.showPlaylists(); } },
    removeVideo(pName, vId) {
        let p = Storage.get('yt_playlists');
        const list = p.find(x => x.name === pName);
        if(list) list.videos = list.videos.filter(x => x.id !== vId);
        Storage.set('yt_playlists', p);
        this.viewList(pName);
    },
    playPlaylistVideo(pName, i) {
        const v = Storage.get('yt_playlists').find(x=>x.name===pName).videos[i];
        this.play({ id: v.id, snippet: { title: v.title, thumbnails: { high: { url: v.thumb } }, channelTitle: v.channelTitle, channelId: '' } });
    },

    handleLike() {
        const v = this.currentPlayVideo;
        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        Storage.toggleLike({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        const isLiked = Storage.get('yt_likes').some(x => x.id === vId);
        document.getElementById('like-btn').innerText = (isLiked ? '❤️' : '🤍') + ' いいね';
    },

    showLikes() {
        const l = Storage.get('yt_likes');
        this.currentList = l.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid();
    },

    showHistory() {
        const h = Storage.get('yt_history');
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid();
    }
};

window.onload = () => Actions.init();
