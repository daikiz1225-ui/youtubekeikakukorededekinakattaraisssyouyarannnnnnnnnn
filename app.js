/**
 * YouTube Client Premium - app.js
 * 自作プレイリスト機能およびサイドバーの「リスト」項目を完全削除。
 * チャンネル公式再生リスト、ショート移動、iPad最適化を維持。
 */

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
            const response = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await response.json();
            if (data && data.key) this.currentEduKey = data.key;
        } catch (error) {
            console.error("EduKey refresh failed:", error);
        }
    },

    getCurrentKey() {
        const index = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[index];
    },

    rotateKey() {
        let index = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
        if (index >= this.keys.length) index = 0;
        localStorage.setItem('yt_key_index', index);
    },

    async fetchAPI(endpoint, params) {
        const queryParams = new URLSearchParams({ ...params, key: this.getCurrentKey() });
        const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
        try {
            const response = await fetch(url);
            if (response.status === 403) {
                this.rotateKey();
                return this.fetchAPI(endpoint, params);
            }
            if (!response.ok) throw new Error("API error");
            return await response.json();
        } catch (error) {
            console.error(error);
            return { items: [], nextPageToken: "" };
        }
    },

    getEmbedUrl(id, isShort = false) {
        const config = { enc: this.currentEduKey, hideTitle: true };
        const params = new URLSearchParams({
            autoplay: 1,
            origin: "https://create.kahoot.it",
            embed_config: JSON.stringify(config),
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            v: id
        });
        if (isShort) {
            params.append('loop', '1');
            params.append('playlist', id);
        }
        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

const Storage = {
    get(key) {
        const data = localStorage.getItem(key);
        try { return data ? JSON.parse(data) : []; } catch (e) { return []; }
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    addHistory(video) {
        let history = this.get('yt_history');
        history = [video, ...history.filter(item => item.id !== video.id)].slice(0, 50);
        this.set('yt_history', history);
    },
    toggleSub(channel) {
        let subs = this.get('yt_subs');
        const index = subs.findIndex(item => item.id === channel.id);
        if (index > -1) subs.splice(index, 1);
        else subs.push({ id: channel.id, name: channel.name, thumb: channel.thumb || '' });
        this.set('yt_subs', subs);
    },
    toggleLike(video) {
        let likes = this.get('yt_likes');
        const index = likes.findIndex(item => item.id === video.id);
        if (index > -1) likes.splice(index, 1);
        else likes.push(video);
        this.set('yt_likes', likes);
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
    currentSearchTerm: "",
    currentPlayVideo: null,
    currentShortIndex: 0,
    scrollPositions: {},

    init() {
        const searchInput = document.getElementById('search-input');
        // iPad等のEnterキーで検索実行
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.search();
                searchInput.blur();
            }
        });
        document.getElementById('search-btn').onclick = () => this.search();
        YT.refreshEduKey().then(() => this.goHome());
    },

    saveScroll() { this.scrollPositions[this.currentView] = window.scrollY; },
    restoreScroll() { window.scrollTo(0, this.scrollPositions[this.currentView] || 0); },

    async goHome() {
        this.saveScroll();
        this.currentView = "home";
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.nextToken = data.nextPageToken || "";
        this.currentList = data.items || [];
        this.renderGrid();
    },

    async showShorts() {
        this.saveScroll();
        this.currentView = "shorts";
        this.currentSearchTerm = "#Shorts";
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 24, videoDuration: 'short' });
        this.nextToken = data.nextPageToken || "";
        this.currentList = data.items || [];
        this.renderGrid();
    },

    async search(isMore = false) {
        const input = document.getElementById('search-input');
        let q = input.value || this.currentSearchTerm;
        if (!q) return;
        if (this.currentView === "shorts" && !q.includes("#Shorts")) q += " #Shorts";
        this.currentSearchTerm = q;

        if (!isMore) {
            this.saveScroll();
            if (this.currentView !== "shorts") this.currentView = "search";
            window.scrollTo(0, 0);
        }

        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 24, pageToken: isMore ? this.nextToken : "" });
        this.nextToken = data.nextPageToken || "";
        if (isMore) this.currentList.push(...data.items);
        else this.currentList = data.items || [];
        this.renderGrid();
    },

    async loadMore() {
        if (!this.nextToken) return;
        if (this.currentView === "home") {
            const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24, pageToken: this.nextToken });
            this.nextToken = data.nextPageToken || "";
            this.currentList.push(...data.items);
            this.renderGrid();
        } else if (this.currentView === "channel") {
            this.showChannel(this.currentChId, this.currentChTitle, 'date', true);
        } else {
            this.search(true);
        }
    },

    async showChannel(id, title, sortType = 'date', isMore = false) {
        if (!isMore) {
            this.saveScroll();
            this.currentView = "channel";
            this.currentChId = id;
            this.currentChTitle = title;
            window.scrollTo(0, 0);
        }
        const data = await YT.fetchAPI('search', { channelId: id, part: 'snippet', maxResults: 24, type: 'video', order: sortType, pageToken: isMore ? this.nextToken : "" });
        this.nextToken = data.nextPageToken || "";
        if (isMore) this.currentList.push(...data.items);
        else this.currentList = data.items || [];

        const headerHtml = `
            <div class="channel-header">
                <div style="display:flex; align-items:center; gap:20px;">
                    <img src="${this.channelIcons[id] || ''}" style="width:70px; height:70px; border-radius:50%;">
                    <div>
                        <h2 style="margin:0;">${title}</h2>
                        <div class="tab-bar">
                            <div class="tab-item ${sortType==='date'?'active':''}" onclick="Actions.showChannel('${id}', '${title.replace(/'/g, "\\'")}', 'date')">最新</div>
                            <div class="tab-item ${sortType==='viewCount'?'active':''}" onclick="Actions.showChannel('${id}', '${title.replace(/'/g, "\\'")}', 'viewCount')">人気</div>
                            <div class="tab-item" onclick="Actions.showChannelPlaylists('${id}')">再生リスト</div>
                        </div>
                    </div>
                </div>
            </div>`;
        this.renderGrid(headerHtml);
    },

    async showChannelPlaylists(id) {
        const data = await YT.fetchAPI('playlists', { channelId: id, part: 'snippet', maxResults: 50 });
        const playlists = data.items || [];
        const html = playlists.map(p => `
            <div class="v-card" onclick="Actions.viewExternalPlaylist('${p.id}', '${p.snippet.title.replace(/'/g, "\\'")}')">
                <div class="thumb-container">
                    <img src="${p.snippet.thumbnails.high.url}" class="main-thumb">
                    <div style="position:absolute; right:0; top:0; bottom:0; width:45%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center;">
                        <span style="font-size:24px; color:#fff;">≡</span>
                    </div>
                </div>
                <div class="v-text">
                    <h3>${p.snippet.title}</h3>
                    <p>再生リスト</p>
                </div>
            </div>`).join('');

        document.getElementById('view-container').innerHTML = `
            <div class="channel-header">
                <h2>${this.currentChTitle} - 公式再生リスト</h2>
                <div class="tab-bar">
                    <div class="tab-item" onclick="Actions.showChannel('${id}', '${this.currentChTitle.replace(/'/g, "\\'")}', 'date')">動画に戻る</div>
                </div>
            </div>
            <div class="grid">${html || '<p>再生リストはありません</p>'}</div>`;
    },

    async viewExternalPlaylist(listId, title) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: listId, part: 'snippet', maxResults: 50 });
        this.currentList = data.items || [];
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    async fetchMissingIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if (data.items) {
            data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
            document.querySelectorAll('.ch-icon-img').forEach(img => {
                const cid = img.dataset.chid;
                if (this.channelIcons[cid]) img.src = this.channelIcons[cid];
            });
        }
    },

    renderGrid(headerHtml = "") {
        const container = document.getElementById('view-container');
        const missingIds = [...new Set(this.currentList.map(item => item.snippet?.channelId))]
            .filter(id => id && !this.channelIcons[id]).join(',');
        if (missingIds) this.fetchMissingIcons(missingIds);

        const cardsHtml = this.currentList.map((item, index) => {
            const snip = item.snippet;
            if (!snip) return '';
            const vId = (typeof item.id === 'string') ? item.id : (item.id.videoId || item.id.resourceId?.videoId);
            return `
            <div class="v-card">
                <div class="thumb-container">
                    <img src="${snip.thumbnails.high.url}" class="main-thumb" onclick="Actions.playVideoByIndex(${index})">
                    <img src="${this.channelIcons[snip.channelId] || ''}" class="ch-icon-img" data-chid="${snip.channelId}" onclick="event.stopPropagation(); Actions.showChannel('${snip.channelId}', '${snip.channelTitle.replace(/'/g, "\\'")}')">
                </div>
                <div class="v-text" onclick="Actions.playVideoByIndex(${index})">
                    <h3>${snip.title}</h3>
                    <p>${snip.channelTitle}</p>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div style="padding: 10px 20px;">${headerHtml}</div>
            <div class="grid">${cardsHtml}</div>
            <div style="text-align:center; padding: 40px 0 120px 0;">
                <button class="btn primary-btn" style="width:200px;" onclick="Actions.loadMore()">もっと見る</button>
            </div>`;
    },

    playVideoByIndex(index) {
        this.currentShortIndex = index;
        this.play(this.currentList[index]);
    },

    play(video) {
        if (!video) return;
        this.currentPlayVideo = video;
        const vId = (typeof video.id === 'string') ? video.id : (video.id.videoId || video.id.resourceId?.videoId);
        
        if (this.currentView === "shorts") return this.playShort(vId);

        window.scrollTo(0, 0);
        const isLiked = Storage.get('yt_likes').some(x => x.id === vId);
        const isSubbed = Storage.get('yt_subs').some(x => x.id === video.snippet.channelId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="video-wrapper">
                        <iframe src="${YT.getEmbedUrl(vId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                    </div>
                    <div class="video-info">
                        <h2>${video.snippet.title}</h2>
                        <div class="channel-row">
                            <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%; cursor:pointer;" onclick="Actions.showChannel('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g, "\\'")}')">
                            <div class="channel-name" style="margin-left:10px; font-weight:bold;">${video.snippet.channelTitle}</div>
                            <button class="btn sub-btn ${isSubbed ? 'active' : ''}" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g, "\\'")}')">
                                ${isSubbed ? '登録済み' : 'チャンネル登録'}
                            </button>
                        </div>
                        <div class="actions-row">
                            <button class="btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '🤍'} いいね</button>
                            <button class="btn" onclick="window.open('https://www.youtube.com/watch?v=${vId}', '_blank')">🔗 YouTube</button>
                        </div>
                        <div style="background:var(--card-bg); padding:15px; border-radius:10px; margin-top:15px; font-size:14px; color:#ccc; white-space:pre-wrap;">
                            ${video.snippet.description || ''}
                        </div>
                    </div>
                </div>
                <div class="related-area"><h3>関連動画</h3><div id="related-list"></div></div>
            </div>`;
        
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
        this.loadRelated(video.snippet.title);
    },

    playShort(id) {
        const video = this.currentList[this.currentShortIndex];
        const vId = id || (typeof video.id === 'string' ? video.id : video.id.videoId);

        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container">
                <div class="shorts-wrapper">
                    <iframe src="${YT.getEmbedUrl(vId, true)}" style="width:100%; height:100%; border:none; border-radius:15px;" allowfullscreen allow="autoplay"></iframe>
                    
                    <div class="shorts-nav" style="position:absolute; top:50%; left:-70px; transform:translateY(-50%); display:flex; flex-direction:column; gap:20px;">
                        <button class="short-btn" onclick="Actions.prevShort()">▲</button>
                        <button class="short-btn" onclick="Actions.nextShort()">▼</button>
                    </div>

                    <div class="shorts-actions">
                        <div class="short-btn" onclick="Actions.handleLike()">❤️</div>
                        <div class="short-btn" onclick="Actions.showShorts()">⚡</div>
                    </div>

                    <div style="position:absolute; bottom:25px; left:20px; right:70px; pointer-events:none;">
                        <h3 style="font-size:15px; margin:0; text-shadow:1px 1px 3px #000;">${video.snippet.title}</h3>
                        <p style="font-size:13px; margin:5px 0 0 0; font-weight:bold;">@${video.snippet.channelTitle}</p>
                    </div>
                </div>
            </div>`;
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
    },

    nextShort() {
        if (this.currentShortIndex < this.currentList.length - 1) {
            this.currentShortIndex++;
            this.playVideoByIndex(this.currentShortIndex);
        } else if (this.nextToken) {
            this.loadMore().then(() => { this.currentShortIndex++; this.playVideoByIndex(this.currentShortIndex); });
        }
    },
    prevShort() {
        if (this.currentShortIndex > 0) {
            this.currentShortIndex--;
            this.playVideoByIndex(this.currentShortIndex);
        }
    },

    async loadRelated(title) {
        const q = title.substring(0, 15);
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 15 });
        this.relatedList = data.items || [];
        const container = document.getElementById('related-list');
        if (container) {
            container.innerHTML = this.relatedList.map((v, i) => `
                <div class="side-card" onclick="Actions.play(Actions.relatedList[${i}])">
                    <img src="${v.snippet.thumbnails.medium.url}">
                    <div class="side-card-info"><h4>${v.snippet.title}</h4><p>${v.snippet.channelTitle}</p></div>
                </div>`).join('');
        }
    },

    showLikes() {
        this.saveScroll();
        this.currentView = "likes";
        const likes = Storage.get('yt_likes');
        this.currentList = likes.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>いいねした動画</h2>");
    },

    showHistory() {
        this.saveScroll();
        this.currentView = "history";
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>履歴</h2>");
    },

    showSubs() {
        this.saveScroll();
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => `
            <div class="v-card" style="padding:20px; text-align:center; background:var(--card-bg);">
                <img src="${this.channelIcons[ch.id] || ''}" style="width:100px; height:100px; border-radius:50%; cursor:pointer;" onclick="Actions.showChannel('${ch.id}', '${ch.name.replace(/'/g, "\\'")}')">
                <h3 style="margin:15px 0 10px 0;">${ch.name}</h3>
                <button class="btn sub-btn active" style="margin:0 auto;" onclick="Actions.handleSub('${ch.id}', '${ch.name.replace(/'/g, "\\'")}')">解除</button>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録中のチャンネル</h2><div class="grid">${html}</div></div>`;
    },

    handleLike() {
        const v = this.currentPlayVideo;
        if (!v) return;
        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        Storage.toggleLike({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        if (this.currentView === "shorts") this.playShort(vId); else this.play(this.currentPlayVideo);
    },

    handleSub(id, name) {
        Storage.toggleSub({ id, name });
        if (this.currentView === "subs") this.showSubs(); 
        else if (this.currentPlayVideo?.snippet.channelId === id) this.play(this.currentPlayVideo);
    }
};

window.onload = () => Actions.init();
