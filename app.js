const YT = {
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"],
    currentEduKey: "AXH1ezmAE3vgRPcGfwKP-x8QMySX2Sc1L5ejSmbRjTuE-_q-HIR8jzGYDuaE9xpFLlo_goB3iQQBDTsJ9c0h04V6RZqjE2Le8KQULVTQBURHroB2ujwh11mxs3jKlv_VeP_HHU45QkGzad-T3gEFcKpx86UOWwnFyw==",

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
    currentPlayMode: 'edu',
    selectedChannels: [],

    init() {
        this.goHome();
        document.addEventListener('click', (e) => {
            const box = document.getElementById('suggest-box');
            if (box && !e.target.closest('.search-bar-container')) box.style.display = 'none';
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

    // フィルタ設定を改善
    setFilter(f) {
        this.currentFilter = f;
        const btns = document.querySelectorAll('.filter-bar button');
        btns.forEach(b => {
            b.classList.remove('active');
            if(b.innerText.includes(f === 'today' ? '今日' : f === 'short' ? '4分' : f === 'live' ? 'ライブ' : 'すべて')) b.classList.add('active');
        });
        this.search();
    },

    // --- タッチ判定の見直し ---
    handleChannelTap(e, chId) {
        // 顔写真（img）を直接叩いた場合はチャンネルへ
        if (e.target.tagName === 'IMG') {
            e.stopPropagation();
            this.showChannel(chId);
            return;
        }
        // それ以外（外枠）は選択切り替え
        const idx = this.selectedChannels.indexOf(chId);
        if (idx > -1) this.selectedChannels.splice(idx, 1);
        else {
            if (this.selectedChannels.length >= 5) return alert("最大5人まで！");
            this.selectedChannels.push(chId);
        }
        this.showSubs();
    },

    async loadSelectedNews() {
        if (this.selectedChannels.length === 0) return;
        const btn = document.getElementById('load-news-btn');
        btn.innerText = "読込中...";
        btn.disabled = true;

        const allVideos = [];
        for (const chId of this.selectedChannels) {
            const data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', order: 'date', type: 'video', maxResults: 4 });
            allVideos.push(...data.items);
        }
        allVideos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = allVideos;
        this.renderGrid(`<h2>新着フィード</h2>`);
    },

    showSubs() {
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        const chListHtml = subs.map(ch => {
            const isSelected = this.selectedChannels.includes(ch.id) ? 'selected' : '';
            return `
            <div class="ch-item-container" onclick="Actions.handleChannelTap(event, '${ch.id}')">
                <div class="ch-item ${isSelected}">
                    <img src="${ch.thumb}" class="ch-face">
                </div>
                <div style="font-size:11px; margin-top:8px; width:90px; overflow:hidden;">${ch.name}</div>
            </div>`;
        }).join('');

        document.getElementById('view-container').innerHTML = `
            <div style="padding:10px;">
                <h2>登録済み</h2>
                <div style="display:flex; overflow-x:auto; gap:5px; padding-bottom:15px; border-bottom:1px solid #333;">${chListHtml}</div>
                <button id="load-news-btn" class="load-news-btn" onclick="Actions.loadSelectedNews()" ${this.selectedChannels.length === 0 ? 'disabled' : ''}>
                    ${this.selectedChannels.length}人の新着を読み込む
                </button>
            </div>`;
    },

    // --- 検索ロジック修正（フィルタを強制） ---
    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        this.currentView = "search";
        document.getElementById('filter-bar').style.display = 'flex';
        
        let params = { q, part: 'snippet', type: 'video', maxResults: 24, videoEmbeddable: 'true', regionCode: 'JP' };
        
        // フィルタ条件を厳密に適用
        if (this.currentFilter === 'today') {
            params.publishedAfter = new Date(Date.now() - 86400000).toISOString();
        } else if (this.currentFilter === 'short') {
            params.videoDuration = 'short'; // 4分以内
        } else if (this.currentFilter === 'live') {
            params.eventType = 'live'; // ライブ中
        }

        const data = await YT.fetchAPI('search', params);
        this.currentList = data.items;
        
        // ショートモードの時は専用のクラスを grid につける
        const gridClass = this.currentFilter === 'short' ? 'grid shorts-mode' : 'grid';
        this.renderGrid(`<h2>「${q}」の結果</h2>`, gridClass);
    },

    renderGrid(titleHtml, gridClass = "grid") {
        const html = this.currentList.map(v => `
            <div class="v-card" onclick='Actions.play(${JSON.stringify(v).replace(/'/g, "&apos;")})'>
                <div class="thumb-wrap"><img src="${v.snippet.thumbnails.high.url}"></div>
                <div style="padding:10px 0;">
                    <div style="font-weight:bold; font-size:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${v.snippet.title}</div>
                    <div style="font-size:12px; color:#aaa; margin-top:4px;">${v.snippet.channelTitle}</div>
                </div>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `
            <div style="padding-top:10px;">
                ${titleHtml}
                <div class="${gridClass}">${html}</div>
            </div>`;
    },

    // --- 再生まわり ---
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
                    <div style="font-size:13px; font-weight:bold;">${i.snippet.title}</div>
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
                    <h2 style="margin:16px 0;">${video.snippet.title}</h2>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; padding:12px; border-radius:12px;">
                        <div style="font-weight:bold;">${video.snippet.channelTitle}</div>
                        <div>
                            <button id="mode-switch-btn" class="mode-switch-btn" onclick="Actions.switchMode('${vId}')">📺 edu再生中 (切替)</button>
                            <button class="btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g,"")}', true)">登録</button>
                        </div>
                    </div>
                </div>
                <div class="related-area"><h3>関連動画</h3>${relatedHtml}</div>
            </div>`;
    },

    async switchMode(videoId) {
        this.currentPlayMode = (this.currentPlayMode === 'edu') ? 'stream' : 'edu';
        const eduEl = document.getElementById('edu-player-frame');
        const streamEl = document.getElementById('stream-player');
        const btn = document.getElementById('mode-switch-btn');
        if (this.currentPlayMode === 'stream') {
            eduEl.style.display = 'none'; streamEl.style.display = 'block';
            btn.innerText = "⚡ ストリーム再生中 (切替)";
            this.setupStream(videoId);
        } else {
            streamEl.style.display = 'none'; eduEl.style.display = 'block';
            btn.innerText = "📺 edu再生中 (切替)";
            streamEl.pause();
        }
    },

    setupStream(videoId) {
        const video = document.getElementById('stream-player');
        const streamUrl = `/api/stream?v=${videoId}`;
        if (Hls.isSupported()) {
            const hls = new Hls(); hls.loadSource(streamUrl); hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl; video.play();
        }
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
        this.renderGrid("<h2>ショート動画</h2>", "grid shorts-mode");
    },
    
    showHistory() {
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: { videoId: x.id }, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>履歴</h2>");
    },
    
    showGame() { if (window.showGamePlatform) window.showGamePlatform(); }
};

Actions.init();
