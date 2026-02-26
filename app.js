/* app vr4_final.js - Education & m3u8 Hybrid with Server-side Download
  既存の全機能を保持し、プレイヤー切替、自鯖ダウンロード、m3u8データコピーを追加
*/

const YT = {
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"],
    currentEduKey: "",
    isForcedM3U8: false,

    async refreshEduKey() {
        try {
            const response = await fetch('/api/get_key');
            if (!response.ok) throw new Error("APIアクセス失敗");
            const data = await response.json();
            if (data && data.key) {
                this.currentEduKey = data.key;
                console.log("最新キーを自動収集完了✅");
                Actions.showStatusNotification("最新キーを自動更新しました✅");
            }
        } catch (error) { console.error("自動収集エラー:", error); }
    },

    seek(seconds) {
        const iframe = document.querySelector('.video-wrapper iframe, .shorts-container iframe');
        const video = document.querySelector('.video-wrapper video');
        if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command', func: 'seekTo', args: [seconds, true]
            }), '*');
        } else if (video) {
            video.currentTime += seconds;
        }
    },

    getCurrentKey() {
        const index = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[index];
    },

    rotateKey() {
        let index = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
        if (index >= this.keys.length) index = 0;
        localStorage.setItem('yt_key_index', index);
    },

    async fetchAPI(endpoint, params) {
        const queryParams = new URLSearchParams({ ...params, key: this.getCurrentKey() });
        const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
        try {
            const response = await fetch(url);
            if (response.status === 403) { this.rotateKey(); return this.fetchAPI(endpoint, params); }
            if (!response.ok) throw new Error("API error");
            return await response.json();
        } catch (error) { return { items: [], nextPageToken: "" }; }
    },

    getEmbedUrl(id, isShort = false) {
        const config = { enc: this.currentEduKey, hideTitle: true };
        const params = new URLSearchParams({
            autoplay: 1, origin: location.origin,
            embed_config: JSON.stringify(config), rel: 0, modestbranding: 1, enablejsapi: 1, v: id
        });
        if (isShort) { params.append('loop', '1'); params.append('playlist', id); }
        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

const Storage = {
    get(key) { const data = localStorage.getItem(key); try { return data ? JSON.parse(data) : []; } catch (e) { return []; } },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    addHistory(v) { let h = this.get('yt_history'); h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50); this.set('yt_history', h); },
    toggleSub(ch) {
        let s = this.get('yt_subs');
        const i = s.findIndex(x => x.id === ch.id);
        if (i > -1) s.splice(i, 1); else s.push({ id: ch.id, name: ch.name, thumb: ch.thumb || '' });
        this.set('yt_subs', s);
    },
    toggleWatchLater(v) {
        let list = this.get('yt_watchlater');
        const i = list.findIndex(x => x.id === v.id);
        if (i > -1) list.splice(i, 1); else list.unshift(v);
        this.set('yt_watchlater', list);
    },
    isWatchLater(id) { return this.get('yt_watchlater').some(x => x.id === id); }
};

const Actions = {
    currentList: [],
    relatedList: [],
    currentIndex: -1,
    channelIcons: {},
    currentView: "home",
    nextToken: "",
    currentParams: {},
    selectedSubs: [],
    currentVideoData: null,

    init() {
        const input = document.getElementById('search-input');
        input.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); this.search(); input.blur(); } 
        });
        document.getElementById('search-btn').onclick = () => this.search();
        
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            if (!document.getElementById('nav-watch-later')) {
                const historyNav = document.querySelector('.sidebar .nav-item[onclick="Actions.showHistory()"]');
                if (historyNav) historyNav.insertAdjacentHTML('beforebegin', '<div id="nav-watch-later" class="nav-item" onclick="Actions.showWatchLater()">📌<span>後で見る</span></div>');
            }
            if (!document.getElementById('nav-ai-recommend')) {
                const homeNav = document.querySelector('.sidebar .nav-item[onclick="Actions.goHome()"]');
                if (homeNav) homeNav.insertAdjacentHTML('afterend', '<div id="nav-ai-recommend" class="nav-item" onclick="Actions.showAIRecommendations()">🤖<span>AIおすすめ</span></div>');
            }
        }
    },

    // プレイヤーの手動切り替え
    togglePlayer() {
        YT.isForcedM3U8 = !YT.isForcedM3U8;
        if (this.currentVideoData) {
            this.play(this.currentVideoData);
            this.showStatusNotification(YT.isForcedM3U8 ? "m3u8プレイヤーに切替" : "Educationプレイヤーに切替");
        }
    },

    // m3u8のテキストデータそのものをコピー
    async copyM3U8Content(vId) {
        if (!vId.startsWith('http')) {
            this.showStatusNotification("YouTube IDからはデータ取得不可");
            return;
        }
        try {
            const resp = await fetch(vId);
            const text = await resp.text();
            await navigator.clipboard.writeText(text);
            this.showStatusNotification("m3u8データをコピー完了 ✅");
        } catch (e) { this.showStatusNotification("データ取得エラー"); }
    },

    // 自鯖を通じたダウンロード処理
    serverSideDownload(vId) {
        this.showStatusNotification("自鯖でダウンロードを開始します...");
        const youtubeUrl = vId.startsWith('http') ? vId : `https://www.youtube.com/watch?v=${vId}`;
        // 自鯖のAPIエンドポイントへリクエスト（例: vercel側の /api/download など）
        window.location.href = `/api/download?url=${encodeURIComponent(youtubeUrl)}`;
    },

    async showAIRecommendations() {
        this.currentView = "ai_recommend";
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>🤖 AIが好みを分析中...</h2></div>`;
        const history = Storage.get('yt_history');
        if (history.length < 3) {
            container.innerHTML = `<div style="padding:20px;"><h2>🤖 分析にはあと ${3 - history.length} 件の視聴履歴が必要です。</h2></div>`;
            return;
        }
        try {
            const resp = await fetch('/api/get_recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: history })
            });
            const aiData = await resp.json();
            this.currentParams = { q: aiData.query, part: 'snippet', maxResults: 24, type: 'video' };
            const data = await YT.fetchAPI('search', this.currentParams);
            this.currentList = data.items || [];
            this.nextToken = data.nextPageToken || "";
            this.renderGrid(`<h2>🤖 AIおすすめ: ${aiData.query}</h2><p style="color:#aaa; margin:-10px 0 20px 0;">${aiData.explanation}</p>`);
        } catch (e) { container.innerHTML = `<div style="padding:20px;"><h2>AI分析エラーが発生しました。</h2></div>`; }
    },

    showStatusNotification(text) {
        const div = document.createElement('div');
        div.style = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:white; padding:12px 24px; border-radius:30px; z-index:9999; font-size:14px; pointer-events:none; transition: opacity 0.5s; box-shadow:0 5px 15px rgba(0,0,0,0.5);";
        div.innerText = text;
        document.body.appendChild(div);
        setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 500); }, 3000);
    },

    async goHome() {
        this.currentView = "home";
        this.currentParams = { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 };
        const data = await YT.fetchAPI('videos', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid("<h2>急上昇</h2>");
    },

    async showShorts() {
        this.currentView = "shorts";
        this.currentParams = { q: '#Shorts', part: 'snippet', type: 'video', videoDuration: 'short', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid("<h2>ショート</h2>");
    },

    async showLiveHub() {
        this.currentView = "live";
        this.currentParams = { q: 'live', part: 'snippet', type: 'video', eventType: 'live', regionCode: 'JP', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid("<h2>🔴 ライブ配信</h2>");
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        this.currentParams = { q, part: 'snippet', maxResults: 24, type: 'video' };
        if (this.currentView === "shorts") {
            this.currentParams.videoDuration = "short";
            if (!this.currentParams.q.includes("#Shorts")) this.currentParams.q += " #Shorts";
        } else if (this.currentView === "live") { this.currentParams.eventType = "live"; }
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid(`<h2>"${q}" の検索結果</h2>`);
    },

    renderCards(items) {
        return items.map((item, index) => {
            const snip = item.snippet;
            return `
            <div class="v-card" onclick="Actions.playFromList(${index})">
                <div class="thumb-container">
                    <img src="${snip.thumbnails.high?.url || snip.thumbnails.medium?.url}" class="main-thumb">
                    ${snip.liveBroadcastContent === 'live' ? '<div class="live-badge">● LIVE</div>' : ''}
                    <img src="${this.channelIcons[snip.channelId] || ''}" class="ch-icon-img" data-chid="${snip.channelId}">
                </div>
                <div class="v-text"><h3>${snip.title}</h3><p>${snip.channelTitle}</p></div>
            </div>`;
        }).join('');
    },

    renderGrid(headerHtml = "") {
        const container = document.getElementById('view-container');
        const moreBtn = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0;">もっと読み込む</button>` : "";
        if (headerHtml) container.dataset.header = headerHtml;
        const currentHeader = container.dataset.header || "";
        container.innerHTML = `<div style="padding: 10px 20px;">${currentHeader}</div><div class="grid">${this.renderCards(this.currentList)}</div>${moreBtn}`;
        const ids = this.currentList.map(i => i.snippet?.channelId).filter(id => id && !this.channelIcons[id]).join(',');
        if (ids) this.fetchMissingIcons(ids);
    },

    async loadMore() {
        if (!this.nextToken) return;
        const endpoint = (this.currentView === 'home') ? 'videos' : (this.currentView === 'playlist') ? 'playlistItems' : 'search';
        const data = await YT.fetchAPI(endpoint, { ...this.currentParams, pageToken: this.nextToken });
        this.currentList = [...this.currentList, ...data.items];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid();
    },

    playFromList(index) { this.currentIndex = index; this.play(this.currentList[index]); },
    playFromRelated(index) { if (this.relatedList && this.relatedList[index]) this.play(this.relatedList[index]); },
    playRelative(offset) {
        const newIndex = this.currentIndex + offset;
        if (newIndex >= 0 && newIndex < this.currentList.length) this.playFromList(newIndex);
    },

    async fetchMissingIcons(ids) {
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if (data.items) {
            data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
            document.querySelectorAll('.ch-icon-img').forEach(img => {
                const cid = img.dataset.chid;
                if (this.channelIcons[cid]) img.src = this.channelIcons[cid];
            });
        }
    },

    changeSpeed(rate) {
        const iframe = document.querySelector('.video-wrapper iframe, .shorts-container iframe');
        const video = document.querySelector('.video-wrapper video');
        if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [rate] }), '*');
        } else if (video) { video.playbackRate = rate; }
    },

    handleWatchLater(id, title, channelTitle, thumb, channelId) {
        Storage.toggleWatchLater({ id, title, channelTitle, thumb, channelId });
        if (this.currentIndex !== -1 && !["subs","watchlater"].includes(this.currentView)) {
            this.play(this.currentList[this.currentIndex]);
        } else if (this.currentView === "watchlater") { this.showWatchLater(); }
    },

    async play(video) {
        this.currentVideoData = video;
        let vId = video.contentDetails?.videoId || (video.id?.videoId || (typeof video.id === 'string' ? video.id : null));
        const snip = video.snippet;
        const isSubbed = Storage.get('yt_subs').some(x => x.id === snip.channelId);
        const isWatchLater = Storage.isWatchLater(vId);
        
        const isM3U8Mode = YT.isForcedM3U8 || (vId && vId.startsWith('http') && vId.includes('.m3u8'));
        const isShorts = this.currentView === "shorts" || snip.title.includes("#Shorts");
        
        const safeTitle = snip.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeChTitle = snip.channelTitle.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const thumbUrl = snip.thumbnails.high?.url || '';

        window.scrollTo(0, 0);

        let playerHtml = isM3U8Mode 
            ? `<video id="m3u8-player" controls autoplay style="width:100%; height:100%; background:#000;"></video>`
            : `<iframe src="${YT.getEmbedUrl(vId, isShorts)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>`;

        if (isShorts) {
            document.getElementById('view-container').innerHTML = `
                <div class="shorts-container">
                    <div class="nav-arrow arrow-prev" onclick="Actions.playRelative(-1)">←</div>
                    <div class="nav-arrow arrow-next" onclick="Actions.playRelative(1)">→</div>
                    <div style="width:360px; height:640px; background:#000; border-radius:15px; overflow:hidden;">${playerHtml}</div>
                    <div style="width:360px; margin-top:15px;">
                        <h3>${snip.title}</h3>
                        <div style="display:flex; flex-wrap:wrap; gap: 8px;">
                            <button class="btn" onclick="Actions.togglePlayer()">⇄ 切替</button>
                            <button class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${safeChTitle}', true)">${isSubbed ? '済' : '登録'}</button>
                            <button class="btn" onclick="Actions.copyM3U8Content('${vId}')">📋 Data</button>
                            <button class="btn-download" onclick="Actions.serverSideDownload('${vId}')">📥</button>
                        </div>
                    </div>
                </div>`;
        } else {
            document.getElementById('view-container').innerHTML = `
                <div class="watch-layout">
                    <div class="player-area">
                        <div class="video-wrapper">${playerHtml}</div>
                        <div style="margin-top:15px; display:flex; gap:10px; align-items:center; background:#1e1e1e; padding:10px 20px; border-radius:10px; flex-wrap:wrap;">
                            <button class="btn" onclick="Actions.togglePlayer()" style="background:#0055ff;">⇄ プレイヤー切替</button>
                            <div style="border-left:1px solid #333; height:20px; margin:0 10px;"></div>
                            <button class="btn" onclick="Actions.changeSpeed(1.0)">1.0x</button>
                            <button class="btn" onclick="Actions.changeSpeed(1.5)">1.5x</button>
                            <button class="btn" onclick="YT.seek(-10)">⏪ 10s</button>
                            <button class="btn" onclick="YT.seek(10)">10s ⏩</button>
                        </div>
                        <div style="padding-top:15px;">
                            <h2>${snip.title}</h2>
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:15px; flex-wrap:wrap; gap:10px;">
                                <div style="display:flex; align-items:center; cursor:pointer;" onclick="Actions.showChannel('${snip.channelId}')">
                                    <img src="${this.channelIcons[snip.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                    <span style="margin-left:10px; font-weight:bold;">${snip.channelTitle}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <button class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${safeChTitle}', true)">${isSubbed ? '登録済み' : 'チャンネル登録'}</button>
                                    <button class="btn ${isWatchLater ? 'subbed' : ''}" onclick="Actions.handleWatchLater('${vId}', '${safeTitle}', '${safeChTitle}', '${thumbUrl}', '${snip.channelId}')">${isWatchLater ? '保存済み' : '📌 後で見る'}</button>
                                    <button class="btn" style="background:#444;" onclick="Actions.copyM3U8Content('${vId}')">📋 m3u8データコピー</button>
                                    <button class="btn-download" onclick="Actions.serverSideDownload('${vId}')">📥 自鯖ダウンロード</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="related-area"><h3 id="side-title" style="margin-top:0;">関連動画</h3><div id="side-content-box"></div></div>
                </div>`;
            
            const sideBox = document.getElementById('side-content-box');
            if (this.currentView === "playlist") {
                document.getElementById('side-title').innerText = "再生リスト";
                this.relatedList = this.currentList; 
            } else {
                const qK = snip.title.replace(/[【】「」]/g, ' ').split(' ').filter(w => w.length > 1).slice(0, 3).join(' ');
                const rel = await YT.fetchAPI('search', { q: qK, type: 'video', part: 'snippet', maxResults: 15 });
                this.relatedList = rel.items || [];
            }
            sideBox.innerHTML = this.relatedList.map((i, idx) => `
                <div class="v-card" style="display:flex; gap:10px; margin-bottom:12px;" onclick="Actions.playFromRelated(${idx})">
                    <img src="${i.snippet.thumbnails.medium?.url || ''}" style="width:140px; aspect-ratio:16/9; object-fit:cover; border-radius:8px;">
                    <div style="font-size:12px;"><div style="font-weight:bold;">${i.snippet.title}</div><div style="color:#aaa;">${i.snippet.channelTitle}</div></div>
                </div>`).join('');
        }

        if (isM3U8Mode && typeof Hls !== 'undefined') {
            const videoElement = document.getElementById('m3u8-player');
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(vId.startsWith('http') ? vId : `https://example.com/api/m3u8?id=${vId}`);
                hls.attachMedia(videoElement);
            }
        }
        Storage.addHistory({ id: vId, title: snip.title, thumb: snip.thumbnails.high?.url, channelTitle: snip.channelTitle });
    },

    async showChannel(chId) {
        this.currentView = "channel";
        const container = document.getElementById('view-container');
        const chData = await YT.fetchAPI('channels', { id: chId, part: 'snippet,brandingSettings' });
        const ch = chData.items[0];
        const isSubbed = Storage.get('yt_subs').some(x => x.id === chId);
        container.innerHTML = `
            <div class="channel-header">
                <div style="width:100%; height:150px; background:url(${ch.brandingSettings?.image?.bannerExternalUrl || ''}) center/cover #333; border-radius:15px;"></div>
                <div style="display:flex; align-items:center; padding:20px;">
                    <img src="${ch.snippet.thumbnails.medium.url}" style="width:80px; height:80px; border-radius:50%;">
                    <div style="margin-left:20px;"><h1>${ch.snippet.title}</h1></div>
                    <button class="btn ${isSubbed ? 'subbed' : ''}" style="margin-left:auto;" onclick="Actions.handleSub('${chId}', '${ch.snippet.title.replace(/'/g, "\\'")}', true)">${isSubbed ? '登録済み' : '登録'}</button>
                </div>
                <div class="tabs"><div class="tab active" onclick="Actions.loadChannelTab('${chId}', 'videos', 'date')">最新</div><div class="tab" onclick="Actions.loadChannelTab('${chId}', 'playlists')">再生リスト</div></div>
            </div><div id="channel-content-grid" class="grid"></div><div id="more-btn-area"></div>`;
        this.loadChannelTab(chId, 'videos', 'date');
    },

    async loadChannelTab(chId, type, order = 'date') {
        const grid = document.getElementById('channel-content-grid');
        grid.innerHTML = "読込中...";
        if (type === 'videos') {
            const data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 24 });
            this.currentList = data.items || [];
            this.nextToken = data.nextPageToken || "";
            grid.innerHTML = this.renderCards(this.currentList);
        } else if (type === 'playlists') {
            const data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 24 });
            grid.innerHTML = data.items.map(pl => `<div class="v-card" onclick="Actions.showPlaylist('${pl.id}', '${pl.snippet.title.replace(/'/g, "\\")}')"><img src="${pl.snippet.thumbnails.high.url}" class="main-thumb"><h3>${pl.snippet.title}</h3></div>`).join('');
            this.nextToken = "";
        }
        document.getElementById('more-btn-area').innerHTML = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%;">もっと読む</button>` : "";
    },

    async showPlaylist(plId, title) {
        this.currentView = "playlist";
        this.currentParams = { playlistId: plId, part: 'snippet,contentDetails', maxResults: 24 };
        const data = await YT.fetchAPI('playlistItems', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    handleSub(id, name, refresh = false) {
        Storage.toggleSub({ id, name, thumb: this.channelIcons[id] || '' });
        if (refresh) {
            if (this.currentView === "channel") this.showChannel(id);
            else if (this.currentIndex !== -1) this.play(this.currentList[this.currentIndex]);
        }
    },

    toggleSubSelect(chId) {
        if (this.selectedSubs.includes(chId)) { this.selectedSubs = this.selectedSubs.filter(id => id !== chId); }
        else if (this.selectedSubs.length < 5) { this.selectedSubs.push(chId); }
        this.showSubs(); 
    },

    async catchLatestSubVideos() {
        if (this.selectedSubs.length === 0) return;
        this.currentView = "latest_subs";
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>キャッチ中...</h2></div>`;
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        let allVideos = [];
        const promises = this.selectedSubs.map(chId => YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: 'date', publishedAfter: twoDaysAgo }));
        const results = await Promise.all(promises);
        results.forEach(res => { if (res.items) allVideos = allVideos.concat(res.items); });
        allVideos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = allVideos; this.renderGrid(`<h2>最新の登録動画</h2>`);
    },

    showSubs() {
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => {
            const isSel = this.selectedSubs.includes(ch.id);
            const borderStyle = isSel ? 'border: 4px solid #0055ff;' : 'border: 4px solid #444;';
            return `<div class="v-card" style="padding:20px; text-align:center;" onclick="Actions.showChannel('${ch.id}')">
                <div style="border-radius:50%; padding:4px; ${borderStyle} display:inline-block;" onclick="event.stopPropagation(); Actions.toggleSubSelect('${ch.id}')">
                    <img src="${ch.thumb}" style="width:92px; height:92px; border-radius:50%;">
                </div>
                <h3>${ch.name}</h3>
                <button class="btn subbed" onclick="event.stopPropagation(); Actions.handleSub('${ch.id}', '', true); Actions.showSubs();">解除</button>
            </div>`;
        }).join('');
        const btn = this.selectedSubs.length > 0 ? `<div style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%);"><button class="btn" style="background:#0055ff; padding:15px 30px; border-radius:30px;" onclick="Actions.catchLatestSubVideos()">最新動画をキャッチ</button></div>` : "";
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録済み</h2><div class="grid">${html}</div></div>${btn}`;
    },

    showWatchLater() {
        this.currentView = "watchlater";
        const list = Storage.get('yt_watchlater');
        this.currentList = list.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId } }));
        this.renderGrid("<h2>📌 後で見る</h2>");
    },

    showHistory() {
        this.currentView = "history";
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>履歴</h2>");
    }
};

window.onload = async () => { Actions.init(); await YT.refreshEduKey(); Actions.goHome(); };
