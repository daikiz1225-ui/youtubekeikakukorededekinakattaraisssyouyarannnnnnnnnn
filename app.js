/**
 * YouTube Client Premium - app.js
 * 再生リスト開閉・並び替え・追加読み込み・ショート対応版
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
        } catch (error) { console.error("Key error"); }
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
            if (response.status === 403) { this.rotateKey(); return this.fetchAPI(endpoint, params); }
            if (!response.ok) throw new Error("API error");
            return await response.json();
        } catch (error) { return { items: [], nextPageToken: "" }; }
    },

    getEmbedUrl(id, isShort = false) {
        const config = { enc: this.currentEduKey, hideTitle: true };
        const params = new URLSearchParams({
            autoplay: 1, origin: location.origin,
            embed_config: JSON.stringify(config), rel: 0, modestbranding: 1, enablejsapi: 1, v: id
        });
        if (isShort) { params.append('loop', '1'); params.append('playlist', id); }
        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

const Storage = {
    get(key) { const data = localStorage.getItem(key); try { return data ? JSON.parse(data) : []; } catch (e) { return []; } },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    addHistory(v) { let h = this.get('yt_history'); h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50); this.set('yt_history', h); },
    toggleSub(ch) {
        let s = this.get('yt_subs');
        const i = s.findIndex(x => x.id === ch.id);
        if (i > -1) s.splice(i, 1); else s.push({ id: ch.id, name: ch.name, thumb: ch.thumb || '' });
        this.set('yt_subs', s);
    }
};

const Actions = {
    currentList: [],
    channelIcons: {},
    currentView: "home",
    nextToken: "",
    currentParams: {},

    init() {
        const input = document.getElementById('search-input');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.search(); input.blur(); } });
        document.getElementById('search-btn').onclick = () => this.search();
        YT.refreshEduKey().then(() => this.goHome());
    },

    async goHome() {
        this.currentView = "home";
        this.currentParams = { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 };
        const data = await YT.fetchAPI('videos', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid("<h2>急上昇</h2>");
    },

    async showShorts() {
        this.currentView = "shorts";
        this.currentParams = { q: '#Shorts', part: 'snippet', type: 'video', videoDuration: 'short', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid("<h2>ショート</h2>");
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        this.currentParams = { q, part: 'snippet', maxResults: 24, type: 'video' };
        let modeLabel = "";
        if (this.currentView === "shorts") {
            this.currentParams.videoDuration = "short";
            modeLabel = "(ショート限定)";
        } else if (this.currentView === "live") {
            this.currentParams.eventType = "live";
            modeLabel = "(Live限定)";
        }
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid(`<h2>"${q}" の検索結果 ${modeLabel}</h2>`);
    },

    async loadMore() {
        if (!this.nextToken) return;
        const endpoint = (this.currentView === 'home') ? 'videos' : 
                         (this.currentView === 'playlist') ? 'playlistItems' : 'search';
        const data = await YT.fetchAPI(endpoint, { ...this.currentParams, pageToken: this.nextToken });
        this.currentList = [...this.currentList, ...data.items];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid();
    },

    renderCards(items) {
        return items.map((item) => {
            const snip = item.snippet;
            const vId = item.id.videoId || item.id;
            // プレイリストアイテムの場合は contentDetails.videoId を使う
            const realId = item.contentDetails?.videoId || vId;
            const isLiveNow = snip.liveBroadcastContent === 'live';
            
            return `
            <div class="v-card" onclick="Actions.playFromList('${realId}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <div class="thumb-container">
                    <img src="${snip.thumbnails.high.url}" class="main-thumb">
                    ${isLiveNow ? '<div class="live-badge">● LIVE</div>' : ''}
                    <img src="${this.channelIcons[snip.channelId] || ''}" class="ch-icon-img" data-chid="${snip.channelId}">
                </div>
                <div class="v-text"><h3>${snip.title}</h3><p>${snip.channelTitle}</p></div>
            </div>`;
        }).join('');
    },

    renderGrid(headerHtml = "") {
        const container = document.getElementById('view-container');
        const moreBtn = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0;">もっと読み込む</button>` : "";
        
        // 既存のヘッダーがある場合は維持
        if (!headerHtml && container.querySelector('h2')) {
            headerHtml = container.querySelector('div[style*="padding: 10px 20px;"]').innerHTML;
        }

        container.innerHTML = `<div style="padding: 10px 20px;">${headerHtml}</div><div class="grid">${this.renderCards(this.currentList)}</div>${moreBtn}`;
        const ids = this.currentList.map(i => i.snippet?.channelId).filter(id => id && !this.channelIcons[id]).join(',');
        if (ids) this.fetchMissingIcons(ids);
    },

    playFromList(id, data) {
        this.play(data);
    },

    async fetchMissingIcons(ids) {
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if (data.items) {
            data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
            document.querySelectorAll('.ch-icon-img').forEach(img => {
                const cid = img.dataset.chid;
                if (this.channelIcons[cid]) img.src = this.channelIcons[cid];
            });
        }
    },

    async play(video) {
        const vId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.contentDetails?.videoId);
        const snip = video.snippet;
        const isShortsView = this.currentView === "shorts" || (snip.description && snip.description.includes("#Shorts")) || (snip.title && snip.title.includes("#Shorts"));
        window.scrollTo(0, 0);

        if (isShortsView) {
            document.getElementById('view-container').innerHTML = `
                <div class="shorts-container" style="display:flex; flex-direction:column; align-items:center; padding-top:20px;">
                    <div class="shorts-wrapper" style="width:360px; height:640px; border-radius:15px; overflow:hidden; background:#000; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                        <iframe src="${YT.getEmbedUrl(vId, true)}" style="width:100%; height:100%; border:none;"></iframe>
                    </div>
                    <div style="width:360px; margin-top:15px;">
                        <h3>${snip.title}</h3>
                        <p onclick="Actions.showChannel('${snip.channelId}')" style="cursor:pointer; color:#aaa;">${snip.channelTitle}</p>
                    </div>
                    <button class="btn" onclick="Actions.goHome()" style="margin-top:20px;">閉じる</button>
                </div>`;
        } else {
            document.getElementById('view-container').innerHTML = `
                <div class="watch-layout">
                    <div class="player-area">
                        <div class="video-wrapper">
                            <iframe src="${YT.getEmbedUrl(vId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                        </div>
                        <div class="video-info">
                            <h2>${snip.title}</h2>
                            <div class="channel-row" style="display:flex; align-items:center; margin-top:15px; cursor:pointer;" onclick="Actions.showChannel('${snip.channelId}')">
                                <img src="${this.channelIcons[snip.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                <div style="margin-left:10px; font-weight:bold;">${snip.channelTitle}</div>
                            </div>
                        </div>
                    </div>
                    <div class="related-area">
                        <h3 style="margin-top:0;">関連動画</h3>
                        <div id="side-content-box"></div>
                    </div>
                </div>`;
            
            // 関連動画の検索精度向上
            const queryKeywords = snip.title.replace(/[【】「」]/g, ' ').split(' ').filter(w => w.length > 1).slice(0, 3).join(' ');
            const relData = await YT.fetchAPI('search', { q: queryKeywords, type: 'video', part: 'snippet', maxResults: 15 });
            document.getElementById('side-content-box').innerHTML = relData.items.map(item => `
                <div class="v-card" style="display:flex; gap:10px; margin-bottom:12px;" onclick="Actions.playFromList('${item.id.videoId}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                    <img src="${item.snippet.thumbnails.medium.url}" style="width:160px; aspect-ratio:16/9; object-fit:cover; border-radius:8px;">
                    <div style="font-size:12px;">
                        <div style="font-weight:bold; line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;">${item.snippet.title}</div>
                        <div style="color:#aaa; margin-top:4px;">${item.snippet.channelTitle}</div>
                    </div>
                </div>`).join('');
        }
        Storage.addHistory({ id: vId, title: snip.title, thumb: snip.thumbnails.high.url, channelTitle: snip.channelTitle });
    },

    async showChannel(chId) {
        this.currentView = "channel";
        const container = document.getElementById('view-container');
        const chData = await YT.fetchAPI('channels', { id: chId, part: 'snippet,brandingSettings' });
        const ch = chData.items[0];

        container.innerHTML = `
            <div class="channel-header">
                <div class="banner" style="width:100%; height:150px; background:url(${ch.brandingSettings?.image?.bannerExternalUrl || ''}) center/cover #333; border-radius:15px;"></div>
                <div style="display:flex; align-items:center; padding:20px;">
                    <img src="${ch.snippet.thumbnails.medium.url}" style="width:80px; height:80px; border-radius:50%;">
                    <div style="margin-left:20px;">
                        <h1 style="margin:0;">${ch.snippet.title}</h1>
                        <p style="color:#aaa;">${ch.snippet.customUrl}</p>
                    </div>
                </div>
                <div class="tabs" style="display:flex; border-bottom:1px solid #333; margin-top:10px; gap:20px;">
                    <div class="tab active" onclick="Actions.loadChannelTab('${chId}', 'videos', 'date')">最新</div>
                    <div class="tab" onclick="Actions.loadChannelTab('${chId}', 'videos', 'viewCount')">人気順</div>
                    <div class="tab" onclick="Actions.loadChannelTab('${chId}', 'playlists')">再生リスト</div>
                </div>
            </div>
            <div id="channel-content-grid" class="grid" style="margin-top:20px;"></div>
            <div id="more-btn-area"></div>`;
        this.loadChannelTab(chId, 'videos', 'date');
    },

    async loadChannelTab(chId, type, order = 'date') {
        const grid = document.getElementById('channel-content-grid');
        grid.innerHTML = "読み込み中...";
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        
        if (type === 'videos') {
            const data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 24 });
            this.currentList = data.items;
            this.nextToken = data.nextPageToken || "";
            this.currentParams = { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 24 };
            grid.innerHTML = this.renderCards(data.items);
        } else if (type === 'playlists') {
            const data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 24 });
            grid.innerHTML = data.items.map(pl => `
                <div class="v-card" onclick="Actions.showPlaylist('${pl.id}', '${pl.snippet.title.replace(/'/g, "\\'")}')">
                    <div class="thumb-container">
                        <img src="${pl.snippet.thumbnails.high.url}" class="main-thumb">
                        <div style="position:absolute; bottom:0; right:0; background:rgba(0,0,0,0.8); padding:5px 10px; font-size:12px;">📁 再生リスト</div>
                    </div>
                    <div class="v-text"><h3>${pl.snippet.title}</h3></div>
                </div>`).join('');
            this.nextToken = ""; 
        }
        document.getElementById('more-btn-area').innerHTML = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0;">もっと読み込む</button>` : "";
    },

    async showPlaylist(plId, title) {
        this.currentView = "playlist";
        this.currentParams = { playlistId: plId, part: 'snippet,contentDetails', maxResults: 24 };
        const data = await YT.fetchAPI('playlistItems', this.currentParams);
        this.currentList = data.items;
        this.nextToken = data.nextPageToken || "";
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    showHistory() {
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>履歴</h2>");
    }
};

window.onload = () => Actions.init();
