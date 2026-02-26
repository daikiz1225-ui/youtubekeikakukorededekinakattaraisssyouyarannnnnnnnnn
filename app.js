/**
 * ====================================================================
 * YouTube API 連携エンジン - だいき指定キー & wwドメイン 最終形態
 * ====================================================================
 */

const YT = {
    // APIキー配列：クォータ制限（403エラー）対策で自動ローテーション
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", 
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", 
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", 
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", 
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],

    /**
     * 【生命線】だいきが提示した本物のEducationキー。
     * これを embed_config に指定しないと物理的に再生できない。
     */
    eduKey: "AXH1ezmE_v336TVTwFT0bRl9td5N7ViunPqRn5m7lu6RhlT-Dy5rQDNm5MIajLnH-2uskwjSHzXzn69ZVvJTvYLCby4J7yJ-0BBBq0bYA9COclx1NTEBcpiXhQqllllb-qEPX6eCO8_CXSCmSmzyIIiCdPVDUJkuBA==",

    /**
     * APIフェッチコア関数
     * 403エラーを検知して自動でキーを切り替える
     */
    async fetchAPI(endpoint, params) {
        let keyIndex = parseInt(localStorage.getItem('yt_key_index')) || 0;
        const queryParams = new URLSearchParams({ ...params, key: this.keys[keyIndex] }).toString();
        const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.status === 403 || (data.error && data.error.code === 403)) {
                console.warn("API Key limit reached. Rotating key...");
                keyIndex = (keyIndex + 1) % this.keys.length;
                localStorage.setItem('yt_key_index', keyIndex);
                return this.fetchAPI(endpoint, params);
            }
            return data;
        } catch (error) {
            console.error("API Fetch Error:", error);
            return null;
        }
    },

    /**
     * だいき指定の「ww.youtubeeducation.com」と
     * お前がくれた「本物キー」を完璧に結合する
     */
    getEmbedUrl(id) {
        if (!id) return "";
        // 構造：https://ww.youtubeeducation.com/embed/(動画ID)?(パラメータ)&embed_config=(本物キー)
        const baseUrl = `https://ww.youtubeeducation.com/embed/${id}`;
        const params = `?rel=0&modestbranding=1&iv_load_policy=3&autoplay=1&embed_config=${this.eduKey}`;
        return baseUrl + params;
    }
};

/**
 * Storage: 履歴、登録チャンネル、シークレット設定の管理
 */
const Storage = {
    isSecret: false,
    
    get(key) { 
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : []; 
    },
    
    set(key, val) { 
        localStorage.setItem(key, JSON.stringify(val)); 
    },
    
    addHistory(video) {
        if (this.isSecret) return;
        const vId = Actions.getPureId(video);
        if (!vId) return;

        let history = this.get('yt_history');
        const newItem = {
            id: vId,
            title: video.snippet.title,
            thumb: video.snippet.thumbnails.high.url,
            channelTitle: video.snippet.channelTitle,
            channelId: video.snippet.channelId,
            time: Date.now()
        };
        
        // 重複削除と100件制限
        history = [newItem, ...history.filter(h => h.id !== vId)].slice(0, 100);
        this.set('yt_history', history);
    }
};

/**
 * Actions: 全てのUI制御とページ遷移
 */
const Actions = {
    currentList: [],
    selectedChannels: [],
    currentPlayMode: 'edu',

    /**
     * 初期化：iPad SafariでのEnterキー問題を物理的に解決
     */
    init() {
        this.goHome();
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.onkeydown = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault(); // ページリロードを阻止
                    this.search('normal');
                    searchInput.blur(); // iPadのキーボードを閉じる
                }
            };
        }
    },

    /**
     * 動画ID抽出：APIの全レスポンス階層を網羅
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
        if (item.id && typeof item.id !== 'object') return item.id;
        return null;
    },

    /**
     * 急上昇動画
     */
    async goHome() {
        const data = await YT.fetchAPI('videos', { 
            chart: 'mostPopular', 
            regionCode: 'JP', 
            part: 'snippet,contentDetails', 
            maxResults: 48 
        });
        this.currentList = data.items || [];
        this.renderGrid("<h2>🔥 急上昇動画</h2>");
    },

    /**
     * 検索機能
     */
    async search(mode = 'normal') {
        const query = document.getElementById('search-input').value;
        let params = { 
            q: query, 
            part: 'snippet', 
            type: 'video', 
            maxResults: 48, 
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
        this.renderGrid(`<h2>🔍 検索結果: ${query || 'すべて'}</h2>`, mode === 'short' ? "grid shorts-mode" : "grid");
    },

    async showShorts() { await this.search('short'); },
    async showLiveHub() { await this.search('live'); },

    /**
     * チャンネルページ
     */
    async showChannel(chId, sortMode = 'date') {
        if (!chId) return;
        
        let data;
        let label = "";

        if (sortMode === 'playlists') {
            data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 50 });
            this.currentList = (data.items || []).map(p => ({ ...p, isPlaylist: true }));
            label = "公開プレイリスト";
        } else {
            const order = (sortMode === 'popular') ? 'viewCount' : 'date';
            data = await YT.fetchAPI('search', { 
                channelId: chId, 
                part: 'snippet', 
                type: 'video', 
                order: order, 
                maxResults: 50 
            });
            this.currentList = data.items || [];
            label = (sortMode === 'popular') ? "人気の動画" : "最新の動画";
        }
        
        const chName = (this.currentList.length > 0) ? this.currentList[0].snippet.channelTitle : "Channel";
        
        const header = `
            <div style="margin-bottom:30px;">
                <h2 style="font-size:24px; margin-bottom:15px;">👤 ${chName}</h2>
                <div class="ch-tabs" style="display:flex; gap:10px;">
                    <button class="${sortMode==='date'?'active':''}" onclick="Actions.showChannel('${chId}', 'date')">新着</button>
                    <button class="${sortMode==='popular'?'active':''}" onclick="Actions.showChannel('${chId}', 'popular')">人気</button>
                    <button class="${sortMode==='playlists'?'active':''}" onclick="Actions.showChannel('${chId}', 'playlists')">リスト</button>
                </div>
                <div style="margin-top:15px; color:var(--accent-blue); font-weight:bold;">${label}</div>
            </div>`;
        this.renderGrid(header);
    },

    /**
     * プレイリスト展開
     */
    async showPlaylistItems(plId) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: plId, part: 'snippet', maxResults: 50 });
        this.currentList = (data.items || []).map(i => ({
            id: i.snippet.resourceId.videoId,
            snippet: i.snippet
        }));
        this.renderGrid(`<h2>📂 リスト内の動画</h2>`);
    },

    /**
     * グリッドレンダリング：お猿さんエラーを物理的に遮断
     */
    renderGrid(headerHtml, gridClass = "grid") {
        const html = this.currentList.map((v, i) => {
            const vId = this.getPureId(v);
            const thumb = v.snippet?.thumbnails?.high?.url || '';
            const title = v.snippet?.title || 'No Title';
            const chName = v.snippet?.channelTitle || '';
            const chId = v.snippet?.channelId || '';
            
            return `
            <div class="v-card" style="cursor:default;">
                <div class="thumb-wrap" style="cursor:pointer;" onclick="Actions.handleCardClick(${i})">
                    <img src="${thumb}" loading="lazy">
                </div>
                <div class="v-info">
                    <div class="v-title" style="cursor:pointer; margin-bottom:8px;" onclick="Actions.handleCardClick(${i})">${title}</div>
                    <div class="v-ch">
                        <span onclick="event.stopPropagation(); Actions.showChannel('${chId}')" 
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

    handleCardClick(index) {
        const item = this.currentList[index];
        const id = this.getPureId(item);
        if (!id) return alert("vIdエラー: 動画が見つかりません。");
        
        if (item.isPlaylist || (item.id && item.id.playlistId)) {
            this.showPlaylistItems(id);
        } else {
            this.play(item);
        }
    },

    /**
     * 【重要】再生画面：だいき指定のURLをiframeにセット
     */
    async play(video) {
        const vId = this.getPureId(video);
        if (!vId) return;

        Storage.addHistory(video);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="video-wrapper" style="background:#000; aspect-ratio:16/9;">
                    <iframe id="edu-player" src="${YT.getEmbedUrl(vId)}" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>
                    <video id="stream-player" style="display:none; width:100%; height:100%;" controls playsinline></video>
                </div>
                
                <div class="play-bar" style="padding:20px; background:var(--bg-card); border-radius:15px; margin-top:20px;">
                    <div style="flex:1;">
                        <div style="font-weight:bold; font-size:20px; color:#fff; margin-bottom:12px;">${video.snippet.title}</div>
                        <div style="color:var(--accent-blue); font-weight:bold; cursor:pointer;" onclick="Actions.showChannel('${video.snippet.channelId}')">
                            ${video.snippet.channelTitle} 👤
                        </div>
                    </div>
                    <div style="display:flex; gap:15px; margin-top:20px;">
                        <button class="mode-btn" onclick="Actions.switchMode('${vId}')">再生切替</button>
                        <button class="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g,"")}', '${video.snippet.thumbnails.high.url}')">登録</button>
                    </div>
                </div>
            </div>`;
        window.scrollTo(0, 0);
    },

    /**
     * ストリーミング切替
     */
    async switchMode(vId) {
        this.currentPlayMode = (this.currentPlayMode === 'edu') ? 'stream' : 'edu';
        const edu = document.getElementById('edu-player');
        const stream = document.getElementById('stream-player');

        if (this.currentPlayMode === 'stream') {
            edu.style.display = 'none';
            stream.style.display = 'block';
            const m3u8 = `https://youtube-stream-proxy.vercel.app/api/m3u8?v=${vId}`;
            
            if (stream.canPlayType('application/vnd.apple.mpegurl')) {
                stream.src = m3u8;
                stream.play();
            } else if (typeof Hls !== 'undefined') {
                const hls = new Hls();
                hls.loadSource(m3u8);
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
     * 登録チャンネル画面：物理遷移を強制
     */
    showSubs() {
        const subs = Storage.get('yt_subs');
        if (subs.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2>👥 登録チャンネル</h2><p>まだ登録していません。</p>";
            return;
        }

        const html = subs.map(ch => {
            const isSel = this.selectedChannels.includes(ch.id) ? 'selected' : '';
            return `
            <div class="ch-item-container" style="text-align:center;">
                <div class="ch-item ${isSel}" onclick="Actions.handleChClick('${ch.id}')">
                    <img src="${ch.thumb}" class="ch-face" style="width:80px; height:80px; border-radius:50%;" 
                         onclick="event.stopPropagation(); Actions.showChannel('${ch.id}')">
                </div>
                <div class="ch-name-label" style="font-size:12px; margin-top:8px;">${ch.name}</div>
            </div>`;
        }).join('');

        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h2 style="margin-bottom:25px;">👥 登録チャンネル (案A)</h2>
                <div class="subs-horizontal-list" style="display:flex; overflow-x:auto; gap:20px;">${html}</div>
                <button onclick="Actions.loadSelectedNews()" class="load-feed-btn" 
                        style="width:100%; margin-top:30px; padding:20px; background:var(--accent-blue); color:#fff; border-radius:40px; border:none; font-weight:bold; font-size:18px;">
                    選択したチャンネルの新着を読み込む
                </button>
            </div>`;
    },

    handleChClick(id) {
        const idx = this.selectedChannels.indexOf(id);
        if (idx > -1) this.selectedChannels.splice(idx, 1);
        else if (this.selectedChannels.length < 5) this.selectedChannels.push(id);
        this.showSubs();
    },

    async loadSelectedNews() {
        if (this.selectedChannels.length === 0) return alert("チャンネルを選択してくれ。");
        let all = [];
        for (const cid of this.selectedChannels) {
            const res = await YT.fetchAPI('search', { channelId: cid, part: 'snippet', type: 'video', order: 'date', maxResults: 6 });
            if (res && res.items) all.push(...res.items);
        }
        all.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = all;
        this.renderGrid("<h2>🔔 登録チャンネルの新着</h2>");
    },

    showHistory() {
        const h = Storage.get('yt_history');
        if (h.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2>🕒 再生履歴</h2><p>履歴なし</p>";
            return;
        }
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
        const i = s.findIndex(x => x.id === id);
        if (i > -1) s.splice(i, 1); else s.push({ id, name, thumb });
        Storage.set('yt_subs', s);
        alert(i === -1 ? "登録したぜ" : "解除したぜ");
    },

    showGame() { if(window.showGamePlatform) window.showGamePlatform(); }
};

// 起動
Actions.init();
console.log("YouTube Education System - FINAL BUILD - No Omissions");
