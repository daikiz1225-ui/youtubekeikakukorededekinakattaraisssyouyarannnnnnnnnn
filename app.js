/**
 * YouTube Client Premium - app.js
 * モード別検索(通常/ショート/Live) & ライブチャット対応
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

    getEmbedUrl(id) {
        const config = { enc: this.currentEduKey, hideTitle: true };
        const params = new URLSearchParams({
            autoplay: 1, origin: location.origin,
            embed_config: JSON.stringify(config), rel: 0, modestbranding: 1, enablejsapi: 1, v: id
        });
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
    currentSearchTerm: "",

    init() {
        const input = document.getElementById('search-input');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.search(); input.blur(); } });
        document.getElementById('search-btn').onclick = () => this.search();
        YT.refreshEduKey().then(() => this.goHome());
    },

    async goHome() {
        this.currentView = "home";
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid("<h2>急上昇</h2>");
    },

    async showShorts() {
        this.currentView = "shorts";
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', videoDuration: 'short', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid("<h2>ショート</h2>");
    },

    async showLiveHub() {
        this.currentView = "live";
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>Live Hub</h2><p>スキャン中...</p></div>`;

        const popular = await YT.fetchAPI('search', { q: 'live', part: 'snippet', type: 'video', eventType: 'live', regionCode: 'JP', maxResults: 24 });
        const subs = Storage.get('yt_subs');
        let subLive = [];
        if (subs.length > 0) {
            for (let ch of subs.slice(0, 3)) { // 負荷軽減のため3つまで
                const res = await YT.fetchAPI('search', { channelId: ch.id, part: 'snippet', type: 'video', eventType: 'live', maxResults: 1 });
                if (res.items?.length > 0) subLive.push(res.items[0]);
            }
        }
        this.currentList = [...subLive, ...popular.items];
        this.renderGrid(subLive.length > 0 ? `<h2>🔴 Live Hub</h2><h3 style="color:#ff4e45;">登録チャンネルが配信中</h3>` : `<h2>🔴 Live Hub</h2>`);
    },

    async search() {
        const input = document.getElementById('search-input');
        const q = input.value;
        if (!q) return;

        let params = { q, part: 'snippet', maxResults: 24, type: 'video' };
        let modeLabel = "";

        // モード判定
        if (this.currentView === "shorts") {
            params.videoDuration = "short";
            if (!params.q.includes("#Shorts")) params.q += " #Shorts";
            modeLabel = "(ショート限定)";
        } else if (this.currentView === "live") {
            params.eventType = "live";
            modeLabel = "(Live限定)";
        }

        const data = await YT.fetchAPI('search', params);
        this.currentList = data.items || [];
        this.renderGrid(`<h2>"${q}" の検索結果 ${modeLabel}</h2>`);
    },

    renderCards(items) {
        return items.map((item) => {
            const snip = item.snippet;
            const vId = item.id.videoId || item.id;
            const isLiveNow = snip.liveBroadcastContent === 'live';
            return `
            <div class="v-card" onclick="Actions.playFromList('${vId}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
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
        container.innerHTML = `<div style="padding: 10px 20px;">${headerHtml}</div><div class="grid">${this.renderCards(this.currentList)}</div>`;
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

    play(video) {
        const vId = video.id.videoId || video.id;
        const snip = video.snippet;
        const isLive = snip.liveBroadcastContent === 'live';
        const isSubbed = Storage.get('yt_subs').some(x => x.id === snip.channelId);
        window.scrollTo(0, 0);

        const sideContent = isLive 
            ? `<iframe src="https://www.youtube.com/live_chat?v=${vId}&embed_domain=${location.hostname}" style="width:100%; height:100%; border:none;"></iframe>`
            : `<div id="related-list" style="padding:15px; color:#aaa;">関連動画は現在非表示です</div>`;

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="video-wrapper">
                        <iframe src="${YT.getEmbedUrl(vId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                    </div>
                    <div class="video-info">
                        <h2>${snip.title}</h2>
                        <div class="channel-row">
                            <img src="${this.channelIcons[snip.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                            <div style="margin-left:10px; font-weight:bold;">${snip.channelTitle}</div>
                            <button class="btn ${isSubbed ? '' : 'primary-btn'}" onclick="Actions.handleSub('${snip.channelId}', '${snip.channelTitle.replace(/'/g, "\\'")}')">
                                ${isSubbed ? '登録済み' : 'チャンネル登録'}
                            </button>
                        </div>
                    </div>
                </div>
                <div class="related-area">
                    <h3 style="margin-top:0;">${isLive ? '🔴 ライブチャット' : '情報'}</h3>
                    <div style="height:100%; border:1px solid #333; border-radius:12px; overflow:hidden; background:#000;">
                        ${sideContent}
                    </div>
                </div>
            </div>`;
        Storage.addHistory({ id: vId, title: snip.title, thumb: snip.thumbnails.high.url, channelTitle: snip.channelTitle });
    },

    showHistory() {
        this.currentView = "history";
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>履歴</h2>");
    },

    showLikes() {
        this.currentView = "likes";
        const likes = Storage.get('yt_likes') || [];
        this.currentList = likes.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>いいねした動画</h2>");
    },

    showSubs() {
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => `
            <div class="v-card" style="padding:20px; text-align:center; background:var(--card-bg);">
                <img src="${ch.thumb}" style="width:100px; height:100px; border-radius:50%;">
                <h3>${ch.name}</h3>
                <button class="btn" onclick="Actions.handleSub('${ch.id}', '${ch.name}')">解除</button>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録中のチャンネル</h2><div class="grid">${html}</div></div>`;
    },

    handleSub(id, name) {
        Storage.toggleSub({ id, name });
        this.showSubs();
    }
};

window.onload = () => Actions.init();
