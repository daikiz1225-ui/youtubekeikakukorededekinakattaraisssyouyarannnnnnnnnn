/**
 * YouTube Client Premium - app.js
 * Live Hub機能搭載・プレイリスト機能削除済み・完全版
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
        } catch (error) { console.error(error); }
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
            autoplay: 1, origin: "https://create.kahoot.it",
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
    },
    toggleLike(v) {
        let l = this.get('yt_likes');
        const i = l.findIndex(x => x.id === v.id);
        if (i > -1) l.splice(i, 1); else l.push(v);
        this.set('yt_likes', l);
    }
};

const Actions = {
    currentList: [],
    channelIcons: {},
    nextToken: "",
    currentView: "home",
    currentSearchTerm: "",
    currentPlayVideo: null,
    currentShortIndex: 0,
    scrollPositions: {},

    init() {
        const input = document.getElementById('search-input');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.search(); input.blur(); } });
        document.getElementById('search-btn').onclick = () => this.search();
        YT.refreshEduKey().then(() => this.goHome());
    },

    saveScroll() { this.scrollPositions[this.currentView] = window.scrollY; },
    
    async goHome() {
        this.saveScroll();
        this.currentView = "home";
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid();
    },

    /**
     * Live Hub: 登録チャンネルのライブ ＋ 日本の人気ライブ
     */
    async showLiveHub() {
        this.saveScroll();
        this.currentView = "live";
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>Live Hub</h2><p>読み込み中...</p></div>`;

        // 1. 登録チャンネルのライブ状況を確認
        const subs = Storage.get('yt_subs');
        let subLiveItems = [];
        if (subs.length > 0) {
            const subIds = subs.map(s => s.id).join(',');
            const subData = await YT.fetchAPI('search', { channelId: subIds.split(',')[0], part: 'snippet', type: 'video', eventType: 'live', maxResults: 10 });
            subLiveItems = subData.items || [];
        }

        // 2. 日本の人気ライブを取得
        const popularLiveData = await YT.fetchAPI('search', { q: '', part: 'snippet', type: 'video', eventType: 'live', regionCode: 'JP', maxResults: 24, order: 'viewCount' });
        const popularLiveItems = popularLiveData.items || [];

        // 表示用リストの統合
        this.currentList = [...subLiveItems, ...popularLiveItems];
        
        let html = `<h2>🔴 ライブ配信中</h2>`;
        if (subLiveItems.length > 0) {
            html += `<h3 style="color:var(--live-red); margin-top:30px;">登録チャンネルのライブ</h3>`;
            html += `<div class="grid">${this.renderCards(subLiveItems)}</div>`;
        }
        
        html += `<h3 style="margin-top:40px;">日本の人気ライブ</h3>`;
        html += `<div class="grid">${this.renderCards(popularLiveItems)}</div>`;

        container.innerHTML = `<div style="padding:20px;">${html}</div>`;
    },

    renderCards(items) {
        return items.map((item, index) => {
            const snip = item.snippet;
            const vId = item.id.videoId || item.id;
            return `
            <div class="v-card" onclick="Actions.playFromList('${vId}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <div class="thumb-container">
                    <img src="${snip.thumbnails.high.url}" class="main-thumb">
                    <div class="live-badge">● LIVE</div>
                    <img src="${this.channelIcons[snip.channelId] || ''}" class="ch-icon-img" data-chid="${snip.channelId}">
                </div>
                <div class="v-text">
                    <h3>${snip.title}</h3>
                    <p>${snip.channelTitle}</p>
                </div>
            </div>`;
        }).join('');
    },

    renderGrid(headerHtml = "") {
        const container = document.getElementById('view-container');
        const cards = this.renderCards(this.currentList);
        container.innerHTML = `<div style="padding: 10px 20px;">${headerHtml}</div><div class="grid">${cards}</div>`;
        
        const missingIds = [...new Set(this.currentList.map(item => item.snippet?.channelId))].filter(id => id && !this.channelIcons[id]).join(',');
        if (missingIds) this.fetchMissingIcons(missingIds);
    },

    playFromList(id, fullData) {
        this.currentPlayVideo = fullData;
        this.play(fullData);
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

    async showShorts() {
        this.saveScroll();
        this.currentView = "shorts";
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 24, videoDuration: 'short' });
        this.currentList = data.items || [];
        this.renderGrid();
    },

    async search() {
        const input = document.getElementById('search-input');
        if (!input.value) return;
        this.saveScroll();
        this.currentView = "search";
        const data = await YT.fetchAPI('search', { q: input.value, part: 'snippet', type: 'video', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid();
    },

    play(video) {
        const vId = video.id.videoId || video.id;
        window.scrollTo(0, 0);
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
                            <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                            <div style="margin-left:10px; font-weight:bold;">${video.snippet.channelTitle}</div>
                            <button class="btn ${isSubbed?'':'primary-btn'}" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g, "\\'")}')">${isSubbed?'登録済み':'チャンネル登録'}</button>
                        </div>
                    </div>
                </div>
            </div>`;
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
    },

    showHistory() {
        this.saveScroll();
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>履歴</h2>");
    },

    showLikes() {
        this.saveScroll();
        const likes = Storage.get('yt_likes');
        this.currentList = likes.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>いいねした動画</h2>");
    },

    showSubs() {
        this.saveScroll();
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => `
            <div class="v-card" style="padding:20px; text-align:center; background:var(--card-bg);">
                <img src="${ch.thumb}" style="width:100px; height:100px; border-radius:50%;">
                <h3>${ch.name}</h3>
                <button class="btn" onclick="Actions.handleSub('${ch.id}', '${ch.name}')">解除</button>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><div class="grid">${html}</div></div>`;
    },

    handleSub(id, name) {
        Storage.toggleSub({ id, name });
        this.showSubs();
    }
};

window.onload = () => Actions.init();
