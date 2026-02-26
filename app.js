const YT = {
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"],
    currentEduKey: "AXH1ezmAE3vgRPcGfwKP-x8QMySX2Sc1L5ejSmbRjTuE-_q-HIR8jzGYDuaE9xpFLlo_goB3iQQBDTsJ9c0h04V6RZqjE2Le8KQULVTQBURHroB2ujwh11mxs3jKlv_VeP_HHU45QkGzad-T3gEFcKpx86UOWwnFyw==",

    async fetchAPI(endpoint, params) {
        let keyIndex = parseInt(localStorage.getItem('yt_key_index')) || 0;
        const query = new URLSearchParams({ ...params, key: this.keys[keyIndex] }).toString();
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`);
            const data = await res.json();
            if (res.status === 403 || (data.error && data.error.code === 403)) {
                keyIndex = (keyIndex + 1) % this.keys.length;
                localStorage.setItem('yt_key_index', keyIndex);
                return this.fetchAPI(endpoint, params);
            }
            return data;
        } catch (e) { return null; }
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
        const id = Actions.getId(v);
        if (!id) return;
        h = [{ id: id, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle }, ...h.filter(x => x.id !== id)].slice(0, 50);
        this.set('yt_history', h);
    }
};

const Actions = {
    currentList: [],
    selectedChannels: [],
    currentPlayMode: 'edu',

    init() {
        this.goHome();
        // iPad Enterキー対策
        const input = document.getElementById('search-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.search('normal');
                }
            });
        }
    },

    // ID取得ロジック（お猿さんエラー防止）
    getId(item) {
        if (!item.id) return null;
        if (typeof item.id === 'string') return item.id;
        return item.id.videoId || item.id.playlistId;
    },

    // ホーム (急上昇)
    async goHome() {
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 30 });
        this.currentList = data.items || [];
        this.renderGrid("<h2>急上昇</h2>");
    },

    // 検索・ショート・ライブ (専用フラグ付き)
    async search(mode = 'normal') {
        const qInput = document.getElementById('search-input');
        let q = qInput.value;
        let params = { q: q, part: 'snippet', type: 'video', maxResults: 30, regionCode: 'JP' };
        
        if (mode === 'short') {
            params.q = (q || "") + " #Shorts";
            params.videoDuration = 'short';
        } else if (mode === 'live') {
            params.eventType = 'live';
        }

        const data = await YT.fetchAPI('search', params);
        this.currentList = data.items || [];
        this.renderGrid(`<h2>検索結果: ${q || ''}</h2>`, mode === 'short' ? "grid shorts-mode" : "grid");
    },

    async showShorts() { await this.search('short'); },
    async showLiveHub() { await this.search('live'); },

    // チャンネル詳細 (新着・人気・再生リスト)
    async showChannel(chId, mode = 'date') {
        let data;
        let title = "";
        if (mode === 'playlists') {
            data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 30 });
            this.currentList = (data.items || []).map(p => ({ ...p, isPlaylist: true }));
            title = "再生リスト";
        } else {
            const order = (mode === 'popular') ? 'viewCount' : 'date';
            data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 30 });
            this.currentList = data.items || [];
            title = (mode === 'popular') ? "人気順" : "新着順";
        }
        const tabs = `
            <div class="ch-tabs">
                <button class="${mode==='date'?'active':''}" onclick="Actions.showChannel('${chId}', 'date')">新着</button>
                <button class="${mode==='popular'?'active':''}" onclick="Actions.showChannel('${chId}', 'popular')">人気</button>
                <button class="${mode==='playlists'?'active':''}" onclick="Actions.showChannel('${chId}', 'playlists')">再生リスト</button>
            </div>`;
        this.renderGrid(tabs + `<h3>${title}</h3>`);
    },

    // 再生リストの動画一覧表示
    async showPlaylistItems(plId) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: plId, part: 'snippet', maxResults: 50 });
        this.currentList = (data.items || []).map(i => ({ id: i.snippet.resourceId.videoId, snippet: i.snippet }));
        this.renderGrid(`<h2>リスト内動画</h2>`);
    },

    // グリッド描画 (iPad対応レイヤーを省略なしで実装)
    renderGrid(header, gridClass = "grid") {
        const html = this.currentList.map((v, i) => {
            const thumb = (v.snippet && v.snippet.thumbnails) ? v.snippet.thumbnails.high.url : '';
            return `
            <div class="v-card">
                <div class="v-click-layer" onclick="Actions.handleCardClick(${i})"></div>
                <div class="thumb-wrap"><img src="${thumb}"></div>
                <div class="v-info">
                    <div class="v-title">${v.snippet.title}</div>
                    <div class="v-ch">${v.snippet.channelTitle}</div>
                </div>
            </div>`;
        }).join('');
        const container = document.getElementById('view-container');
        container.innerHTML = `<div>${header}<div class="${gridClass}">${html}</div></div>`;
        container.scrollTo(0, 0);
    },

    handleCardClick(index) {
        const item = this.currentList[index];
        const id = this.getId(item);
        if (!id) return;
        if (item.isPlaylist || (item.id && item.id.playlistId)) {
            this.showPlaylistItems(id);
        } else {
            this.play(item);
        }
    },

    // 再生画面 (省略なし)
    async play(video) {
        const vId = this.getId(video);
        Storage.addHistory(video);
        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="video-wrapper">
                    <iframe id="edu-player" src="${YT.getEmbedUrl(vId)}" allowfullscreen></iframe>
                    <video id="stream-player" style="display:none;" controls playsinline></video>
                </div>
                <div class="play-bar">
                    <div style="font-weight:bold;">${video.snippet.title}<br><span style="font-weight:normal; font-size:12px; color:#aaa;">${video.snippet.channelTitle}</span></div>
                    <div>
                        <button onclick="Actions.switchMode('${vId}')" style="background:#333; color:white; border:none; padding:10px 15px; border-radius:20px; cursor:pointer; margin-right:10px;">切替</button>
                        <button onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g,"")}', '${video.snippet.thumbnails.high.url}')" style="background:white; color:black; border:none; padding:10px 20px; border-radius:20px; font-weight:bold; cursor:pointer;">登録</button>
                    </div>
                </div>
            </div>`;
    },

    // HLS ストリーミング切替 (省略なし)
    async switchMode(vId) {
        this.currentPlayMode = (this.currentPlayMode === 'edu') ? 'stream' : 'edu';
        const edu = document.getElementById('edu-player');
        const stream = document.getElementById('stream-player');
        if (this.currentPlayMode === 'stream') {
            edu.style.display = 'none'; stream.style.display = 'block';
            const streamUrl = `https://youtube-stream-proxy.vercel.app/api/m3u8?v=${vId}`;
            if (stream.canPlayType('application/vnd.apple.mpegurl')) {
                stream.src = streamUrl; stream.play();
            } else if (typeof Hls !== 'undefined') {
                const hls = new Hls(); hls.loadSource(streamUrl); hls.attachMedia(stream);
                hls.on(Hls.Events.MANIFEST_PARSED, () => stream.play());
            }
        } else {
            stream.style.display = 'none'; edu.style.display = 'block'; stream.pause();
        }
    },

    // 案A：登録チャンネルUI (省略なし)
    showSubs() {
        const subs = Storage.get('yt_subs');
        const chHtml = subs.map(ch => {
            const isSel = this.selectedChannels.includes(ch.id) ? 'selected' : '';
            return `
            <div class="ch-item-container" onclick="Actions.handleChClick(event, '${ch.id}')">
                <div class="ch-item ${isSel}"><img src="${ch.thumb}" class="ch-face"></div>
                <div style="font-size:12px; margin-top:8px; width:94px; overflow:hidden; white-space:nowrap;">${ch.name}</div>
            </div>`;
        }).join('');
        document.getElementById('view-container').innerHTML = `
            <div style="padding:10px;">
                <h2>登録済みチャンネル</h2>
                <div style="display:flex; overflow-x:auto; gap:10px; border-bottom:1px solid #333; padding-bottom:15px; -webkit-overflow-scrolling:touch;">${chHtml}</div>
                <button onclick="Actions.loadSelectedNews()" style="width:100%; max-width:400px; display:block; margin:20px auto; padding:15px; border-radius:30px; border:none; background:var(--accent-blue); color:white; font-weight:bold; cursor:pointer;">選択した新着を表示</button>
            </div>`;
    },

    handleChClick(e, chId) {
        if (e.target.tagName === 'IMG') {
            e.stopPropagation();
            this.showChannel(chId);
        } else {
            const idx = this.selectedChannels.indexOf(chId);
            if (idx > -1) this.selectedChannels.splice(idx, 1);
            else if (this.selectedChannels.length < 5) this.selectedChannels.push(chId);
            this.showSubs();
        }
    },

    async loadSelectedNews() {
        if (this.selectedChannels.length === 0) return alert("チャンネルを選んでくれ");
        const all = [];
        for (const id of this.selectedChannels) {
            const d = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order: 'date', maxResults: 4 });
            if (d.items) all.push(...d.items);
        }
        all.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = all;
        this.renderGrid("<h2>新着フィード</h2>");
    },

    // 履歴表示
    showHistory() {
        const h = Storage.get('yt_history');
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>再生履歴</h2>");
    },

    // シークレット切替
    toggleSecret() {
        Storage.isSecret = !Storage.isSecret;
        const btn = document.getElementById('secret-btn');
        if (btn) btn.classList.toggle('active', Storage.isSecret);
        alert(Storage.isSecret ? "シークレットモードON" : "シークレットモードOFF");
    },

    // 登録処理
    handleSub(id, name, thumb) {
        let s = Storage.get('yt_subs');
        const idx = s.findIndex(x => x.id === id);
        if (idx > -1) s.splice(idx, 1);
        else s.push({ id, name, thumb });
        Storage.set('yt_subs', s);
        alert("登録リストを更新したぜ");
    },

    // ゲーム (game.jsの関数を呼ぶ前提)
    showGame() { if (window.showGamePlatform) window.showGamePlatform(); }
};

// 初期化
Actions.init();
