const YT = {
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"],
    currentEduKey: "AXH1ezmAE3vgRPcGfwKP-x8QMySX2Sc1L5ejSmbRjTuE-_q-HIR8jzGYDuaE9xpFLlo_goB3iQQBDTsJ9c0h04V6RZqjE2Le8KQULVTQBURHroB2ujwh11mxs3jKlv_VeP_HHU45QkGzad-T3gEFcKpx86UOWwnFyw==",

    async refreshEduKey() {
        try {
            const response = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await response.json();
            if (data && data.key) this.currentEduKey = data.key;
        } catch (error) { console.error("Key error"); }
    },

    async fetchAPI(endpoint, params) {
        let keyIndex = parseInt(localStorage.getItem('yt_key_index')) || 0;
        const query = new URLSearchParams({ ...params, key: this.keys[keyIndex] }).toString();
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`);
            if (res.status === 403) {
                keyIndex = (keyIndex + 1) % this.keys.length;
                localStorage.setItem('yt_key_index', keyIndex);
                return this.fetchAPI(endpoint, params);
            }
            return await res.json();
        } catch (e) { throw e; }
    },

    getEmbedUrl(id) {
        return `https://www.youtubeeducation.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=1&embed_config=${this.currentEduKey}`;
    }
};

const Storage = {
    isSecret: false,
    get(key) { return JSON.parse(localStorage.getItem(key)) || []; },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    addHistory(v) {
        if (this.isSecret) return;
        let h = this.get('yt_history');
        const id = v.id.videoId || v.id;
        h = [{ id: id, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle }, ...h.filter(x => x.id !== id)].slice(0, 50);
        this.set('yt_history', h);
    }
};

const Actions = {
    currentView: "home",
    currentList: [],
    currentFilter: "none",
    currentPlayMode: 'edu', // 'edu' または 'stream'

    init() {
        this.goHome();
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar-container')) document.getElementById('suggest-box').style.display = 'none';
        });
    },

    toggleSecret() {
        Storage.isSecret = !Storage.isSecret;
        document.getElementById('secret-btn').classList.toggle('active', Storage.isSecret);
        alert(Storage.isSecret ? "シークレットモードON" : "シークレットモードOFF");
    },

    async updateSuggest() {
        const q = document.getElementById('search-input').value;
        const box = document.getElementById('suggest-box');
        if (!q) { box.style.display = 'none'; return; }
        try {
            const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`);
            const data = await res.json();
            box.innerHTML = data[1].map(h => `<div class="suggest-item" onclick="document.getElementById('search-input').value='${h}'; Actions.search();">${h}</div>`).join('');
            box.style.display = data[1].length ? 'block' : 'none';
        } catch (e) { box.style.display = 'none'; }
    },

    setFilter(f) {
        this.currentFilter = f;
        document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
        this.search();
    },

    // 再生モード切り替えロジック
    async switchMode(videoId) {
        this.currentPlayMode = (this.currentPlayMode === 'edu') ? 'stream' : 'edu';
        const eduEl = document.getElementById('edu-player-frame');
        const streamEl = document.getElementById('stream-player');
        const btn = document.getElementById('mode-switch-btn');

        if (this.currentPlayMode === 'stream') {
            eduEl.style.display = 'none';
            streamEl.style.display = 'block';
            btn.innerText = "⚡ ストリーム再生中 (切替)";
            this.setupStream(videoId);
        } else {
            streamEl.style.display = 'none';
            eduEl.style.display = 'block';
            btn.innerText = "📺 edu再生中 (切替)";
            streamEl.pause();
        }
    },

    // HLSストリーミングセットアップ
    setupStream(videoId) {
        const video = document.getElementById('stream-player');
        const streamUrl = `/api/stream?v=${videoId}`; // 取得したwatch.htmlのロジック

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', () => video.play());
        }
    },

    async playById(id) {
        const data = await YT.fetchAPI('videos', { id: id, part: 'snippet' });
        if (data.items.length > 0) this.play(data.items[0]);
    },

    async play(video) {
        if (window.stopAllGames) window.stopAllGames();
        const vId = video.id.videoId || video.id;
        this.currentView = "watch";
        Storage.addHistory(video);
        window.scrollTo(0, 0);

        const relatedData = await YT.fetchAPI('search', { relatedToVideoId: vId, type: 'video', maxResults: 15, part: 'snippet' });
        const relatedHtml = relatedData.items.map(i => `
            <div class="related-item" onclick="Actions.playById('${i.id.videoId}')">
                <img src="${i.snippet.thumbnails.medium.url}" style="width:140px; border-radius:8px;">
                <div style="flex:1;">
                    <div style="font-size:13px; font-weight:bold; line-height:1.3;">${i.snippet.title}</div>
                    <div style="font-size:11px; color:#aaa;">${i.snippet.channelTitle}</div>
                </div>
            </div>`).join('');

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="video-wrapper">
                        <iframe id="edu-player-frame" src="${YT.getEmbedUrl(vId)}" frameborder="0" allowfullscreen style="width:100%; height:100%;"></iframe>
                        <video id="stream-player" controls style="display:none; width:100%; height:100%;"></video>
                    </div>
                    <h2 style="margin:16px 0 8px;">${video.snippet.title}</h2>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; padding:12px; border-radius:12px;">
                        <div style="font-weight:bold;">${video.snippet.channelTitle}</div>
                        <div style="display:flex; align-items:center;">
                            <button id="mode-switch-btn" class="mode-switch-btn" onclick="Actions.switchMode('${vId}')">📺 edu再生中 (切替)</button>
                            <button class="btn">登録</button>
                        </div>
                    </div>
                </div>
                <div class="related-area"><h3>関連動画</h3>${relatedHtml}</div>
            </div>`;
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        this.currentView = "search";
        document.getElementById('filter-bar').style.display = 'flex';
        const params = { q, part: 'snippet', type: 'video', maxResults: 24, videoEmbeddable: 'true', regionCode: 'JP' };
        if (this.currentFilter === 'today') params.publishedAfter = new Date(Date.now() - 86400000).toISOString();
        else if (this.currentFilter === 'short') params.videoDuration = 'short';
        else if (this.currentFilter === 'live') params.eventType = 'live';

        const data = await YT.fetchAPI('search', params);
        this.currentList = data.items;
        this.renderGrid(`<h2>「${q}」の結果</h2>`);
    },

    renderGrid(titleHtml) {
        const html = this.currentList.map(v => `
            <div class="v-card" onclick='Actions.play(${JSON.stringify(v).replace(/'/g, "&apos;")})'>
                <div class="thumb-wrap"><img src="${v.snippet.thumbnails.high.url}"></div>
                <div style="padding:10px 0;">
                    <div style="font-weight:bold; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${v.snippet.title}</div>
                    <div style="font-size:12px; color:#aaa;">${v.snippet.channelTitle}</div>
                </div>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding-top:20px;">${titleHtml}<div class="grid">${html}</div></div>`;
    },

    async goHome() {
        this.currentView = "home";
        document.getElementById('filter-bar').style.display = 'none';
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items;
        this.renderGrid("<h2>急上昇</h2>");
    },

    async showLiveHub() {
        this.currentView = "live";
        const data = await YT.fetchAPI('search', { eventType: 'live', type: 'video', part: 'snippet', maxResults: 24, regionCode: 'JP' });
        this.currentList = data.items;
        this.renderGrid("<h2>ライブ配信中</h2>");
    },

    async showShorts() {
        this.currentView = "shorts";
        const data = await YT.fetchAPI('search', { q: '#Shorts', type: 'video', videoDuration: 'short', maxResults: 24, part: 'snippet' });
        this.currentList = data.items;
        this.renderGrid("<h2>ショート動画</h2>");
    },

    showHistory() {
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: { videoId: x.id }, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>視聴履歴</h2>");
    },

    showSubs() {
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => `<div class="v-card" style="padding:20px; text-align:center; background:var(--card-bg);" onclick="Actions.showChannel('${ch.id}')"><img src="${ch.thumb}" style="width:100px; height:100px; border-radius:50%;"><h3>${ch.name}</h3></div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録済み</h2><div class="grid">${html}</div></div>`;
    },

    showGame() { if (window.showGamePlatform) window.showGamePlatform(); }
};

Actions.init();
