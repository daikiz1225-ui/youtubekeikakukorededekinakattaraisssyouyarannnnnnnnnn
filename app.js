/**
 * YouTube API 連携コアシステム
 */
const YT = {
    // APIキー配列：403（クォータ制限）時に自動ローテーション
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", 
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", 
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", 
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", 
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    // YouTube Education ドメイン用設定
    currentEduKey: "AXH1ezmAE3vgRPcGfwKP-x8QMySX2Sc1L5ejSmbRjTuE-_q-HIR8jzGYDuaE9xpFLlo_goB3iQQBDTsJ9c0h04V6RZqjE2Le8KQULVTQBURHroB2ujwh11mxs3jKlv_VeP_HHU45QkGzad-T3gEFcKpx86UOWwnFyw==",

    /**
     * APIフェッチ
     * エラーハンドリングとキー切り替えを内包
     */
    async fetchAPI(endpoint, params) {
        let keyIndex = parseInt(localStorage.getItem('yt_key_index')) || 0;
        const queryParams = new URLSearchParams({ ...params, key: this.keys[keyIndex] }).toString();
        const apiUrl = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams}`;

        try {
            const res = await fetch(apiUrl);
            const data = await res.json();
            
            // クォータ制限（403）時の処理
            if (res.status === 403 || (data.error && data.error.code === 403)) {
                console.warn("Quota limit reached. Switching keys...");
                keyIndex = (keyIndex + 1) % this.keys.length;
                localStorage.setItem('yt_key_index', keyIndex);
                return this.fetchAPI(endpoint, params);
            }
            return data;
        } catch (e) {
            console.error("Critical API Error:", e);
            return null;
        }
    },

    /**
     * 埋め込みプレイヤーURL生成
     */
    getEmbedUrl(id) {
        return `https://www.youtubeeducation.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=1&embed_config=${this.currentEduKey}`;
    }
};

/**
 * データ管理（履歴・登録・シークレット）
 */
const Storage = {
    isSecret: false,
    
    get(key) { 
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : []; 
    },
    
    set(key, val) { 
        localStorage.setItem(key, JSON.stringify(val)); 
    },
    
    // 再生履歴の追加
    addHistory(video) {
        if (this.isSecret) return;
        const id = Actions.getPureId(video);
        if (!id) return;

        let history = this.get('yt_history');
        const newItem = {
            id: id,
            title: video.snippet.title,
            thumb: video.snippet.thumbnails.high.url,
            channelTitle: video.snippet.channelTitle,
            channelId: video.snippet.channelId,
            timestamp: Date.now()
        };
        // 重複削除と100件制限
        history = [newItem, ...history.filter(item => item.id !== id)].slice(0, 100);
        this.set('yt_history', history);
    }
};

/**
 * UI・アクション制御
 */
const Actions = {
    currentList: [],
    selectedChannels: [],
    currentPlayMode: 'edu',

    /**
     * 初期化：iPad Safari対策
     */
    init() {
        this.goHome();
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.search('normal');
                    searchInput.blur(); // キーボードを閉じる
                }
            };
        }
    },

    /**
     * 【お猿さん対策】動画IDを全パターンから抽出
     */
    getPureId(item) {
        if (!item) return null;
        if (typeof item.id === 'string') return item.id;
        if (item.id && item.id.videoId) return item.id.videoId;
        if (item.id && item.id.playlistId) return item.id.playlistId;
        if (item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId) {
            return item.snippet.resourceId.videoId;
        }
        if (item.snippet && item.snippet.videoId) return item.snippet.videoId;
        if (item.videoId) return item.videoId;
        return null;
    },

    /**
     * ホーム（急上昇）表示
     */
    async goHome() {
        const data = await YT.fetchAPI('videos', { 
            chart: 'mostPopular', 
            regionCode: 'JP', 
            part: 'snippet,contentDetails', 
            maxResults: 50 
        });
        this.currentList = data.items || [];
        this.renderGrid("<h2>🔥 急上昇</h2>");
    },

    /**
     * 検索機能（通常・ショート・ライブ）
     */
    async search(mode = 'normal') {
        const query = document.getElementById('search-input').value;
        let params = { 
            q: query, 
            part: 'snippet', 
            type: 'video', 
            maxResults: 50, 
            regionCode: 'JP' 
        };
        
        if (mode === 'short') {
            params.q = (query || "") + " #Shorts";
            params.videoDuration = 'short';
        } else if (mode === 'live') {
            params.eventType = 'live';
        }

        const data = await YT.fetchAPI('search', params);
        this.currentList = data.items || [];
        this.renderGrid(`<h2>🔍 検索: ${query || 'すべて'}</h2>`, mode === 'short' ? "grid shorts-mode" : "grid");
    },

    async showShorts() { await this.search('short'); },
    async showLiveHub() { await this.search('live'); },

    /**
     * チャンネル詳細：3タブ切り替え
     */
    async showChannel(chId, mode = 'date') {
        if (!chId) return;
        let data;
        let suffix = "";

        if (mode === 'playlists') {
            data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 50 });
            this.currentList = (data.items || []).map(p => ({ ...p, isPlaylist: true }));
            suffix = "再生リスト";
        } else {
            const order = (mode === 'popular') ? 'viewCount' : 'date';
            data = await YT.fetchAPI('search', { 
                channelId: chId, 
                part: 'snippet', 
                type: 'video', 
                order: order, 
                maxResults: 50 
            });
            this.currentList = data.items || [];
            suffix = (mode === 'popular') ? "人気順" : "新着順";
        }
        
        const chName = (this.currentList.length > 0) ? this.currentList[0].snippet.channelTitle : "Channel";
        const header = `
            <div style="margin-bottom:30px;">
                <h2 style="display:flex; align-items:center; gap:12px;">👤 ${chName}</h2>
                <div class="ch-tabs">
                    <button class="${mode==='date'?'active':''}" onclick="Actions.showChannel('${chId}', 'date')">最新動画</button>
                    <button class="${mode==='popular'?'active':''}" onclick="Actions.showChannel('${chId}', 'popular')">人気動画</button>
                    <button class="${mode==='playlists'?'active':''}" onclick="Actions.showChannel('${chId}', 'playlists')">再生リスト</button>
                </div>
                <div style="margin-top:10px; color:var(--accent-blue); font-weight:bold;">${suffix}</div>
            </div>`;
        this.renderGrid(header);
    },

    /**
     * 再生リスト展開
     */
    async showPlaylistItems(plId) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: plId, part: 'snippet', maxResults: 50 });
        this.currentList = (data.items || []).map(i => ({
            id: i.snippet.resourceId.videoId,
            snippet: i.snippet
        }));
        this.renderGrid(`<h2>📂 プレイリスト一覧</h2>`);
    },

    /**
     * グリッドレンダリング
     * 【重要】お猿さんを回避するためにクリック領域を完全分離
     */
    renderGrid(headerHtml, gridClass = "grid") {
        const html = this.currentList.map((v, i) => {
            const vId = this.getPureId(v);
            const thumb = v.snippet?.thumbnails?.high?.url || '';
            const title = v.snippet?.title || 'No Title';
            const chName = v.snippet?.channelTitle || '';
            const chId = v.snippet?.channelId || '';
            
            return `
            <div class="v-card" style="position:relative;">
                <div class="thumb-wrap" style="cursor:pointer;" onclick="Actions.handleCardClick(${i})">
                    <img src="${thumb}" loading="lazy">
                </div>
                <div class="v-info">
                    <div class="v-title" style="cursor:pointer;" onclick="Actions.handleCardClick(${i})">${title}</div>
                    <div class="v-ch" style="margin-top:10px; display:inline-block;">
                        <span onclick="event.stopImmediatePropagation(); Actions.showChannel('${chId}')" 
                              style="color:var(--accent-blue); font-weight:bold; cursor:pointer; text-decoration:underline;">
                            ${chName}
                        </span>
                    </div>
                </div>
            </div>`;
        }).join('');

        const container = document.getElementById('view-container');
        container.innerHTML = `<div>${headerHtml}<div class="${gridClass}">${html}</div></div>`;
        container.scrollTo(0, 0);
    },

    /**
     * クリックハンドリング：再生かリスト展開か
     */
    handleCardClick(index) {
        const item = this.currentList[index];
        const id = this.getPureId(item);
        if (!id) return alert("動画IDの取得に失敗しました。");

        if (item.isPlaylist || (item.id && item.id.playlistId)) {
            this.showPlaylistItems(id);
        } else {
            this.play(item);
        }
    },

    /**
     * 動画再生
     */
    async play(video) {
        const vId = this.getPureId(video);
        if (!vId) return;
        Storage.addHistory(video);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="video-wrapper">
                    <iframe id="edu-player" src="${YT.getEmbedUrl(vId)}" allowfullscreen></iframe>
                    <video id="stream-player" style="display:none;" controls playsinline></video>
                </div>
                <div class="play-bar">
                    <div style="flex:1;">
                        <div style="font-weight:bold; font-size:18px; margin-bottom:8px;">${video.snippet.title}</div>
                        <div style="color:var(--accent-blue); font-weight:bold; cursor:pointer;" onclick="Actions.showChannel('${video.snippet.channelId}')">
                            ${video.snippet.channelTitle} ➔
                        </div>
                    </div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <button onclick="Actions.switchMode('${vId}')" class="mode-btn">再生切替</button>
                        <button onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g,"")}', '${video.snippet.thumbnails.high.url}')" class="sub-btn">登録</button>
                    </div>
                </div>
            </div>`;
        window.scrollTo(0, 0);
    },

    /**
     * ストリーミング（HLS）切替
     */
    async switchMode(vId) {
        this.currentPlayMode = (this.currentPlayMode === 'edu') ? 'stream' : 'edu';
        const edu = document.getElementById('edu-player');
        const stream = document.getElementById('stream-player');

        if (this.currentPlayMode === 'stream') {
            edu.style.display = 'none';
            stream.style.display = 'block';
            const m3u8Url = `https://youtube-stream-proxy.vercel.app/api/m3u8?v=${vId}`;
            
            if (stream.canPlayType('application/vnd.apple.mpegurl')) {
                stream.src = m3u8Url;
                stream.play();
            } else if (typeof Hls !== 'undefined') {
                const hls = new Hls();
                hls.loadSource(m3u8Url);
                hls.attachMedia(stream);
                hls.on(Hls.Events.MANIFEST_PARSED, () => stream.play());
            }
        } else {
            stream.style.display = 'none';
            edu.style.display = 'block';
            stream.pause();
        }
    },

    /**
     * 登録チャンネル案A：物理遷移修正版
     */
    showSubs() {
        const subs = Storage.get('yt_subs');
        if (subs.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2>👥 登録チャンネル</h2><p>まだ登録されていません。</p>";
            return;
        }

        const chHtml = subs.map(ch => {
            const isSel = this.selectedChannels.includes(ch.id) ? 'selected' : '';
            return `
            <div class="ch-item-container" style="text-align:center;">
                <div class="ch-item ${isSel}" onclick="Actions.handleChClick('${ch.id}')">
                    <img src="${ch.thumb}" class="ch-face" onclick="event.stopPropagation(); Actions.showChannel('${ch.id}')">
                </div>
                <div class="ch-name-label">${ch.name}</div>
            </div>`;
        }).join('');

        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h2 style="margin-bottom:20px;">👥 登録チャンネル (案A)</h2>
                <div class="subs-horizontal-list">${chHtml}</div>
                <div style="text-align:center; padding-top:40px;">
                    <button onclick="Actions.loadSelectedNews()" class="load-feed-btn">選択したチャンネルの新着を表示</button>
                </div>
            </div>`;
    },

    handleChClick(chId) {
        const idx = this.selectedChannels.indexOf(chId);
        if (idx > -1) this.selectedChannels.splice(idx, 1);
        else if (this.selectedChannels.length < 5) this.selectedChannels.push(chId);
        this.showSubs();
    },

    async loadSelectedNews() {
        if (this.selectedChannels.length === 0) return alert("チャンネルを選択してください");
        const all = [];
        for (const id of this.selectedChannels) {
            const d = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order: 'date', maxResults: 5 });
            if (d && d.items) all.push(...d.items);
        }
        all.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = all;
        this.renderGrid("<h2>🔔 選択中チャンネルの新着</h2>");
    },

    /**
     * 履歴・シークレット
     */
    showHistory() {
        const h = Storage.get('yt_history');
        this.currentList = h.map(x => ({ 
            id: x.id, 
            snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId } 
        }));
        this.renderGrid("<h2>🕒 再生履歴</h2>");
    },

    toggleSecret() {
        Storage.isSecret = !Storage.isSecret;
        document.getElementById('secret-btn')?.classList.toggle('active', Storage.isSecret);
        alert(Storage.isSecret ? "シークレットモード ON" : "シークレットモード OFF");
    },

    handleSub(id, name, thumb) {
        let s = Storage.get('yt_subs');
        const idx = s.findIndex(x => x.id === id);
        if (idx > -1) {
            s.splice(idx, 1);
            alert(`${name} の登録を解除しました`);
        } else {
            s.push({ id, name, thumb });
            alert(`${name} を登録しました`);
        }
        Storage.set('yt_subs', s);
    },

    showGame() { window.showGamePlatform?.(); }
};

// 起動
Actions.init();
