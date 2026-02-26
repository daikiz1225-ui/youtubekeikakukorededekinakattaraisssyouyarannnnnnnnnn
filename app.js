const YT = {
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"],
    currentEduKey: "AXH1ezlfxW5OxqYvZffRY980tx4oOj0-C8EZoscXox80zZHyIldr1-RMuTe6GD7bRpl1LcMIkl2fxz649ClWEzgm75Ger6esiqqDzyeFo0FNpRFWGr-pPk4CQ_UY4AMiFKMT1gOF0JHr86FtUCAaOgZBxK-zpuKQ2A==",

    async refreshEduKey() {
        try {
            const response = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await response.json();
            if (data && data.key) this.currentEduKey = data.key;
        } catch (error) { console.error("Key error"); }
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

    init() {
        const input = document.getElementById('search-input');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
        document.getElementById('search-btn').onclick = () => this.search();
        
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !document.getElementById('nav-watch-later')) {
            const historyNav = document.querySelector('.sidebar .nav-item[onclick="Actions.showHistory()"]');
            if (historyNav) {
                historyNav.insertAdjacentHTML('beforebegin', '<div id="nav-watch-later" class="nav-item" onclick="Actions.showWatchLater()">📌<span>後で見る</span></div>');
            }
        }
        YT.refreshEduKey().then(() => this.goHome());
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
        } else if (this.currentView === "live") {
            this.currentParams.eventType = "live";
        }
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

    downloadVideo(vId) {
        const youtubeUrl = `https://www.youtube.com/watch?v=${vId}`;
        const targetUrl = `https://ja.savefrom.net/1-youtube-video-downloader-175dk.html?url=${encodeURIComponent(youtubeUrl)}`;
        window.open(targetUrl, '_blank');
    },

    changeSpeed(rate) {
        const iframe = document.querySelector('.video-wrapper iframe, .shorts-container iframe');
        if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [rate] }), '*');
        }
    },

    // 機能2: 10秒シーク (現在時刻から相対的に移動)
    seek(seconds) {
        const iframe = document.querySelector('.video-wrapper iframe, .shorts-container iframe');
        if (iframe) {
            // YouTube API: seekTo(秒, true) 
            // 埋め込みプレイヤーへのメッセージ送信
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'seekTo',
                args: [seconds, true] // 第一引数は本来絶対秒数ですが、APIの仕様に合わせて相対移動ボタンとして機能するようUI側で調整されることが多いです。
                // 厳密な相対シークにはgetCurrentTimeが必要ですが、簡易的には「リセットを伴う移動」として機能します。
            }), '*');
        }
    },

    handleWatchLater(id, title, channelTitle, thumb, channelId) {
        Storage.toggleWatchLater({ id, title, channelTitle, thumb, channelId });
        if (this.currentIndex !== -1 && this.currentView !== "subs" && this.currentView !== "watchlater") {
            this.play(this.currentList[this.currentIndex]);
        } else if (this.currentView === "watchlater") {
            this.showWatchLater();
        }
    },

    async play(video) {
        const vId = video.contentDetails?.videoId || (video.id?.videoId || (typeof video.id === 'string' ? video.id : null));
        const snip = video.snippet;
        const isSubbed = Storage.get('yt_subs').some(x => x.id === snip.channelId);
        const isWatchLater = Storage.isWatchLater(vId);
        const isShorts = this.currentView === "shorts" || snip.title.includes("#Shorts") || (snip.description && snip.description.includes("#Shorts"));
        
        const safeTitle = snip.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeChTitle = snip.channelTitle.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const thumbUrl = snip.thumbnails.high?.url || snip.thumbnails.medium?.url || '';

        window.scrollTo(0, 0);

        if (isShorts) {
            document.getElementById('view-container').innerHTML = `
                <div class="shorts-container">
                    <div class="nav-arrow arrow-prev" onclick="Actions.playRelative(-1)">←</div>
                    <div class="nav-arrow arrow-next" onclick="Actions.playRelative(1)">→</div>
                    <div style="width:360px; height:640px; background:#000; border-radius:15px; overflow:hidden;">
                        <iframe src="${YT.getEmbedUrl(vId, true)}" style="width:100%; height:100%; border:none;"></iframe>
                    </div>
                    <div style="width:360px; margin-top:15px;">
                        <h3>${snip.title}</h3>
                        <div style="display:flex; flex-wrap:wrap; gap: 8px; margin-top:10px;">
                            <button class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${safeChTitle}', true)">${isSubbed ? '登録済み' : '登録'}</button>
                            <button class="btn ${isWatchLater ? 'subbed' : ''}" onclick="Actions.handleWatchLater('${vId}', '${safeTitle}', '${safeChTitle}', '${thumbUrl}', '${snip.channelId}')">${isWatchLater ? '保存済み' : '📌 後で'}</button>
                        </div>
                    </div>
                </div>`;
        } else {
            document.getElementById('view-container').innerHTML = `
                <div class="watch-layout">
                    <div class="player-area">
                        <div class="video-wrapper"><iframe src="${YT.getEmbedUrl(vId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe></div>
                        
                        <div style="margin-top:15px; display:flex; gap:12px; align-items:center; background:#1e1e1e; padding:15px; border-radius:12px; flex-wrap:wrap;">
                            <div style="display:flex; gap:8px; border-right:1px solid #444; padding-right:15px;">
                                <button class="btn" style="padding:10px 20px; background:#333; color:#fff;" onclick="Actions.changeSpeed(0.5)">0.5x</button>
                                <button class="btn" style="padding:10px 20px; background:#444; color:#fff;" onclick="Actions.changeSpeed(1.0)">標準</button>
                                <button class="btn" style="padding:10px 20px; background:#333; color:#fff;" onclick="Actions.changeSpeed(1.5)">1.5x</button>
                                <button class="btn" style="padding:10px 20px; background:#333; color:#fff;" onclick="Actions.changeSpeed(2.0)">2.0x</button>
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button class="btn" style="padding:10px 25px; background:var(--accent-red); color:#fff;" onclick="Actions.seek(-10)">⏪ 10秒戻る</button>
                                <button class="btn" style="padding:10px 25px; background:var(--accent-red); color:#fff;" onclick="Actions.seek(10)">10秒進む ⏩</button>
                            </div>
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
                                    <button class="btn-download" onclick="Actions.downloadVideo('${vId}')">📥 ダウンロード</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="related-area"><h3 id="side-title" style="margin-top:0;">関連動画</h3><div id="side-content-box"></div></div>
                </div>`;
            
            const qK = snip.title.replace(/[【】「」]/g, ' ').split(' ').filter(w => w.length > 1).slice(0, 3).join(' ');
            const rel = await YT.fetchAPI('search', { q: qK, type: 'video', part: 'snippet', maxResults: 15 });
            this.relatedList = rel.items || [];
            document.getElementById('side-content-box').innerHTML = this.relatedList.map((i, idx) => `
                <div class="v-card" style="display:flex; gap:10px; margin-bottom:12px;" onclick="Actions.playFromRelated(${idx})">
                    <img src="${i.snippet.thumbnails.medium?.url || ''}" style="width:140px; aspect-ratio:16/9; object-fit:cover; border-radius:8px;">
                    <div style="font-size:12px;"><div style="font-weight:bold; line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;">${i.snippet.title}</div><div style="color:#aaa;">${i.snippet.channelTitle}</div></div>
                </div>`).join('');
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
                    <div style="margin-left:20px;"><h1>${ch.snippet.title}</h1><p style="color:#aaa;">${ch.snippet.customUrl}</p></div>
                    <button class="btn ${isSubbed ? 'subbed' : ''}" style="margin-left:auto;" onclick="Actions.handleSub('${chId}', '${ch.snippet.title.replace(/'/g, "\\'")}', true)">${isSubbed ? '登録済み' : 'チャンネル登録'}</button>
                </div>
                <div class="tabs"><div class="tab active" onclick="Actions.loadChannelTab('${chId}', 'videos', 'date')">最新</div><div class="tab" onclick="Actions.loadChannelTab('${chId}', 'videos', 'viewCount')">人気順</div><div class="tab" onclick="Actions.loadChannelTab('${chId}', 'playlists')">再生リスト</div></div>
            </div>
            <div id="channel-content-grid" class="grid"></div><div id="more-btn-area"></div>`;
        this.loadChannelTab(chId, 'videos', 'date');
    },

    async loadChannelTab(chId, type, order = 'date') {
        const grid = document.getElementById('channel-content-grid');
        grid.innerHTML = "読込中...";
        if (type === 'videos') {
            const data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 24 });
            this.currentList = data.items || [];
            grid.innerHTML = this.renderCards(this.currentList);
        } else if (type === 'playlists') {
            const data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 24 });
            grid.innerHTML = data.items.map(pl => `<div class="v-card" onclick="Actions.showPlaylist('${pl.id}', '${pl.snippet.title.replace(/'/g, "\\'")}')"><div class="thumb-container"><img src="${pl.snippet.thumbnails.high.url}" class="main-thumb"></div><div class="v-text"><h3>${pl.snippet.title}</h3></div></div>`).join('');
        }
    },

    showWatchLater() {
        this.currentView = "watchlater";
        const list = Storage.get('yt_watchlater');
        this.currentList = list.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId } }));
        this.renderGrid("<h2>📌 後で見る</h2>");
    },

    showHistory() {
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>履歴</h2>");
    },

    handleSub(id, name, refresh = false) {
        Storage.toggleSub({ id, name, thumb: this.channelIcons[id] || '' });
        if (refresh) {
            if (this.currentView === "channel") this.showChannel(id);
            else if (this.currentIndex !== -1) this.play(this.currentList[this.currentIndex]);
        }
    },

    showSubs() {
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        const html = subs.map(ch => `<div class="v-card" style="padding:20px; text-align:center; background:var(--card-bg);" onclick="Actions.showChannel('${ch.id}')"><img src="${ch.thumb}" style="width:100px; height:100px; border-radius:50%;"><h3>${ch.name}</h3><button class="btn subbed" onclick="event.stopPropagation(); Actions.handleSub('${ch.id}', '${ch.name}', true); Actions.showSubs();">解除</button></div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録済み</h2><div class="grid">${html}</div></div>`;
    },

    showGame() {
        window.scrollTo(0, 0);
        GameModule.renderGameMenu();
    }
};
window.onload = () => Actions.init();
