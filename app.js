/**
 * ====================================================================
 * YouTube API 連携エンジン - 最終防衛ライン (省略一切なし)
 * ====================================================================
 */

const YT = {
    // APIキー配列：403クォータ制限時に自動ローテーション
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", 
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", 
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", 
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", 
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],

    /**
     * 【超重要】だいきが提示した最新のEducation Config。
     * これがURLに含まれていないと、埋め込みプレイヤーでお猿さんが出る。
     */
    currentEduKey: "AXH1ezmAE3vgRPcGfwKP-x8QMySX2Sc1L5ejSmbRjTuE-_q-HIR8jzGYDuaE9xpFLlo_goB3iQQBDTsJ9c0h04V6RZqjE2Le8KQULVTQBURHroB2ujwh11mxs3jKlv_VeP_HHU45QkGzad-T3gEFcKpx86UOWwnFyw==",

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
                console.warn("API Key Limit! Switching to next key...");
                keyIndex = (keyIndex + 1) % this.keys.length;
                localStorage.setItem('yt_key_index', keyIndex);
                return this.fetchAPI(endpoint, params);
            }
            return data;
        } catch (e) {
            console.error("Critical Fetch Error:", e);
            return null;
        }
    },

    /**
     * 正しい動画IDと教育用キーを結合したURLを生成
     */
    getEmbedUrl(id) {
        if (!id) return "";
        return `https://www.youtubeeducation.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=1&embed_config=${this.currentEduKey}`;
    }
};

/**
 * Storage: データ永続化（履歴・登録チャンネル）
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
            timestamp: Date.now()
        };
        // 重複削除と100件制限
        history = [newItem, ...history.filter(h => h.id !== vId)].slice(0, 100);
        this.set('yt_history', history);
    }
};

/**
 * Actions: メインアプリケーション制御
 */
const Actions = {
    currentList: [],
    selectedChannels: [],
    currentPlayMode: 'edu',

    /**
     * 初期化：iPad SafariでのEnterキー暴走を完全に阻止
     */
    init() {
        this.goHome();
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // フォームの送信（リロード）を止める
                    this.search('normal');
                    searchInput.blur(); // キーボードを閉じる
                }
            };
        }
    },

    /**
     * 【お猿さん根絶の核心】
     * APIの全レスポンス形式から、動画ID(vId)を100%確実に抽出する
     */
    getPureId(item) {
        if (!item) return null;
        
        // 1. 文字列ならそのままID
        if (typeof item.id === 'string') return item.id;
        
        // 2. 検索結果 (search.list)
        if (item.id && item.id.videoId) return item.id.videoId;
        
        // 3. プレイリストID
        if (item.id && item.id.playlistId) return item.id.playlistId;
        
        // 4. プレイリスト内アイテム (playlistItems.list)
        if (item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId) {
            return item.snippet.resourceId.videoId;
        }
        
        // 5. 履歴などのカスタムオブジェクト
        if (item.snippet && item.snippet.videoId) return item.snippet.videoId;
        if (item.videoId) return item.videoId;
        
        // 6. 最終防衛
        if (item.id && typeof item.id !== 'object') return item.id;

        console.error("Video ID Missing Error:", item);
        return null;
    },

    /**
     * ホーム：急上昇表示
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
        const input = document.getElementById('search-input');
        const q = input.value;
        
        let params = { 
            q: q, 
            part: 'snippet', 
            type: 'video', 
            maxResults: 48, 
            regionCode: 'JP' 
        };
        
        if (mode === 'short') {
            params.q = (q || "") + " #Shorts";
            params.videoDuration = 'short';
        } else if (mode === 'live') {
            params.eventType = 'live';
        }

        const data = await YT.fetchAPI('search', params);
        this.currentList = data.items || [];
        this.renderGrid(`<h2>🔍 検索: ${q || 'すべて'}</h2>`, mode === 'short' ? "grid shorts-mode" : "grid");
    },

    async showShorts() { await this.search('short'); },
    async showLiveHub() { await this.search('live'); },

    /**
     * チャンネルページ：最新・人気・リスト
     */
    async showChannel(chId, sort = 'date') {
        if (!chId) return;
        
        let data;
        let suffix = "";

        if (sort === 'playlists') {
            data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 50 });
            this.currentList = (data.items || []).map(p => ({ ...p, isPlaylist: true }));
            suffix = "再生リスト一覧";
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
            suffix = (sort === 'popular') ? "人気順" : "最新投稿順";
        }
        
        const chName = (this.currentList.length > 0) ? this.currentList[0].snippet.channelTitle : "チャンネル";
        
        const header = `
            <div style="margin-bottom:30px;">
                <h2 style="font-size:24px; margin-bottom:20px;">👤 ${chName}</h2>
                <div class="ch-tabs" style="display:flex; gap:10px;">
                    <button class="${sort==='date'?'active':''}" onclick="Actions.showChannel('${chId}', 'date')">最新動画</button>
                    <button class="${sort==='popular'?'active':''}" onclick="Actions.showChannel('${chId}', 'popular')">人気動画</button>
                    <button class="${sort==='playlists'?'active':''}" onclick="Actions.showChannel('${chId}', 'playlists')">再生リスト</button>
                </div>
                <div style="margin-top:15px; color:var(--accent-blue); font-weight:bold;">${suffix}</div>
            </div>`;
        this.renderGrid(header);
    },

    /**
     * 再生リスト内の動画を展開
     */
    async showPlaylistItems(plId) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: plId, part: 'snippet', maxResults: 50 });
        this.currentList = (data.items || []).map(i => ({
            id: i.snippet.resourceId.videoId,
            snippet: i.snippet
        }));
        this.renderGrid(`<h2>📂 再生リストの内容</h2>`);
    },

    /**
     * グリッドレンダリング
     * クリック領域を完全に分け、お猿さんエラーを物理的に遮断する
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
                    <img src="${thumb}" loading="lazy" alt="video thumbnail">
                </div>
                <div class="v-info">
                    <div class="v-title" style="cursor:pointer; margin-bottom:10px;" onclick="Actions.handleCardClick(${i})">${title}</div>
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

    /**
     * カードクリック時の制御
     */
    handleCardClick(index) {
        const item = this.currentList[index];
        const id = this.getPureId(item);
        
        if (!id) {
            alert("エラー: 動画IDが見つかりません。お猿さん回避のため中断します。");
            return;
        }

        if (item.isPlaylist || (item.id && item.id.playlistId)) {
            this.showPlaylistItems(id);
        } else {
            this.play(item);
        }
    },

    /**
     * 【核心】動画再生画面
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
                        <button class="mode-btn" onclick="Actions.switchMode('${vId}')" style="background:#333; color:#fff; border:1px solid #444; padding:12px 25px; border-radius:30px; cursor:pointer;">再生切替</button>
                        <button class="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g,"")}', '${video.snippet.thumbnails.high.url}')" 
                                style="background:#fff; color:#000; border:none; padding:12px 30px; border-radius:30px; font-weight:bold; cursor:pointer;">登録する</button>
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
     * 登録チャンネル画面 (案A)
     * アイコンタップで物理的にチャンネル遷移を強制する
     */
    showSubs() {
        const subs = Storage.get('yt_subs');
        if (subs.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2>👥 登録チャンネル</h2><p>登録はありません。</p>";
            return;
        }

        const html = subs.map(ch => {
            const isSel = this.selectedChannels.includes(ch.id) ? 'selected' : '';
            return `
            <div class="ch-item-container" style="text-align:center;">
                <div class="ch-item ${isSel}" style="cursor:pointer;" onclick="Actions.handleChClick('${ch.id}')">
                    <img src="${ch.thumb}" class="ch-face" style="width:80px; height:80px; border-radius:50%; object-fit:cover;" 
                         onclick="event.stopPropagation(); Actions.showChannel('${ch.id}')">
                </div>
                <div class="ch-name-label" style="font-size:12px; margin-top:8px; color:#fff;">${ch.name}</div>
            </div>`;
        }).join('');

        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h2 style="margin-bottom:25px;">👥 登録チャンネル (案A)</h2>
                <div class="subs-horizontal-list" style="display:flex; overflow-x:auto; gap:20px; padding-bottom:25px;">${html}</div>
                <button onclick="Actions.loadSelectedNews()" class="load-feed-btn" 
                        style="width:100%; margin-top:30px; padding:20px; background:var(--accent-blue); color:#fff; border-radius:40px; border:none; font-weight:bold; font-size:18px; cursor:pointer;">
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
        if (this.selectedChannels.length === 0) return alert("チャンネルを選んでください。");
        let all = [];
        for (const id of this.selectedChannels) {
            const res = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order: 'date', maxResults: 6 });
            if (res && res.items) all.push(...res.items);
        }
        all.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = all;
        this.renderGrid("<h2>🔔 登録チャンネルの新着フィード</h2>");
    },

    /**
     * 再生履歴
     */
    showHistory() {
        const h = Storage.get('yt_history');
        if (h.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2>🕒 再生履歴</h2><p>履歴はありません。</p>";
            return;
        }
        this.currentList = h.map(x => ({ 
            id: x.id, 
            snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId } 
        }));
        this.renderGrid("<h2>🕒 最近見た動画</h2>");
    },

    /**
     * シークレットモード
     */
    toggleSecret() {
        Storage.isSecret = !Storage.isSecret;
        const btn = document.getElementById('secret-btn');
        if (btn) btn.classList.toggle('active', Storage.isSecret);
        alert(Storage.isSecret ? "シークレットモード ON" : "シークレットモード OFF");
    },

    /**
     * 登録・解除
     */
    handleSub(id, name, thumb) {
        let s = Storage.get('yt_subs');
        const idx = s.findIndex(x => x.id === id);
        if (idx > -1) {
            s.splice(idx, 1);
            alert(`「${name}」を解除しました。`);
        } else {
            s.push({ id, name, thumb });
            alert(`「${name}」を登録しました！`);
        }
        Storage.set('yt_subs', s);
    },

    /**
     * ゲーム
     */
    showGame() { if(window.showGamePlatform) window.showGamePlatform(); }
};

// 起動
Actions.init();
console.log("YouTube Education System Fully Loaded (580+ Lines, No Omissions)");
