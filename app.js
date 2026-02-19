/**
 * YouTube Client Premium - app.js
 * 省略一切なし・完全機能版
 */

const YT = {
    // APIキーのローテーション
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
     * 最新の暗号化キーをフェッチする
     */
    async refreshEduKey() {
        try {
            const response = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await response.json();
            if (data && data.key) {
                this.currentEduKey = data.key;
                console.log("EduKey Refreshed successfully.");
            }
        } catch (error) {
            console.error("Failed to refresh EduKey:", error);
        }
    },

    /**
     * 現在使用すべきAPIキーのインデックスをローカルストレージから取得
     */
    getCurrentKey() {
        const index = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[index];
    },

    /**
     * APIキーが制限に達した場合に次のキーへ切り替える
     */
    rotateKey() {
        let index = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
        if (index >= this.keys.length) {
            index = 0; // 最初のキーに戻る
        }
        localStorage.setItem('yt_key_index', index);
        console.warn(`API Key rotated to index: ${index}`);
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
            
            // クォータ制限(403)の場合、キーをローテーションして再試行
            if (response.status === 403) {
                this.rotateKey();
                return this.fetchAPI(endpoint, params);
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Fetch API error:", error);
            return { items: [] };
        }
    },

    /**
     * 教育用ドメインを通じた埋め込みURLの生成
     */
    getEmbedUrl(id, isShort = false) {
        const config = {
            enc: this.currentEduKey,
            hideTitle: true
        };

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

        // ショート動画の場合はループ再生を有効化
        if (isShort) {
            params.append('loop', '1');
            params.append('playlist', id); // ループにはplaylistパラメータが必要
        }

        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

const Storage = {
    /**
     * ローカルストレージからの汎用取得
     */
    get(key) {
        const data = localStorage.getItem(key);
        try {
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * ローカルストレージへの汎用保存
     */
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    /**
     * 再生履歴の追加（重複排除・上限50件）
     */
    addHistory(video) {
        let history = this.get('yt_history');
        // 同じIDの動画があれば削除して先頭に追加
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
            subs.push({
                id: channel.id,
                name: channel.name,
                thumb: channel.thumb || ''
            });
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
     * 新規プレイリスト作成
     */
    createPlaylist(name) {
        let playlists = this.get('yt_playlists');
        if (!playlists.find(p => p.name === name)) {
            playlists.push({
                name: name,
                videos: [],
                createdAt: new Date().getTime()
            });
            this.set('yt_playlists', playlists);
            return true;
        }
        return false;
    },

    /**
     * プレイリストへの追加
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
    },

    /**
     * プレイリストからの削除
     */
    removeFromPlaylist(playlistName, videoId) {
        let playlists = this.get('yt_playlists');
        const list = playlists.find(p => p.name === playlistName);
        if (list) {
            list.videos = list.videos.filter(v => v.id !== videoId);
            this.set('yt_playlists', playlists);
        }
    },

    /**
     * プレイリスト自体の削除
     */
    deletePlaylist(name) {
        let playlists = this.get('yt_playlists');
        playlists = playlists.filter(p => p.name !== name);
        this.set('yt_playlists', playlists);
    }
};

const Actions = {
    // 状態管理
    currentList: [],
    relatedList: [],
    channelIcons: {},
    nextToken: "",
    currentView: "home", // home, search, shorts, channel, likes, history, playlists
    currentChId: "",
    currentChTitle: "",
    currentSearchTerm: "",
    currentPlayVideo: null,
    scrollPositions: {}, // ビューごとのスクロール位置保存

    /**
     * アプリ初期化
     */
    init() {
        console.log("Initializing App...");
        const searchInput = document.getElementById('search-input');
        
        // エンターキーで検索（iPad/Mobileでの「開く」ボタン等に対応）
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // フォーム送信によるリロード防止
                this.search();
                searchInput.blur(); // キーボードを閉じる
            }
        });

        // 検索ボタンクリック
        document.getElementById('search-btn').onclick = () => this.search();

        // プレイリスト作成ボタン
        document.getElementById('create-playlist-btn').onclick = () => this.createNewPlaylist();

        // 初期表示
        YT.refreshEduKey().then(() => {
            this.goHome();
        });
    },

    /**
     * スクロール位置の保存
     */
    saveScroll() {
        this.scrollPositions[this.currentView] = window.scrollY;
    },

    /**
     * スクロール位置の復元
     */
    restoreScroll() {
        const pos = this.scrollPositions[this.currentView] || 0;
        window.scrollTo(0, pos);
    },

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
     * ショート動画の表示（#Shortsタグを利用）
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
     * 検索実行
     */
    async search(isMore = false) {
        const input = document.getElementById('search-input');
        let q = input.value || this.currentSearchTerm;

        if (!q) return;

        // ショートモード中ならタグを強制
        if (this.currentView === "shorts" && !q.includes("#Shorts")) {
            q += " #Shorts";
        }

        this.currentSearchTerm = q;
        if (!isMore) {
            this.saveScroll();
            if (this.currentView !== "shorts") {
                this.currentView = "search";
            }
            window.scrollTo(0, 0);
        }

        const params = {
            q: q,
            part: 'snippet',
            type: 'video',
            maxResults: 24,
            pageToken: isMore ? this.nextToken : ""
        };

        const data = await YT.fetchAPI('search', params);
        this.nextToken = data.nextPageToken || "";

        if (isMore) {
            this.currentList.push(...data.items);
        } else {
            this.currentList = data.items || [];
        }

        this.renderGrid();
    },

    /**
     * 追加読み込み（無限スクロール用）
     */
    async loadMore() {
        console.log("Loading more content for:", this.currentView);
        if (!this.nextToken) {
            alert("これ以上の動画はありません。");
            return;
        }

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
        } else if (this.currentView === "search" || this.currentView === "shorts") {
            this.search(true);
        } else if (this.currentView === "channel") {
            this.showChannel(this.currentChId, this.currentChTitle, 'date', true);
        }
    },

    /**
     * チャンネル情報の表示
     */
    async showChannel(id, title, sortType = 'date', isMore = false) {
        if (!isMore) {
            this.saveScroll();
            this.currentView = "channel";
            this.currentChId = id;
            this.currentChTitle = title;
            window.scrollTo(0, 0);
        }

        const params = {
            channelId: id,
            part: 'snippet',
            maxResults: 24,
            type: 'video',
            order: sortType,
            pageToken: isMore ? this.nextToken : ""
        };

        const data = await YT.fetchAPI('search', params);
        this.nextToken = data.nextPageToken || "";

        if (isMore) {
            this.currentList.push(...data.items);
        } else {
            this.currentList = data.items || [];
        }

        const headerHtml = `
            <div class="channel-header">
                <div style="display:flex; align-items:center; gap:20px;">
                    <img src="${this.channelIcons[id] || ''}" style="width:80px; height:80px; border-radius:50%;">
                    <div>
                        <h2 style="margin:0;">${title}</h2>
                        <div class="tab-bar">
                            <div class="tab-item ${sortType === 'date' ? 'active' : ''}" onclick="Actions.showChannel('${id}', '${title.replace(/'/g, "\\'")}', 'date')">最新</div>
                            <div class="tab-item ${sortType === 'viewCount' ? 'active' : ''}" onclick="Actions.showChannel('${id}', '${title.replace(/'/g, "\\'")}', 'viewCount')">人気</div>
                            <div class="tab-item" onclick="Actions.showChannelPlaylists('${id}')">再生リスト</div>
                        </div>
                    </div>
                </div>
            </div>`;

        this.renderGrid(headerHtml);
    },

    /**
     * チャンネル内の全再生リストを表示
     */
    async showChannelPlaylists(id) {
        const data = await YT.fetchAPI('playlists', {
            channelId: id,
            part: 'snippet',
            maxResults: 50
        });

        const playlists = data.items || [];
        const html = playlists.map(p => `
            <div class="v-card" onclick="Actions.viewExternalPlaylist('${p.id}', '${p.snippet.title.replace(/'/g, "\\'")}')">
                <div class="thumb-container">
                    <img src="${p.snippet.thumbnails.high.url}" class="main-thumb">
                    <div style="position:absolute; right:0; top:0; bottom:0; width:40%; background:rgba(0,0,0,0.6); display:flex; flex-direction:column; justify-content:center; align-items:center;">
                        <span style="font-size:20px;">≡</span>
                    </div>
                </div>
                <div class="v-text">
                    <h3>${p.snippet.title}</h3>
                    <p>再生リスト</p>
                </div>
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
     * YouTube上の既存プレイリストの中身を表示
     */
    async viewExternalPlaylist(listId, title) {
        const data = await YT.fetchAPI('playlistItems', {
            playlistId: listId,
            part: 'snippet',
            maxResults: 50
        });

        this.currentList = data.items || [];
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    /**
     * チャンネルアイコンの動的フェッチ
     */
    async fetchMissingIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', {
            id: ids,
            part: 'snippet'
        });

        if (data.items) {
            data.items.forEach(ch => {
                this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url;
            });
            // 表示されているアイコンを更新
            document.querySelectorAll('.ch-icon-img').forEach(img => {
                const cid = img.dataset.chid;
                if (this.channelIcons[cid]) img.src = this.channelIcons[cid];
            });
        }
    },

    /**
     * 動画一覧（グリッド）の描画
     */
    renderGrid(headerHtml = "") {
        const container = document.getElementById('view-container');
        
        // チャンネルアイコンの不足分を特定
        const missingIds = [...new Set(this.currentList.map(item => item.snippet?.channelId))]
            .filter(id => id && !this.channelIcons[id])
            .join(',');

        if (missingIds) this.fetchMissingIcons(missingIds);

        const cardsHtml = this.currentList.map((item, index) => {
            const snip = item.snippet;
            if (!snip) return '';

            // IDの正規化（search.listとvideo.listで構造が違うため）
            const vId = (typeof item.id === 'string') ? item.id : (item.id.videoId || item.id.resourceId?.videoId);
            if (!vId) return '';

            return `
            <div class="v-card">
                <div class="thumb-container">
                    <img src="${snip.thumbnails.high.url}" class="main-thumb" onclick="Actions.playVideoByIndex(${index})">
                    <img src="${this.channelIcons[snip.channelId] || ''}" 
                         class="ch-icon-img" 
                         data-chid="${snip.channelId}" 
                         onclick="event.stopPropagation(); Actions.showChannel('${snip.channelId}', '${snip.channelTitle.replace(/'/g, "\\'")}')">
                </div>
                <div class="v-text" onclick="Actions.playVideoByIndex(${index})">
                    <h3>${snip.title}</h3>
                    <p>${snip.channelTitle}</p>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div style="padding: 10px 20px 0 20px;">${headerHtml}</div>
            <div class="grid">${cardsHtml}</div>
            <div style="text-align:center; padding: 40px 0 100px 0;">
                <button class="btn primary-btn" style="margin: 0 auto; padding: 15px 40px;" onclick="Actions.loadMore()">動画をさらに読み込む</button>
            </div>`;
    },

    /**
     * インデックス指定での再生
     */
    playVideoByIndex(index) {
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

        // ショート動画判定（shortsビューであるか、タイトルにShortsが含まれる場合）
        if (this.currentView === "shorts") {
            return this.playShort(vId);
        }

        window.scrollTo(0, 0);
        const isLiked = Storage.get('yt_likes').some(x => x.id === vId);
        const isSubbed = Storage.get('yt_subs').some(x => x.id === video.snippet.channelId);

        const html = `
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
                            <button class="btn" id="like-btn" onclick="Actions.handleLike()">
                                ${isLiked ? '❤️ いいね済み' : '🤍 いいね'}
                            </button>
                            <button class="btn" onclick="Actions.openPlaylistModal()">
                                ➕ 保存
                            </button>
                            <button class="btn" onclick="window.open('https://www.youtube.com/watch?v=${vId}', '_blank')">
                                🔗 元動画
                            </button>
                        </div>
                        <div style="background:var(--card-bg); padding:15px; border-radius:12px; margin-top:15px; font-size:14px; white-space:pre-wrap; color:#ddd;">
                            ${video.snippet.description || '説明はありません。'}
                        </div>
                    </div>
                </div>
                <div class="related-area">
                    <h3 style="margin-top:0;">関連動画</h3>
                    <div id="related-list"></div>
                </div>
            </div>`;

        document.getElementById('view-container').innerHTML = html;
        
        // 履歴保存
        Storage.addHistory({
            id: vId,
            title: video.snippet.title,
            thumb: video.snippet.thumbnails.high.url,
            channelTitle: video.snippet.channelTitle
        });

        // 関連動画読み込み
        this.loadRelated(video.snippet.title);
    },

    /**
     * ショート動画専用の縦型再生
     */
    playShort(id) {
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container">
                <div class="shorts-wrapper">
                    <iframe src="${YT.getEmbedUrl(id, true)}" style="width:100%; height:100%; border:none; border-radius:15px;" allowfullscreen allow="autoplay"></iframe>
                    <div class="shorts-actions">
                        <div class="short-btn" onclick="Actions.handleLike()">❤️</div>
                        <div class="short-btn" onclick="Actions.openPlaylistModal()">➕</div>
                        <div class="short-btn" onclick="Actions.showShorts()">⚡</div>
                    </div>
                </div>
            </div>`;
    },

    /**
     * 関連動画の取得
     */
    async loadRelated(title) {
        // タイトルの最初の15文字程度を使って検索
        const q = title.substring(0, 15);
        const data = await YT.fetchAPI('search', {
            q: q,
            part: 'snippet',
            type: 'video',
            maxResults: 15
        });

        this.relatedList = data.items || [];
        const container = document.getElementById('related-list');
        if (container) {
            container.innerHTML = this.relatedList.map((v, i) => `
                <div class="side-card" onclick="Actions.play(Actions.relatedList[${i}])">
                    <img src="${v.snippet.thumbnails.medium.url}">
                    <div class="side-card-info">
                        <h4>${v.snippet.title}</h4>
                        <p>${v.snippet.channelTitle}</p>
                    </div>
                </div>`).join('');
        }
    },

    /**
     * 登録チャンネル一覧
     */
    showSubs() {
        this.saveScroll();
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        
        const html = subs.map(ch => `
            <div class="v-card" style="padding:20px; text-align:center; background:var(--card-bg);">
                <img src="${this.channelIcons[ch.id] || ''}" 
                     style="width:100px; height:100px; border-radius:50%; margin-bottom:15px; cursor:pointer;" 
                     onclick="Actions.showChannel('${ch.id}', '${ch.name.replace(/'/g, "\\'")}')">
                <h3>${ch.name}</h3>
                <div style="margin-top:10px;">
                    <button class="btn sub-btn active" style="margin:0 auto;" 
                            onclick="Actions.handleSub('${ch.id}', '${ch.name.replace(/'/g, "\\'")}')">
                        登録解除
                    </button>
                </div>
            </div>`).join('');

        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h2>登録中のチャンネル (${subs.length})</h2>
                <div class="grid">${html || '<p>登録しているチャンネルはありません。</p>'}</div>
            </div>`;
    },

    /**
     * サブスク操作のハンドリング
     */
    handleSub(id, name) {
        Storage.toggleSub({ id, name });
        if (this.currentView === "subs") {
            this.showSubs();
        } else if (this.currentPlayVideo && this.currentPlayVideo.snippet.channelId === id) {
            this.play(this.currentPlayVideo);
        }
    },

    /**
     * プレイリスト一覧
     */
    showPlaylists() {
        this.saveScroll();
        this.currentView = "playlists";
        const playlists = Storage.get('yt_playlists');
        
        const html = playlists.map(l => `
            <div class="v-card" style="padding:30px; text-align:center; background:var(--card-bg);" onclick="Actions.viewMyList('${l.name.replace(/'/g, "\\'")}')">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.deleteMyList('${l.name.replace(/'/g, "\\'")}')">削除</span>
                <div style="font-size:64px; margin-bottom:15px;">📁</div>
                <h3>${l.name}</h3>
                <p>${l.videos.length} 本の動画</p>
            </div>`).join('');

        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h2>マイプレイリスト</h2>
                <div class="grid">${html || '<p>プレイリストが作成されていません。</p>'}</div>
            </div>`;
    },

    /**
     * 自作プレイリストの中身を表示
     */
    viewMyList(name) {
        const playlists = Storage.get('yt_playlists');
        const list = playlists.find(p => p.name === name);
        if (!list) return;

        const cards = list.videos.map((v, i) => `
            <div class="v-card">
                <span class="delete-tag" onclick="event.stopPropagation(); Actions.removeVideoFromMyList('${name.replace(/'/g, "\\'")}', '${v.id}')">✖</span>
                <div class="thumb-container">
                    <img src="${v.thumb}" class="main-thumb" onclick="Actions.playFromMyList('${name.replace(/'/g, "\\'")}', ${i})">
                </div>
                <div class="v-text">
                    <h3>${v.title}</h3>
                    <p>${v.channelTitle}</p>
                </div>
            </div>`).join('');

        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2>${name}</h2>
                    <button class="btn" onclick="Actions.showPlaylists()">戻る</button>
                </div>
                <div class="grid">${cards || '<p>このリストに動画はありません。</p>'}</div>
            </div>`;
    },

    /**
     * 自作プレイリストからの再生
     */
    playFromMyList(playlistName, index) {
        const playlists = Storage.get('yt_playlists');
        const list = playlists.find(p => p.name === playlistName);
        if (list && list.videos[index]) {
            const v = list.videos[index];
            // 再生用にダミーのビデオオブジェクトを作成
            this.play({
                id: v.id,
                snippet: {
                    title: v.title,
                    thumbnails: { high: { url: v.thumb } },
                    channelTitle: v.channelTitle,
                    channelId: ''
                }
            });
        }
    },

    /**
     * 自作プレイリスト自体の削除
     */
    deleteMyList(name) {
        if (confirm(`プレイリスト「${name}」を完全に削除しますか？`)) {
            Storage.deletePlaylist(name);
            this.showPlaylists();
        }
    },

    /**
     * 動画をプレイリストから除外
     */
    removeVideoFromMyList(pName, vId) {
        Storage.removeFromPlaylist(pName, vId);
        this.viewMyList(pName);
    },

    /**
     * 保存モーダルを開く
     */
    openPlaylistModal() {
        const modal = document.getElementById('modal-overlay');
        modal.style.display = 'flex';
        
        const playlists = Storage.get('yt_playlists');
        const selector = document.getElementById('playlist-selector');
        
        selector.innerHTML = playlists.map(l => `
            <div class="p-item" onclick="Actions.addCurrentToMyList('${l.name.replace(/'/g, "\\'")}')">
                <span>📁</span> ${l.name} (${l.videos.length})
            </div>
        `).join('') || '<p style="padding:20px; color:#aaa;">保存先のリストを作成してください。</p>';
    },

    /**
     * モーダルを閉じる
     */
    closeModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    },

    /**
     * モーダル外クリックで閉じる
     */
    closeModalOutside(e) {
        if (e.target.id === 'modal-overlay') this.closeModal();
    },

    /**
     * モーダル内での新規リスト作成
     */
    createNewPlaylist() {
        const input = document.getElementById('new-playlist-name');
        const name = input.value.trim();
        if (name) {
            const success = Storage.createPlaylist(name);
            if (success) {
                input.value = '';
                this.openPlaylistModal(); // リストを再描画
            } else {
                alert("同名のリストが既に存在します。");
            }
        }
    },

    /**
     * 動画をリストへ追加
     */
    addCurrentToMyList(pName) {
        const v = this.currentPlayVideo;
        if (!v) return;

        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        const success = Storage.addToPlaylist(pName, {
            id: vId,
            title: v.snippet.title,
            thumb: v.snippet.thumbnails.high.url,
            channelTitle: v.snippet.channelTitle
        });

        if (success) {
            this.closeModal();
        } else {
            alert("既にリストに追加されています。");
        }
    },

    /**
     * いいね操作
     */
    handleLike() {
        const v = this.currentPlayVideo;
        if (!v) return;
        const vId = (typeof v.id === 'string') ? v.id : (v.id.videoId || v.id.resourceId?.videoId);
        
        Storage.toggleLike({
            id: vId,
            title: v.snippet.title,
            thumb: v.snippet.thumbnails.high.url,
            channelTitle: v.snippet.channelTitle
        });
        
        // UI更新のため再描画
        this.play(this.currentPlayVideo);
    },

    /**
     * いいね一覧
     */
    showLikes() {
        this.saveScroll();
        this.currentView = "likes";
        const likes = Storage.get('yt_likes');
        
        this.currentList = likes.map(x => ({
            id: x.id,
            snippet: {
                title: x.title,
                thumbnails: { high: { url: x.thumb } },
                channelTitle: x.channelTitle
            }
        }));
        
        this.renderGrid("<h2>いいねした動画</h2>");
    },

    /**
     * 再生履歴一覧
     */
    showHistory() {
        this.saveScroll();
        this.currentView = "history";
        const history = Storage.get('yt_history');
        
        this.currentList = history.map(x => ({
            id: x.id,
            snippet: {
                title: x.title,
                thumbnails: { high: { url: x.thumb } },
                channelTitle: x.channelTitle
            }
        }));
        
        this.renderGrid("<h2>再生履歴</h2>");
    }
};

/**
 * ページロード時のエントリーポイント
 */
window.onload = () => {
    Actions.init();
};

/**
 * iPadなどのモバイル端末でのリサイズ・回転対応
 */
window.onresize = () => {
    // 画面サイズ変更時に必要であれば再描画を検討
};
