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
    },
    toggleSub(id, name, thumb) {
        let s = this.get('yt_subs');
        const idx = s.findIndex(x => x.id === id);
        if (idx > -1) s.splice(idx, 1);
        else s.push({ id, name, thumb });
        this.set('yt_subs', s);
        return idx === -1;
    }
};

const Actions = {
    currentView: "home",
    currentList: [],
    currentFilter: "none",
    currentPlayMode: 'edu',
    selectedChannels: [],
    currentChannelId: null,

    init() {
        this.goHome();
        document.addEventListener('click', (e) => {
            const box = document.getElementById('suggest-box');
            if (box && !e.target.closest('.search-bar-container')) box.style.display = 'none';
        });
    },

    // --- チャンネル詳細 & 並び替え & 再生リスト ---
    async showChannel(chId, tab = 'date') {
        this.currentView = "channel";
        this.currentChannelId = chId;
        const params = { channelId: chId, part: 'snippet', maxResults: 30 };
        
        let title = "チャンネル動画";
        if (tab === 'date') { params.order = 'date'; title = "新着順"; }
        else if (tab === 'rating') { params.order = 'viewCount'; title = "人気順"; }
        
        let data;
        if (tab === 'playlists') {
            data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 20 });
            this.currentList = data.items.map(p => ({ id: p.id, snippet: p.snippet, isPlaylist: true }));
        } else {
            data = await YT.fetchAPI('search', { ...params, type: 'video' });
            this.currentList = data.items;
        }

        const tabsHtml = `
            <div class="ch-tabs">
                <div class="ch-tab ${tab==='date'?'active':''}" onclick="Actions.showChannel('${chId}', 'date')">新着順</div>
                <div class="ch-tab ${tab==='rating'?'active':''}" onclick="Actions.showChannel('${chId}', 'rating')">人気順</div>
                <div class="ch-tab ${tab==='playlists'?'active':''}" onclick="Actions.showChannel('${chId}', 'playlists')">再生リスト</div>
            </div>`;

        this.renderGrid(tabsHtml + `<h3>${title}</h3>`);
    },

    // --- 登録チャンネル選択 & 新着 ---
    handleChClick(e, chId) {
        if (e.target.tagName === 'IMG') {
            e.stopPropagation();
            this.showChannel(chId);
        } else {
            const idx = this.selectedChannels.indexOf(chId);
            if (idx > -1) this.selectedChannels.splice(idx, 1);
            else if (this.selectedChannels.length < 5) this.selectedChannels.push(chId);
            else alert("5人まで！");
            this.showSubs();
        }
    },

    showSubs() {
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        const chListHtml = subs.map(ch => {
            const isSel = this.selectedChannels.includes(ch.id) ? 'selected' : '';
            return `<div class="ch-item-container" onclick="Actions.handleChClick(event, '${ch.id}')">
                <div class="ch-item ${isSel}"><img src="${ch.thumb}" class="ch-face"></div>
                <div style="font-size:11px; margin-top:8px; width:90px; overflow:hidden;">${ch.name}</div>
            </div>`;
        }).join('');
        document.getElementById('view-container').innerHTML = `
            <div style="padding:10px;">
                <h2>登録済み</h2>
                <div style="display:flex; overflow-x:auto; gap:5px; border-bottom:1px solid #333; padding-bottom:10px;">${chListHtml}</div>
                <button id="load-news-btn" class="load-news-btn" onclick="Actions.loadSelectedNews()" ${this.selectedChannels.length === 0 ? 'disabled' : ''}>
                    ${this.selectedChannels.length}人の新着を取得
                </button>
            </div>`;
    },

    async loadSelectedNews() {
        const btn = document.getElementById('load-news-btn');
        btn.innerText = "読込中..."; btn.disabled = true;
        const allVideos = [];
        for (const chId of this.selectedChannels) {
            const data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', order: 'date', type: 'video', maxResults: 4 });
            if(data.items) allVideos.push(...data.items);
        }
        allVideos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = allVideos;
        this.renderGrid("新着フィード");
    },

    // --- 動画再生 (サムネ押しても飛ばない問題を修正) ---
    renderGrid(title, gridClass = "grid") {
        const html = this.currentList.map((v, i) => {
            const thumb = v.snippet.thumbnails ? v.snippet.thumbnails.high.url : '';
            const titleStr = v.snippet.title.replace(/'/g, "&apos;");
            return `
            <div class="v-card" onclick="Actions.playByIndex(${i})">
                <div class="thumb-wrap"><img src="${thumb}"></div>
                <div style="padding:10px 0;">
                    <div style="font-weight:bold; font-size:14px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${titleStr}</div>
                    <div style="font-size:12px; color:#aaa; margin-top:4px;">${v.snippet.channelTitle}</div>
                </div>
            </div>`;
        }).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding-top:10px;">${title}<div class="${gridClass}">${html}</div></div>`;
    },

    playByIndex(index) {
        const video = this.currentList[index];
        if (!video) return;
        if (video.isPlaylist) {
            alert("再生リストの個別再生は準備中だぜ！");
            return;
        }
        this.play(video);
    },

    async play(video) {
        const vId = video.id.videoId || video.id;
        this.currentView = "watch";
        Storage.addHistory(video);
        window.scrollTo(0, 0);
        document.getElementById('filter-bar').style.display = 'none';

        const related = await YT.fetchAPI('search', { relatedToVideoId: vId, type: 'video', maxResults: 15, part: 'snippet' });
        const relatedHtml = related.items.map((i, idx) => {
            // 関連動画を現在のリストに追加してインデックス再生可能にする
            const vIdRelated = i.id.videoId || i.id;
            if (!this.currentList.some(v => (v.id.videoId||v.id) === vIdRelated)) this.currentList.push(i);
            const listIdx = this.currentList.findIndex(v => (v.id.videoId||v.id) === vIdRelated);
            return `
            <div class="related-item" onclick="Actions.playByIndex(${listIdx})" style="display:flex; gap:10px; margin-bottom:12px; cursor:pointer;">
                <img src="${i.snippet.thumbnails.medium.url}" style="width:140px; border-radius:8px;">
                <div style="flex:1;"><div style="font-size:13px; font-weight:bold;">${i.snippet.title}</div></div>
            </div>`;
        }).join('');

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="video-wrapper">
                        <iframe id="edu-player-frame" src="${YT.getEmbedUrl(vId)}" frameborder="0" allowfullscreen style="width:100%; height:100%;"></iframe>
                        <video id="stream-player" controls style="display:none; width:100%; height:100%;"></video>
                    </div>
                    <h2>${video.snippet.title}</h2>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; padding:12px; border-radius:12px;">
                        <div>${video.snippet.channelTitle}</div>
                        <div>
                            <button class="btn" style="background:#333; color:white; padding:8px 12px; border-radius:20px; border:none; cursor:pointer; margin-right:8px;" onclick="Actions.switchMode('${vId}')">再生モード切替</button>
                            <button class="btn" style="background:white; color:black; padding:8px 16px; border-radius:20px; border:none; font-weight:bold; cursor:pointer;" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g,"")}', '${video.snippet.thumbnails.high.url}')">登録</button>
                        </div>
                    </div>
                </div>
                <div class="related-area"><h3>関連動画</h3>${relatedHtml}</div>
            </div>`;
    },

    // --- その他基本機能 ---
    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        this.currentView = "search";
        document.getElementById('filter-bar').style.display = 'flex';
        let params = { q, part: 'snippet', type: 'video', maxResults: 24, videoEmbeddable: 'true', regionCode: 'JP' };
        if (this.currentFilter === 'today') params.publishedAfter = new Date(Date.now() - 86400000).toISOString();
        else if (this.currentFilter === 'short') params.videoDuration = 'short';
        else if (this.currentFilter === 'live') params.eventType = 'live';
        const data = await YT.fetchAPI('search', params);
        this.currentList = data.items;
        this.renderGrid(`「${q}」の結果`, this.currentFilter === 'short' ? "grid shorts-mode" : "grid");
    },

    async goHome() {
        this.currentView = "home";
        document.getElementById('filter-bar').style.display = 'none';
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items;
        this.renderGrid("<h2>急上昇</h2>");
    },

    handleSub(id, name, thumb) {
        const added = Storage.toggleSub(id, name, thumb);
        alert(added ? "チャンネル登録したぜ！" : "登録解除したぜ！");
    },

    async updateSuggest() {
        const q = document.getElementById('search-input').value;
        const box = document.getElementById('suggest-box');
        if (!q) { box.style.display = 'none'; return; }
        const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        box.innerHTML = data[1].map(h => `<div class="suggest-item" onclick="document.getElementById('search-input').value='${h}'; Actions.search();">${h}</div>`).join('');
        box.style.display = data[1].length ? 'block' : 'none';
    },

    async switchMode(vId) {
        this.currentPlayMode = (this.currentPlayMode === 'edu') ? 'stream' : 'edu';
        const edu = document.getElementById('edu-player-frame');
        const stream = document.getElementById('stream-player');
        if (this.currentPlayMode === 'stream') {
            edu.style.display = 'none'; stream.style.display = 'block';
            const video = document.getElementById('stream-player');
            const streamUrl = `/api/stream?v=${vId}`;
            if (Hls.isSupported()) {
                const hls = new Hls(); hls.loadSource(streamUrl); hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            } else { video.src = streamUrl; video.play(); }
        } else {
            stream.style.display = 'none'; edu.style.display = 'block'; stream.pause();
        }
    },

    // --- ゲームボタン復旧 ---
    showGame() {
        if (window.showGamePlatform) {
            window.showGamePlatform();
        } else {
            alert("ゲームエンジンの読み込みを待ってくれ！");
        }
    },

    toggleSecret() {
        Storage.isSecret = !Storage.isSecret;
        document.getElementById('secret-btn').classList.toggle('active', Storage.isSecret);
        alert(Storage.isSecret ? "シークレットモードON" : "シークレットモードOFF");
    }
};

Actions.init();
