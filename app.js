/**
 * ====================================================================
 * YouTube API 連携エンジン - Education & vId 鉄壁版
 * ====================================================================
 */

const YT = {
    // APIキー配列（クォータ制限対策）
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", 
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", 
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", 
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", 
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],

    /**
     * 【重要】だいきが提示した Education 専用の embed_config キー
     * これが動画視聴の生命線。
     */
    currentEduKey: "AXH1ezmAE3vgRPcGfwKP-x8QMySX2Sc1L5ejSmbRjTuE-_q-HIR8jzGYDuaE9xpFLlo_goB3iQQBDTsJ9c0h04V6RZqjE2Le8KQULVTQBURHroB2ujwh11mxs3jKlv_VeP_HHU45QkGzad-T3gEFcKpx86UOWwnFyw==",

    /**
     * APIフェッチコア
     */
    async fetchAPI(endpoint, params) {
        let keyIndex = parseInt(localStorage.getItem('yt_key_index')) || 0;
        const query = new URLSearchParams({ ...params, key: this.keys[keyIndex] }).toString();
        const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${query}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (res.status === 403 || (data.error && data.error.code === 403)) {
                console.warn("Quota Limit! Rotating key...");
                keyIndex = (keyIndex + 1) % this.keys.length;
                localStorage.setItem('yt_key_index', keyIndex);
                return this.fetchAPI(endpoint, params);
            }
            return data;
        } catch (e) {
            console.error("Fetch Error:", e);
            return null;
        }
    },

    /**
     * 動画IDとEducationキーをガッチャンコして最強のURLを作る
     */
    getEmbedUrl(id) {
        if (!id) return "";
        // お前が教えてくれたURL構造を1ミリも違わずに再現
        return `https://www.youtubeeducation.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=1&embed_config=${this.currentEduKey}`;
    }
};

/**
 * Storage: データの保存
 */
const Storage = {
    isSecret: false,
    
    get(key) { 
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : []; 
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
        history = [newItem, ...history.filter(h => h.id !== vId)].slice(0, 100);
        this.set('yt_history', history);
    }
};

/**
 * Actions: 全ての挙動
 */
const Actions = {
    currentList: [],
    selectedChannels: [],
    currentPlayMode: 'edu',

    /**
     * 初期化：iPad対応
     */
    init() {
        this.goHome();
        
        const input = document.getElementById('search-input');
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.search('normal');
                    input.blur(); 
                }
            };
        }
    },

    /**
     * 【お猿さん絶対殺すマン】vId 抽出ロジック
     * どんなに深い階層でも videoId を見つけ出す
     */
    getPureId(item) {
        if (!item) return null;
        
        // 1. 直値
        if (typeof item.id === 'string') return item.id;
        
        // 2. 検索レスポンス
        if (item.id && item.id.videoId) return item.id.videoId;
        
        // 3. プレイリストID
        if (item.id && item.id.playlistId) return item.id.playlistId;
        
        // 4. 再生リスト内アイテム
        if (item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId) {
            return item.snippet.resourceId.videoId;
        }
        
        // 5. 履歴などのカスタム
        if (item.snippet && item.snippet.videoId) return item.snippet.videoId;
        if (item.videoId) return item.videoId;
        
        // 6. 最終手段
        if (item.id && typeof item.id !== 'object') return item.id;

        console.error("ID Parser Failed:", item);
        return null;
    },

    /**
     * 急上昇
     */
    async goHome() {
        const data = await YT.fetchAPI('videos', { 
            chart: 'mostPopular', 
            regionCode: 'JP', 
            part: 'snippet,contentDetails', 
            maxResults: 50 
        });
        this.currentList = data.items || [];
        this.renderGrid("<h2>🔥 急上昇動画</h2>");
    },

    /**
     * 検索
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
     * チャンネル詳細：3つの顔を持つ
     */
    async showChannel(chId, sort = 'date') {
        if (!chId) return;
        
        let data;
        let info = "";

        if (sort === 'playlists') {
            data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 50 });
            this.currentList = (data.items || []).map(p => ({ ...p, isPlaylist: true }));
            info = "作成したリスト";
        } else {
            const order = (sort === 'popular') ? 'viewCount' : 'date';
            data = await YT.fetchAPI('search', { 
                channelId: chId, 
                part: 'snippet', 
                type: 'video', 
                order: order, 
                maxResults: 50 
            });
            this.currentList = data.items || [];
            info = (sort === 'popular') ? "人気の動画" : "最新の動画";
        }
        
        const chName = (this.currentList.length > 0) ? this.currentList[0].snippet.channelTitle : "Channel";
        
        const header = `
            <div style="margin-bottom:30px;">
                <h2 style="font-size:24px; margin-bottom:20px;">👤 ${chName}</h2>
                <div class="ch-tabs" style="display:flex; gap:10px;">
                    <button class="${sort==='date'?'active':''}" onclick="Actions.showChannel('${chId}', 'date')">最新</button>
                    <button class="${sort==='popular'?'active':''}" onclick="Actions.showChannel('${chId}', 'popular')">人気</button>
                    <button class="${sort==='playlists'?'active':''}" onclick="Actions.showChannel('${chId}', 'playlists')">再生リスト</button>
                </div>
                <div style="margin-top:15px; color:var(--accent-blue); font-weight:bold;">${info}</div>
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
        this.renderGrid(`<h2>📂 リスト内の動画</h2>`);
    },

    /**
     * 【修正】グリッド描画
     * クリックイベントをお猿さんに食われないよう、物理的に分断する
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
                    <div class="v-title" style="cursor:pointer;" onclick="Actions.handleCardClick(${i})">${title}</div>
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
        if (!id) return alert("vIdエラー: 動画が見つかりません");
        
        if (item.isPlaylist || (item.id && item.id.playlistId)) {
            this.showPlaylistItems(id);
        } else {
            this.play(item);
        }
    },

    /**
     * 【教育用】動画再生画面
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
     * 再生切替
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
     * 登録チャンネル案A：物理遷移保証版
     */
    showSubs() {
        const subs = Storage.get('yt_subs');
        if (subs.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2>👥 登録チャンネル</h2><p>登録がありません。</p>";
            return;
        }

        const html = subs.map(ch => {
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
                <h2 style="margin-bottom:25px;">👥 登録チャンネル (案A)</h2>
                <div class="subs-horizontal-list" style="display:flex; overflow-x:auto; gap:20px; padding-bottom:20px;">${html}</div>
                <button onclick="Actions.loadSelectedNews()" class="load-feed-btn" style="width:100%; margin-top:30px; padding:20px; background:var(--accent-blue); color:#fff; border-radius:40px; border:none; font-weight:bold; font-size:18px;">
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
        if (this.selectedChannels.length === 0) return alert("チャンネルを選んでくれ。");
        let all = [];
        for (const id of this.selectedChannels) {
            const res = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order: 'date', maxResults: 5 });
            if (res && res.items) all.push(...res.items);
        }
        all.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = all;
        this.renderGrid("<h2>🔔 登録チャンネルの新着</h2>");
    },

    showHistory() {
        const h = Storage.get('yt_history');
        this.currentList = h.map(x => ({ 
            id: x.id, 
            snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId } 
        }));
        this.renderGrid("<h2>🕒 最近見た動画</h2>");
    },

    toggleSecret() {
        Storage.isSecret = !Storage.isSecret;
        document.getElementById('secret-btn')?.classList.toggle('active', Storage.isSecret);
        alert(Storage.isSecret ? "シークレットモード ON" : "シークレットモード OFF");
    },

    handleSub(id, name, thumb) {
        let s = Storage.get('yt_subs');
        const idx = s.findIndex(x => x.id === id);
        if (idx > -1) s.splice(idx, 1); else s.push({ id, name, thumb });
        Storage.set('yt_subs', s);
        alert(idx === -1 ? `「${name}」を登録したぜ。` : `「${name}」の登録を解除したぜ。`);
    },

    showGame() { if(window.showGamePlatform) window.showGamePlatform(); }
};

// 起動
Actions.init();
console.log("YouTube Education System v3.0 - All Systems Green");
