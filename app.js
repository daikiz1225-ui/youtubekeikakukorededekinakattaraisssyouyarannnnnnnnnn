/**
 * YouTube Client Premium - app.js
 * * [最終警告] 一切の省略・簡略化を排除。
 * ショート動画の上下移動機能 ＋ 過去全機能を統合した完全版。
 */

const YT = {
    // APIキーのローテーションリスト
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    // Kahoot APIから取得する動的な暗号化キー
    currentEduKey: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",

    /**
     * 暗号化キーの更新
     */
    async refreshEduKey() {
        try {
            const response = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await response.json();
            if (data && data.key) {
                this.currentEduKey = data.key;
                console.log("EduKey successfully updated.");
            }
        } catch (error) {
            console.error("EduKey update failed:", error);
        }
    },

    /**
     * 現在有効なAPIキーの取得
     */
    getCurrentKey() {
        const index = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[index];
    },

    /**
     * キーが上限に達した場合の切り替え
     */
    rotateKey() {
        let index = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
        if (index >= this.keys.length) index = 0;
        localStorage.setItem('yt_key_index', index);
        console.warn(`Key rotated to index: ${index}`);
    },

    /**
     * YouTube Data API v3 へのリクエスト
     */
    async fetchAPI(endpoint, params) {
        const queryParams = new URLSearchParams({
            ...params,
            key: this.getCurrentKey()
        });

        const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
        
        try {
            const response = await fetch(url);
            
            // クォータ制限(403)時にキーをローテーションして再実行
            if (response.status === 403) {
                this.rotateKey();
                return this.fetchAPI(endpoint, params);
            }

            if (!response.ok) throw new Error(`API Status: ${response.status}`);

            return await response.json();
        } catch (error) {
            console.error("Fetch API error:", error);
            return { items: [], nextPageToken: "" };
        }
    },

    /**
     * 教育用ドメイン埋め込みURLの生成
     */
    getEmbedUrl(id, isShort = false) {
        const config = { enc: this.currentEduKey, hideTitle: true };
        const params = new URLSearchParams({
            autoplay: 1,
            origin: "https://create.kahoot.it",
            embed_config: JSON.stringify(config),
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            widget_referrer: "https://create.kahoot.it",
            v: id
        });

        if (isShort) {
            params.append('loop', '1');
            params.append('playlist', id);
        }

        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

const Storage = {
    /**
     * データの取得・保存
     */
    get(key) {
        const data = localStorage.getItem(key);
        try { return data ? JSON.parse(data) : []; } catch (e) { return []; }
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    /**
     * 再生履歴の管理
     */
    addHistory(video) {
        let history = this.get('yt_history');
        history = [video, ...history.filter(item => item.id !== video.id)].slice(0, 50);
        this.set('yt_history', history);
    },

    /**
     * チャンネル登録のトグル
     */
    toggleSub(channel) {
        let subs = this.get('yt_subs');
        const index = subs.findIndex(item => item.id === channel.id);
        if (index > -1) {
            subs.splice(index, 1);
        } else {
            subs.push({ id: channel.id, name: channel.name, thumb: channel.thumb || '' });
        }
        this.set('yt_subs', subs);
    },

    /**
     * いいねのトグル
     */
    toggleLike(video) {
        let likes = this.get('yt_likes');
        const index = likes.findIndex(item => item.id === video.id);
        if (index > -1) {
            likes.splice(index, 1);
        } else {
            likes.push(video);
        }
        this.set('yt_likes', likes);
    },

    /**
     * プレイリスト作成
     */
    createPlaylist(name) {
        let playlists = this.get('yt_playlists');
        if (!playlists.find(p => p.name === name)) {
            playlists.push({ name: name, videos: [], createdAt: Date.now() });
            this.set('yt_playlists', playlists);
            return true;
        }
        return false;
    },

    /**
     * プレイリストへの動画追加
     */
    addToPlaylist(playlistName, video) {
        let playlists = this.get('yt_playlists');
        const list = playlists.find(p => p.name === playlistName);
        if (list && !list.videos.find(v => v.id === video.id)) {
            list.videos.push(video);
            this.set('yt_playlists', playlists);
            return true;
        }
        return false;
    }
};

const Actions = {
    // ステート管理
    currentList: [],
    relatedList: [],
    channelIcons: {},
    nextToken: "",
    currentView: "home",
    currentChId: "",
    currentChTitle: "",
    currentSearchTerm: "",
    currentPlayVideo: null,
    currentShortIndex: 0,
    scrollPositions: {},

    /**
     * アプリ初期化
     */
    init() {
        console.log("App booting...");
        const searchInput = document.getElementById('search-input');
        
        // iPad/Mobile対応：エンターキーで検索実行
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.search();
                searchInput.blur();
            }
        });

        document.getElementById('search-btn').onclick = () => this.search();
        document.getElementById('create-playlist-btn').onclick = () => this.createNewPlaylist();
        
        // 初期データフェッチ
        YT.refreshEduKey().then(() => this.goHome());
    },

    /**
     * ビュー切り替え時のスクロール管理
     */
    saveScroll() { this.scrollPositions[this.currentView] = window.scrollY; },
    restoreScroll() { window.scrollTo(0, this.scrollPositions[this.currentView] || 0); },

    /**
     * ホーム画面の表示
     */
    async goHome() {
        this.saveScroll();
        this.currentView = "home";
        this.currentSearchTerm = "";
        
        const data = await YT.fetchAPI('videos', {
            chart: 'mostPopular',
            regionCode: 'JP',
            part: 'snippet,contentDetails',
            maxResults: 24
        });

        this.nextToken = data.nextPageToken || "";
        this.currentList = data.items || [];
        this.renderGrid();
    },

    /**
     * ショート動画一覧（#Shorts検索）
     */
    async showShorts() {
        this.saveScroll();
        this.currentView = "shorts";
        this.currentSearchTerm = "#Shorts";
        
        const data = await YT.fetchAPI('search', {
            q: '#Shorts',
            part: 'snippet',
            type: 'video',
            maxResults: 24,
            videoDuration: 'short'
        });

        this.nextToken = data.nextPageToken || "";
        this.currentList = data.items || [];
        this.renderGrid();
    },

    /**
     * 検索の実行
     */
    async search(isMore = false) {
        const input = document.getElementById('search-input');
        let q = input.value || this.currentSearchTerm;
        if (!q) return;

        if (this.currentView === "shorts" && !q.includes("#Shorts")) q += " #Shorts";
        this.currentSearchTerm = q;

        if (!isMore) {
            this.saveScroll();
            if (this.currentView !== "shorts") this.currentView = "search";
            window.scrollTo(0, 0);
        }

        const data = await YT.fetchAPI('search', {
            q: q,
            part: 'snippet',
            type: 'video',
            maxResults: 24,
            pageToken: isMore ? this.nextToken : ""
        });

        this.nextToken = data.nextPageToken || "";
        if (isMore) {
            this.currentList.push(...data.items);
        } else {
            this.currentList = data.items || [];
        }

        this.renderGrid();
    },

    /**
     * 無限スクロール・追加読み込み
     */
    async loadMore() {
        if (!this.nextToken) return;

        if (this.currentView === "home") {
            const data = await YT.fetchAPI('videos', {
                chart: 'mostPopular',
                regionCode: 'JP',
                part: 'snippet',
                maxResults: 24,
                pageToken: this.nextToken
            });
            this.nextToken = data.nextPageToken || "";
            this.currentList.push(...data.items);
            this.renderGrid();
        } else {
            this.search(true);
        }
    },

    /**
     * チャンネル情報の表示（最新順/人気順）
     */
    async showChannel(id, title, sortType = 'date', isMore = false) {
        if (!isMore) {
            this.saveScroll();
            this.currentView = "channel";
            this.currentChId = id;
            this.currentChTitle = title;
            window.scrollTo(0, 0);
        }

        const data = await YT.fetchAPI('search', {
            channelId: id,
            part: 'snippet',
            maxResults: 24,
            type: 'video',
            order: sortType,
            pageToken: isMore ? this.nextToken : ""
        });

        this.nextToken = data.nextPageToken || "";
        if (isMore) this.currentList.push(...data.items);
        else this.currentList = data.items || [];

        const headerHtml = `
            <div class="channel-header">
                <div style="display:flex; align-items:center; gap:20px;">
                    <img src="${this.channelIcons[id] || ''}" style="width:80px; height:80px; border-radius:50%;">
                    <div>
                        <h2 style="margin:0;">${title}</h2>
                        <div class="tab-bar">
                            <div class="tab-item ${sortType==='date'?'active':''}" onclick="Actions.showChannel('${id}', '${title.replace(/'/g, "\\'")}', 'date')">最新</div>
                            <div class="tab-item ${sortType==='viewCount'?'active':''}" onclick="Actions.showChannel('${id}', '${title.replace(/'/g, "\\'")}', 'viewCount')">人気</div>
                            <div class="tab-item" onclick="Actions.showChannelPlaylists('${id}')">再生リスト</div>
                        </div>
                    </div>
                </div>
            </div>`;
        this.renderGrid(headerHtml);
    },

    /**
     * チャンネル内の再生リスト一覧表示
     */
    async showChannelPlaylists(id) {
        const data = await YT.fetchAPI('playlists', { channelId: id, part: 'snippet', maxResults: 50 });
        const html = (data.items || []).map(p => `
            <div class="v-card" onclick="Actions.viewExternalPlaylist('${p.id}', '${p.snippet.title.replace(/'/g, "\\'")}')">
                <div class="thumb-container">
                    <img src="${p.snippet.thumbnails.high.url}" class="main-thumb">
                    <div style="position:absolute; right:0; top:0; bottom:0; width:40%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center;">
                        <span style="font-size:24px;">≡</span>
                    </div>
                </div>
                <div class="v-text"><h3>${p.snippet.title}</h3><p>再生リスト</p></div>
            </div>`).join('');

        document.getElementById('view-container').innerHTML = `
            <div class="channel-header">
                <h2>${this.currentChTitle} - 再生リスト</h2>
                <div class="tab-bar">
                    <div class="tab-item" onclick="Actions.showChannel('${id}', '${this.currentChTitle.replace(/'/g, "\\'")}', 'date')">動画に戻る</div>
                </div>
            </div>
            <div class="grid">${html}</div>`;
    },

    /**
     * 外部プレイリストの内容表示
     */
    async viewExternalPlaylist(listId, title) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: listId, part: 'snippet', maxResults: 50 });
        this.currentList = data.items || [];
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    /**
     * チャンネルアイコンの不足分を補完
     */
    async fetchMissingIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if (data.items) {
            data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
            document.querySelectorAll('.ch-icon-img').forEach(img => {
                const cid = img.dataset.chid;
                if (this.channelIcons[cid]) img.src = this.channelIcons[cid];
            });
        }
    },

    /**
     * グリッドUIの描画
     */
    renderGrid(headerHtml = "") {
        const container = document.getElementById('view-container');
        const missingIds = [...new Set(this.currentList.map(item => item.snippet?.channelId))]
            .filter(id => id && !this.channelIcons[id]).join(',');

        if (missingIds) this.fetchMissingIcons(missingIds);

        const cardsHtml = this.currentList.map((item, index) => {
            const snip = item.snippet;
            if (!snip) return '';
            const vId = (typeof item.id === 'string') ? item.id : (item.id.videoId || item.id.resourceId?.videoId);
            if (!vId) return '';

            return `
            <div class="v-card">
                <div class="thumb-container">
                    <img src="${snip.thumbnails.high.url}" class="main-thumb" onclick="Actions.playVideoByIndex(${index})">
                    <img src="${this.channelIcons[snip.channelId] || ''}" 
                         class="ch-icon-img" data-chid="${snip.channelId}" 
                         onclick="event.stopPropagation(); Actions.showChannel('${snip.channelId}', '${snip.channelTitle.replace(/'/g, "\\'")}')">
                </div>
                <div class="v-text" onclick="Actions.playVideoByIndex(${index})">
                    <h3>${snip.title}</h3>
                    <p>${snip.channelTitle}</p>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div style="padding: 10px 20px;">${headerHtml}</div>
            <div class="grid">${cardsHtml}</div>
            <div style="text-align:center; padding: 40px 0 120px 0;">
                <button class="btn primary-btn" style="margin: 0 auto; width:200px;" onclick="Actions.loadMore()">もっと見る</button>
            </div>`;
    },

    /**
     * 動画再生の入り口
     */
    playVideoByIndex(index) {
        this.currentShortIndex = index;
        this.play(this.currentList[index]);
    },

    /**
     * 再生画面の構築
     */
    play(video) {
        if (!video) return;
        this.currentPlayVideo = video;
        const vId = (typeof video.id === 'string') ? video.id : (video.id.videoId || video.id.resourceId?.videoId);
        if (!vId) return;

        if (this.currentView === "shorts") return this.playShort(vId);

        window.scrollTo(0, 0);
        const isLiked = Storage.get('yt_likes').some(x => x.id === vId);
        const isSubbed = Storage.get('yt_subs').some(x => x.id === video.snippet.channelId);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="video-wrapper">
                        <iframe src="${YT.getEmbedUrl(vId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                    </div>
                    <div class="video-info">
                        <h2>${video.snippet.title}</h2>
                        <div class="channel-row">
                            <img src="${this.channelIcons[video.snippet.channelId] || ''}" 
                                 onclick="Actions.showChannel('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g, "\\'")}')" 
                                 style="cursor:pointer;">
                            <div class="channel-name">${video.snippet.channelTitle}</div>
                            <button class="btn sub-btn ${isSubbed ? 'active' : ''}" 
                                    onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g, "\\'")}')">
                                ${isSubbed ? '登録済み' : 'チャンネル登録'}
                            </button>
                        </div>
                        <div class="actions-row">
                            <button class="btn" onclick="Actions.handleLike()">${isLiked ? '❤️' : '🤍'} いいね</button>
                            <button class="btn" onclick="Actions.openPlaylistModal()">➕ 保存</button>
                            <button class="btn" onclick="window.open('https://www.youtube.com/watch?v=${vId}', '_blank')">🔗 本家</button>
                        </div>
                        <div style="background:var(--card-bg); padding:15px; border-radius:12px; margin-top:15px; font-size:14px; white-space:pre-wrap; color:#ccc; line-height:1.6;">
                            ${video.snippet.description || '説明なし'}
                        </div>
                    </div>
                </div>
                <div class="related-area">
                    <h3 style="margin-top:0;">関連動画</h3>
                    <div id="related-list"></div>
                </div>
            </div>`;
        
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
        this.loadRelated(video.snippet.title);
    },

    /**
     * ショート動画専用：上下移動機能付き再生
     */
    playShort(id) {
        const video = this.currentList[this.currentShortIndex];
        const vId = id || (typeof video.id === 'string' ? video.id : video.id.videoId);

        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container">
                <div class="shorts-wrapper">
                    <iframe src="${YT.getEmbedUrl(vId, true)}" style="width:100%; height:100%; border:none; border-radius:15px;" allowfullscreen allow="autoplay"></iframe>
                    
                    <div style="position:absolute; top:50%; left:-70px; transform:translateY(-50%); display:flex; flex-direction:column; gap:25px; z-index:10;">
                        <div class="short-btn" onclick="Actions.prevShort()" style="font-size:24px; background:rgba(255,255,255,0.1);">▲</div>
                        <div class="short-btn" onclick="Actions.nextShort()" style="font-size:24px; background:rgba(255,255,255,0.1);">▼</div>
                    </div>

                    <div class="shorts-actions">
                        <div class="short-btn" onclick="Actions.handleLike()">❤️</div>
                        <div class="short-btn" onclick="Actions.openPlaylistModal()">➕</div>
                        <div class="short-btn" onclick="Actions.showShorts()">⚡</div>
                    </div>

                    <div style="position:absolute; bottom:30px; left:20px; right:80px; pointer-events:none;">
                        <h3 style="font-size:16px; margin:0; text-shadow:2px 2px 4px #000;">${video.snippet.title}</h3>
                        <p style="font-size:14px; margin:8px 0 0 0; font-weight:bold; text-shadow:1px 1px 2px #000;">@${video.snippet.channelTitle}</p>
                    </div>
                </div>
            </div>`;
        
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
    },

    /**
     * ショート移動ロジック
     */
    nextShort() {
        if (this.currentShortIndex < this.currentList.length - 1) {
            this.currentShortIndex++;
            this.playVideoByIndex(this.currentShortIndex);
        } else if (this.nextToken) {
            this.loadMore().then(() => {
                this.currentShortIndex++;
                this.playVideoByIndex(this.currentShortIndex);
            });
        }
    },
    prevShort() {
        if (this.currentShortIndex > 0) {
            this.currentShortIndex--;
            this.playVideoByIndex(this.currentShortIndex);
        }
    },

    /**
     * 関連動画取得
     */
    async loadRelated(title) {
        const q = title.substring(0, 15);
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 15 });
        this.relatedList = data.items || [];
        const container = document.getElementById('related-list');
        if (container) {
            container.innerHTML = this.relatedList.map((v, i) => `
                <div class="side-card" onclick="Actions.play(Actions.relatedList[${i}])">
                    <img src="${v.snippet.thumbnails.medium.url}">
                    <div class="side-card-info"><h4>${v.snippet.title}</h4><p>${v.snippet.channelTitle}</p></div>
                </div>`).join('');
        }
    },

    /**
     * 各種マイページ系表示
     */
    showLikes() {
        this.saveScroll();
        this.currentView = "likes";
        const likes = Storage.get('yt_likes');
        this.currentList = likes.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>いいねした動画</h2>");
    },

    showHistory() {
        this.saveScroll();
        this.currentView = "history";
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>再生履歴</h2>");
    },

    showSubs() {
        this.saveScroll();
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => `
            <div class="v-card" style="padding:20px; text-align:center; background:var(--card-bg);">
                <img src="${this.channelIcons[ch.id] || ''}" style="width:100px; height:100px; border-radius:50%; cursor:pointer;" onclick="Actions.showChannel('${ch.id}', '${ch.name.replace(/'/g, "\\'")}')">
                <h3>${ch.name}</h3>
                <button class="btn sub-btn active" style="margin:10px auto;" onclick="Actions.handleSub('${ch.id}', '${ch.name.replace(/'/g, "\\'")}')">登録解除</button>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録チャンネル</h2><div class="grid">${html}</div></div>`;
    },

    /**
     * プレイリスト管理UI
     */
    showPlaylists() {
        this.saveScroll();
        this.currentView = "playlists";
        const lists = Storage.get('yt_playlists');
        const html = lists.map(l => `
            <div class="v-card" style="padding:30px; text-align:center; background:var(--card-bg);" onclick="Actions.viewMyList('${l.name.replace(/'/g, "\\'")}')">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.deleteMyList('${l.name.replace(/'/g, "\\'")}')">削除</span>
                <div style="font-size:60px; margin-bottom:15px;">📁</div>
                <h3>${l.name}</h3>
                <p>${l.videos.length} 本の動画</p>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>マイプレイリスト</h2><div class="grid">${html}</div></div>`;
    },

    viewMyList(name) {
        const list = Storage.get('yt_playlists').find(p => p.name === name);
        if (!list) return;
        const html = list.videos.map((v, i) => `
            <div class="v-card">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.removeVideoFromMyList('${name.replace(/'/g, "\\'")}', '${v.id}')">✖</span>
                <div class="thumb-container"><img src="${v.thumb}" class="main-thumb" onclick="Actions.playFromMyList('${name.replace(/'/g, "\\'")}', ${i})"></div>
                <div class="v-text"><h3>${v.title}</h3><p>${v.channelTitle}</p></div>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;"><div style="display:flex; justify-content:space-between; align-items:center;"><h2>${name}</h2><button class="btn" onclick="Actions.showPlaylists()">戻る</button></div><div class="grid">${html}</div></div>`;
    },

    playFromMyList(pName, idx) {
        const list = Storage.get('yt_playlists').find(p => p.name === pName);
        if (list && list.videos[idx]) {
            const v = list.videos[idx];
            this.play({ id: v.id, snippet: { title: v.title, thumbnails: { high: { url: v.thumb } }, channelTitle: v.channelTitle } });
        }
    },

    deleteMyList(name) {
        if (confirm(`「${name}」を削除しますか？`)) {
            let p = Storage.get('yt_playlists').filter(x => x.name !== name);
            Storage.set('yt_playlists', p);
            this.showPlaylists();
        }
    },

    removeVideoFromMyList(pName, vId) {
        let p = Storage.get('yt_playlists');
        const l = p.find(x => x.name === pName);
        if (l) { l.videos = l.videos.filter(v => v.id !== vId); Storage.set('yt_playlists', p); this.viewMyList(pName); }
    },

    /**
     * モーダル・ハンドリング
     */
    openPlaylistModal() {
        document.getElementById('modal-overlay').style.display = 'flex';
        const p = Storage.get('yt_playlists');
        document.getElementById('playlist-selector').innerHTML = p.map(l => `<div class="p-item" onclick="Actions.addCurrentToMyList('${l.name.replace(/'/g, "\\'")}')">📁 ${l.name}</div>`).join('') || '<p style="padding:20px;">リストを作成してください</p>';
    },
    closeModal() { document.getElementById('modal-overlay').style.display = 'none'; },
    closeModalOutside(e) { if (e.target.id === 'modal-overlay') this.closeModal(); },

    createNewPlaylist() {
        const input = document.getElementById('new-playlist-name');
        if (input.value.trim()) { Storage.createPlaylist(input.value.trim()); input.value = ''; this.openPlaylistModal(); }
    },

    addCurrentToMyList(pName) {
        const v = this.currentPlayVideo;
        if (!v) return;
        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        Storage.addToPlaylist(pName, { id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        this.closeModal();
    },

    /**
     * 各種インタラクション
     */
    handleLike() {
        const v = this.currentPlayVideo;
        if (!v) return;
        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        Storage.toggleLike({ id: vId, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle });
        this.play(this.currentPlayVideo);
    },

    handleSub(id, name) {
        Storage.toggleSub({ id, name });
        if (this.currentView === "subs") this.showSubs();
        else if (this.currentPlayVideo && this.currentPlayVideo.snippet.channelId === id) this.play(this.currentPlayVideo);
    }
};

window.onload = () => Actions.init();
