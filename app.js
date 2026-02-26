const YT = {
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"],
    currentEduKey: "AXH1ezmAE3vgRPcGfwKP-x8QMySX2Sc1L5ejSmbRjTuE-_q-HIR8jzGYDuaE9xpFLlo_goB3iQQBDTsJ9c0h04V6RZqjE2Le8KQULVTQBURHroB2ujwh11mxs3jKlv_VeP_HHU45QkGzad-T3gEFcKpx86UOWwnFyw==",

    async fetchAPI(endpoint, params) {
        let keyIndex = parseInt(localStorage.getItem('yt_key_index')) || 0;
        const query = new URLSearchParams({ ...params, key: this.keys[keyIndex] }).toString();
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`);
            const data = await res.json();
            if (res.status === 403) {
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
    currentList: [],
    selectedChannels: [],
    currentPlayMode: 'edu',

    init() {
        this.goHome();
    },

    // 1. 再生リストの中身を表示
    async showPlaylistItems(plId) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: plId, part: 'snippet', maxResults: 50 });
        this.currentList = data.items.map(i => ({ id: i.snippet.resourceId.videoId, snippet: i.snippet }));
        this.renderGrid(`<h2>リスト動画一覧</h2>`);
    },

    // 2. チャンネル詳細（新着・人気・再生リスト）
    async showChannel(chId, mode = 'date') {
        let data;
        let title = "動画一覧";
        if (mode === 'playlists') {
            data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 30 });
            this.currentList = data.items.map(p => ({ id: p.id, snippet: p.snippet, isPlaylist: true }));
            title = "再生リスト";
        } else {
            const order = (mode === 'popular') ? 'viewCount' : 'date';
            data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 30 });
            this.currentList = data.items;
            title = (mode === 'popular') ? "人気順" : "新着順";
        }

        const tabs = `
            <div class="ch-tabs">
                <button class="${mode==='date'?'active':''}" onclick="Actions.showChannel('${chId}', 'date')">新着順</button>
                <button class="${mode==='popular'?'active':''}" onclick="Actions.showChannel('${chId}', 'popular')">人気順</button>
                <button class="${mode==='playlists'?'active':''}" onclick="Actions.showChannel('${chId}', 'playlists')">再生リスト</button>
            </div>`;
        this.renderGrid(tabs + `<h3>${title}</h3>`);
    },

    // 3. 動画カードの描画（クリック判定レイヤー付き）
    renderGrid(headerHtml, gridClass = "grid") {
        const html = this.currentList.map((v, i) => {
            const thumb = v.snippet.thumbnails ? v.snippet.thumbnails.high.url : '';
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
        document.getElementById('view-container').innerHTML = `<div>${headerHtml}<div class="${gridClass}">${html}</div></div>`;
        window.scrollTo(0, 0);
    },

    handleCardClick(index) {
        const item = this.currentList[index];
        if (!item) return;
        if (item.isPlaylist) {
            this.showPlaylistItems(item.id);
        } else {
            this.play(item);
        }
    },

    // 4. 再生画面
    async play(video) {
        const vId = video.id.videoId || video.id;
        Storage.addHistory(video);
        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="video-wrapper">
                        <iframe id="edu-player" src="${YT.getEmbedUrl(vId)}" allowfullscreen></iframe>
                        <video id="stream-player" style="display:none; width:100%; height:100%;" controls></video>
                    </div>
                    <h2 style="margin:20px 0;">${video.snippet.title}</h2>
                    <div class="play-sub-bar">
                        <div style="font-weight:bold;">${video.snippet.channelTitle}</div>
                        <div>
                            <button onclick="Actions.switchMode('${vId}')" style="margin-right:10px; padding:8px 15px; border-radius:20px; border:none; background:#333; color:white; cursor:pointer;">モード切替</button>
                            <button onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g,"")}', '${video.snippet.thumbnails.high.url}')" style="background:white; color:black; padding:8px 20px; border-radius:20px; border:none; font-weight:bold; cursor:pointer;">登録</button>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    async switchMode(vId) {
        this.currentPlayMode = (this.currentPlayMode === 'edu') ? 'stream' : 'edu';
        const edu = document.getElementById('edu-player');
        const stream = document.getElementById('stream-player');
        if (this.currentPlayMode === 'stream') {
            edu.style.display = 'none'; stream.style.display = 'block';
            const streamUrl = `/api/stream?v=${vId}`;
            if (Hls.isSupported()) {
                const hls = new Hls(); hls.loadSource(streamUrl); hls.attachMedia(stream);
                hls.on(Hls.Events.MANIFEST_PARSED, () => stream.play());
            } else { stream.src = streamUrl; stream.play(); }
        } else {
            stream.style.display = 'none'; edu.style.display = 'block'; stream.pause();
        }
    },

    // 5. 登録チャンネル画面 (案A)
    showSubs() {
        const subs = Storage.get('yt_subs');
        const chHtml = subs.map(ch => {
            const isSel = this.selectedChannels.includes(ch.id) ? 'selected' : '';
            return `
            <div class="ch-item-container" onclick="Actions.handleChClick(event, '${ch.id}')">
                <div class="ch-item ${isSel}"><img src="${ch.thumb}" class="ch-face"></div>
                <div style="font-size:12px; margin-top:8px; width:94px; overflow:hidden;">${ch.name}</div>
            </div>`;
        }).join('');
        document.getElementById('view-container').innerHTML = `
            <div style="padding:10px;">
                <h2>登録済みチャンネル</h2>
                <div style="display:flex; overflow-x:auto; gap:10px; border-bottom:1px solid #333; padding-bottom:15px;">${chHtml}</div>
                <button id="load-news-btn" onclick="Actions.loadSelectedNews()" style="width:100%; max-width:400px; display:block; margin:20px auto; padding:15px; border-radius:30px; border:none; background:var(--accent-blue); color:white; font-weight:bold; cursor:pointer;">この5人の新着を読み込む</button>
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
        const btn = document.getElementById('load-news-btn');
        btn.innerText = "読み込み中..."; btn.disabled = true;
        const all = [];
        for (const id of this.selectedChannels) {
            const d = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order: 'date', maxResults: 4 });
            if (d.items) all.push(...d.items);
        }
        all.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = all;
        this.renderGrid("<h2>新着フィード</h2>");
    },

    // 6. 検索とサイドバー
    async search(filter = 'none') {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        let params = { q, part: 'snippet', type: 'video', maxResults: 30, regionCode: 'JP' };
        if (filter === 'short') params.videoDuration = 'short';
        if (filter === 'live') params.eventType = 'live';

        const data = await YT.fetchAPI('search', params);
        this.currentList = data.items;
        this.renderGrid(`<h2>検索結果: ${q}</h2>`, filter === 'short' ? 'grid shorts-mode' : 'grid');
    },

    showShorts() {
        document.getElementById('search-input').value = "#Shorts";
        this.search('short');
    },

    async showLiveHub() {
        const data = await YT.fetchAPI('search', { eventType: 'live', type: 'video', part: 'snippet', maxResults: 30, regionCode: 'JP' });
        this.currentList = data.items;
        this.renderGrid("<h2>ライブ配信中</h2>");
    },

    async goHome() {
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 30 });
        this.currentList = data.items;
        this.renderGrid("<h2>急上昇</h2>");
    },

    showHistory() {
        const h = Storage.get('yt_history');
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>再生履歴</h2>");
    },

    toggleSecret() {
        Storage.isSecret = !Storage.isSecret;
        document.getElementById('secret-btn').classList.toggle('active', Storage.isSecret);
        alert(Storage.isSecret ? "シークレットON" : "シークレットOFF");
    },

    showGame() { if (window.showGamePlatform) window.showGamePlatform(); },

    handleSub(id, name, thumb) {
        Storage.toggleSub(id, name, thumb);
        alert("登録を更新したぜ");
    }
};

Actions.init();
