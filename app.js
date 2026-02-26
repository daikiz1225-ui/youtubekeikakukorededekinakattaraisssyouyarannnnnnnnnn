const YT = {
    // 使用するAPIキーの配列。403エラー時に自動で次へ切り替える。
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", 
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", 
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", 
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", 
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    // 埋め込みプレイヤー用の教育用キー
    currentEduKey: "AXH1ezmAE3vgRPcGfwKP-x8QMySX2Sc1L5ejSmbRjTuE-_q-HIR8jzGYDuaE9xpFLlo_goB3iQQBDTsJ9c0h04V6RZqjE2Le8KQULVTQBURHroB2ujwh11mxs3jKlv_VeP_HHU45QkGzad-T3gEFcKpx86UOWwnFyw==",

    // APIリクエストの基幹。エラー時にキーをローテーションする。
    async fetchAPI(endpoint, params) {
        let keyIndex = parseInt(localStorage.getItem('yt_key_index')) || 0;
        const query = new URLSearchParams({ ...params, key: this.keys[keyIndex] }).toString();
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query}`);
            const data = await res.json();
            
            // クォータ制限（403）が出た場合の処理
            if (res.status === 403 || (data.error && data.error.code === 403)) {
                console.log("Key Limit reached, switching to next key...");
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

    // 教育用ドメインの埋め込みURLを生成。お猿さんエラー対策。
    getEmbedUrl(id) {
        return `https://www.youtubeeducation.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&autoplay=1&embed_config=${this.currentEduKey}`;
    }
};

const Storage = {
    isSecret: false,
    get(key) { 
        return JSON.parse(localStorage.getItem(key)) || []; 
    },
    set(key, val) { 
        localStorage.setItem(key, JSON.stringify(val)); 
    },
    // 再生履歴の保存（シークレットモード時は保存しない）
    addHistory(v) {
        if (this.isSecret) return;
        let h = this.get('yt_history');
        const id = Actions.getPureId(v);
        if (!id) return;

        // 重複を削除して先頭に追加
        const historyItem = {
            id: id,
            title: v.snippet.title,
            thumb: v.snippet.thumbnails.high.url,
            channelTitle: v.snippet.channelTitle,
            channelId: v.snippet.channelId
        };
        h = [historyItem, ...h.filter(x => x.id !== id)].slice(0, 50);
        this.set('yt_history', h);
    }
};

const Actions = {
    currentList: [],
    selectedChannels: [],
    currentPlayMode: 'edu',

    init() {
        // 初期表示は急上昇
        this.goHome();
        
        // iPad Safariでの検索窓Enterキーバグ修正
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.search('normal');
                    searchInput.blur(); // キーボードを閉じる
                }
            });
        }
    },

    // 複雑なYouTube APIのレスポンスから、確実に動画ID/リストIDを抜き出す
    getPureId(item) {
        if (!item) return null;
        if (typeof item.id === 'string') return item.id;
        if (item.id && item.id.videoId) return item.id.videoId;
        if (item.id && item.id.playlistId) return item.id.playlistId;
        if (item.snippet && item.snippet.resourceId) return item.snippet.resourceId.videoId;
        return null;
    },

    // 1. 急上昇（ホーム）を表示
    async goHome() {
        const data = await YT.fetchAPI('videos', { 
            chart: 'mostPopular', 
            regionCode: 'JP', 
            part: 'snippet,contentDetails', 
            maxResults: 30 
        });
        this.currentList = data.items || [];
        this.renderGrid("<h2>🔥 急上昇</h2>");
    },

    // 2. 検索機能（通常、ショート、ライブ）
    async search(mode = 'normal') {
        const qInput = document.getElementById('search-input');
        let q = qInput.value;
        let params = { 
            q: q, 
            part: 'snippet', 
            type: 'video', 
            maxResults: 30, 
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
        this.renderGrid(`<h2>🔍 検索結果: ${q || ''}</h2>`, mode === 'short' ? "grid shorts-mode" : "grid");
    },

    async showShorts() { await this.search('short'); },
    async showLiveHub() { await this.search('live'); },

    // 3. チャンネル詳細（新着・人気・再生リストの3タブ）
    async showChannel(chId, mode = 'date') {
        if (!chId) return;
        let data;
        let titleSuffix = "";

        if (mode === 'playlists') {
            data = await YT.fetchAPI('playlists', { 
                channelId: chId, 
                part: 'snippet', 
                maxResults: 30 
            });
            this.currentList = (data.items || []).map(p => ({ ...p, isPlaylist: true }));
            titleSuffix = "再生リスト";
        } else {
            const order = (mode === 'popular') ? 'viewCount' : 'date';
            data = await YT.fetchAPI('search', { 
                channelId: chId, 
                part: 'snippet', 
                type: 'video', 
                order: order, 
                maxResults: 30 
            });
            this.currentList = data.items || [];
            titleSuffix = (mode === 'popular') ? "人気順" : "新着順";
        }
        
        const chName = (this.currentList.length > 0) ? this.currentList[0].snippet.channelTitle : "チャンネル";
        
        const headerHtml = `
            <div style="margin-bottom:20px;">
                <h2 style="margin-bottom:15px; display:flex; align-items:center; gap:10px;">
                    <span style="color:var(--accent-blue);">👤</span> ${chName}
                </h2>
                <div class="ch-tabs">
                    <button class="${mode==='date'?'active':''}" onclick="Actions.showChannel('${chId}', 'date')">新着動画</button>
                    <button class="${mode==='popular'?'active':''}" onclick="Actions.showChannel('${chId}', 'popular')">人気動画</button>
                    <button class="${mode==='playlists'?'active':''}" onclick="Actions.showChannel('${chId}', 'playlists')">再生リスト</button>
                </div>
                <h3 style="font-size:16px; color:#aaa; margin-top:15px;">${titleSuffix}</h3>
            </div>
        `;
        this.renderGrid(headerHtml);
    },

    // 4. 再生リストをクリックした際の動画一覧表示
    async showPlaylistItems(plId) {
        const data = await YT.fetchAPI('playlistItems', { 
            playlistId: plId, 
            part: 'snippet', 
            maxResults: 50 
        });
        this.currentList = (data.items || []).map(i => ({ 
            id: i.snippet.resourceId.videoId, 
            snippet: i.snippet 
        }));
        this.renderGrid(`<h2>📂 再生リストの内容</h2>`);
    },

    // 5. グリッドの描画。iPadのクリック誤作動を完全に防ぐ。
    renderGrid(headerHtml, gridClass = "grid") {
        const html = this.currentList.map((v, i) => {
            const thumb = (v.snippet && v.snippet.thumbnails) ? v.snippet.thumbnails.high.url : '';
            const title = v.snippet ? v.snippet.title : 'No Title';
            const chName = v.snippet ? v.snippet.channelTitle : '';
            const chId = v.snippet ? v.snippet.channelId : '';
            
            return `
            <div class="v-card">
                <div class="v-click-layer" style="height: 70%;" onclick="Actions.handleCardClick(${i})"></div>
                
                <div class="thumb-wrap">
                    <img src="${thumb}" loading="lazy">
                </div>
                
                <div class="v-info">
                    <div class="v-title">${title}</div>
                    <div class="v-ch" style="position:relative; z-index:1005; display:inline-block; padding:5px 0;" 
                         onclick="event.stopImmediatePropagation(); Actions.showChannel('${chId}')">
                        <span style="color:var(--accent-blue); text-decoration:underline;">${chName}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        const container = document.getElementById('view-container');
        container.innerHTML = `<div>${headerHtml}<div class="${gridClass}">${html}</div></div>`;
        container.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // カードクリック時の判定（動画か、再生リストか）
    handleCardClick(index) {
        const item = this.currentList[index];
        const id = this.getPureId(item);
        if (!id) return;

        if (item.isPlaylist || (item.id && item.id.playlistId)) {
            this.showPlaylistItems(id);
        } else {
            this.play(item);
        }
    },

    // 6. 再生画面の構築
    async play(video) {
        const vId = this.getPureId(video);
        Storage.addHistory(video);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="video-wrapper">
                    <iframe id="edu-player" src="${YT.getEmbedUrl(vId)}" allowfullscreen></iframe>
                    <video id="stream-player" style="display:none;" controls playsinline></video>
                </div>
                
                <div class="play-bar">
                    <div style="flex:1; padding-right:15px;">
                        <div style="font-weight:bold; font-size:18px; margin-bottom:8px;">${video.snippet.title}</div>
                        <div style="font-size:14px; color:var(--accent-blue); cursor:pointer;" onclick="Actions.showChannel('${video.snippet.channelId}')">
                            ${video.snippet.channelTitle} ➔
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button onclick="Actions.switchMode('${vId}')" style="background:#333; color:white; border:none; padding:12px 18px; border-radius:25px; cursor:pointer; font-weight:bold;">
                            モード切替
                        </button>
                        <button onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g,"")}', '${video.snippet.thumbnails.high.url}')" 
                                style="background:white; color:black; border:none; padding:12px 20px; border-radius:25px; font-weight:bold; cursor:pointer;">
                            登録/解除
                        </button>
                    </div>
                </div>
            </div>`;
        window.scrollTo(0, 0);
    },

    // 7. ストリーミング（HLS）と埋め込みの切り替え
    async switchMode(vId) {
        this.currentPlayMode = (this.currentPlayMode === 'edu') ? 'stream' : 'edu';
        const edu = document.getElementById('edu-player');
        const stream = document.getElementById('stream-player');

        if (this.currentPlayMode === 'stream') {
            edu.style.display = 'none';
            stream.style.display = 'block';
            
            // プロキシサーバー経由のHLSストリームURL
            const streamUrl = `https://youtube-stream-proxy.vercel.app/api/m3u8?v=${vId}`;
            
            if (stream.canPlayType('application/vnd.apple.mpegurl')) {
                // iOS / iPad Safari ネイティブ対応
                stream.src = streamUrl;
                stream.play();
            } else if (typeof Hls !== 'undefined') {
                // PC用 hls.js
                const hls = new Hls();
                hls.loadSource(streamUrl);
                hls.attachMedia(stream);
                hls.on(Hls.Events.MANIFEST_PARSED, () => stream.play());
            } else {
                alert("このブラウザはストリーミング再生に未対応だぜ");
            }
        } else {
            stream.style.display = 'none';
            edu.style.display = 'block';
            stream.pause();
        }
    },

    // 8. 登録チャンネル案A（選択式フィード）
    showSubs() {
        const subs = Storage.get('yt_subs');
        if (subs.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2>👥 登録チャンネル</h2><p style='color:#aaa;'>まだ登録がないぜ。動画再生画面から登録してくれ。</p>";
            return;
        }

        const chHtml = subs.map(ch => {
            const isSel = this.selectedChannels.includes(ch.id) ? 'selected' : '';
            return `
            <div class="ch-item-container" onclick="Actions.handleChClick(event, '${ch.id}')">
                <div class="ch-item ${isSel}">
                    <img src="${ch.thumb}" class="ch-face">
                </div>
                <div style="font-size:12px; margin-top:8px; width:94px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${ch.name}
                </div>
            </div>`;
        }).join('');

        document.getElementById('view-container').innerHTML = `
            <div style="padding:10px;">
                <h2 style="margin-bottom:20px;">👥 登録チャンネル (案A)</h2>
                <div style="display:flex; overflow-x:auto; gap:15px; border-bottom:1px solid #333; padding-bottom:20px; -webkit-overflow-scrolling:touch;">
                    ${chHtml}
                </div>
                <div style="text-align:center; padding-top:30px;">
                    <p style="color:#aaa; font-size:14px; margin-bottom:15px;">最大5人まで選択して新着を一気にチェックできるぜ</p>
                    <button onclick="Actions.loadSelectedNews()" 
                            style="width:100%; max-width:400px; padding:18px; border-radius:35px; border:none; background:var(--accent-blue); color:white; font-weight:bold; font-size:16px; cursor:pointer; box-shadow: 0 4px 15px rgba(0,217,255,0.3);">
                        選択したチャンネルの新着を表示
                    </button>
                </div>
            </div>`;
    },

    handleChClick(e, chId) {
        // アイコン画像自体をタップした場合は直接チャンネル詳細へ
        if (e.target.tagName === 'IMG') {
            e.stopPropagation();
            this.showChannel(chId);
        } else {
            // 枠内をタップした場合は選択/解除
            const idx = this.selectedChannels.indexOf(chId);
            if (idx > -1) {
                this.selectedChannels.splice(idx, 1);
            } else {
                if (this.selectedChannels.length < 5) {
                    this.selectedChannels.push(chId);
                } else {
                    alert("一度に選べるのは5人までだぜ");
                }
            }
            this.showSubs();
        }
    },

    async loadSelectedNews() {
        if (this.selectedChannels.length === 0) return alert("チャンネルを1つ以上選択してくれ");
        
        const allVideos = [];
        for (const id of this.selectedChannels) {
            const d = await YT.fetchAPI('search', { 
                channelId: id, 
                part: 'snippet', 
                type: 'video', 
                order: 'date', 
                maxResults: 4 
            });
            if (d && d.items) allVideos.push(...d.items);
        }

        // 日付順にソート
        allVideos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        
        this.currentList = allVideos;
        this.renderGrid("<h2>🔔 選択したチャンネルの新着</h2>");
    },

    // 9. 履歴、シークレット、登録
    showHistory() {
        const h = Storage.get('yt_history');
        this.currentList = h.map(x => ({ 
            id: x.id, 
            snippet: { 
                title: x.title, 
                thumbnails: { high: { url: x.thumb } }, 
                channelTitle: x.channelTitle, 
                channelId: x.channelId 
            } 
        }));
        this.renderGrid("<h2>🕒 再生履歴</h2>");
    },

    toggleSecret() {
        Storage.isSecret = !Storage.isSecret;
        const btn = document.getElementById('secret-btn');
        if (btn) btn.classList.toggle('active', Storage.isSecret);
        alert(Storage.isSecret ? "シークレットモードON：履歴に残りません" : "シークレットモードOFF：履歴を保存します");
    },

    handleSub(id, name, thumb) {
        let s = Storage.get('yt_subs');
        const idx = s.findIndex(x => x.id === id);
        if (idx > -1) {
            s.splice(idx, 1);
            alert(`${name} の登録を解除したぜ`);
        } else {
            s.push({ id, name, thumb });
            alert(`${name} を登録したぜ`);
        }
        Storage.set('yt_subs', s);
    },

    // ゲーム画面の呼び出し
    showGame() {
        if (window.showGamePlatform) {
            window.showGamePlatform();
        } else {
            alert("ゲームプラットフォームのスクリプトが読み込まれていないぜ");
        }
    }
};

// アプリ起動
Actions.init();
