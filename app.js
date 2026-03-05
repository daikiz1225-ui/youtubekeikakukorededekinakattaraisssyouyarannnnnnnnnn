/* app.js - Full Integrated Version (No Omissions) */

// --- ユーティリティ ---
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diff = Math.floor((now - past) / 1000);
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    return `${Math.floor(diff / 86400)}日前`;
}

function formatViews(views) {
    if (!views) return "0回";
    const num = parseInt(views);
    if (num >= 100000000) return `${(num / 100000000).toFixed(1)}億回`;
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万回`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}千回`;
    return `${num}回`;
}

const YT = {
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"],
    currentEduKey: "",

    getProxiedThumb(video) {
        if (!video || !video.snippet || !video.snippet.thumbnails) return "";
        // 動画IDの取得
        const id = video.contentDetails?.videoId || (typeof video.id === 'string' ? video.id : (video.id?.videoId || ""));
        
        // 再生リストの場合の処理
        if (video.id?.playlistId || video.kind === 'youtube#playlist') {
            const plId = video.id?.playlistId || video.id;
            // 再生リストのデフォルトサムネイルURLから動画IDを抽出してプロキシを通す（thumb.jsがvi/IDを参照するため）
            const thumbUrl = video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url || "";
            const match = thumbUrl.match(/\/vi\/([^\/]+)\//);
            if (match && match[1]) return `/api/thumb?id=${match[1]}`;
            return thumbUrl; // 抽出できなければそのまま
        }

        if (!id) return video.snippet.thumbnails.high?.url || "";
        return `/api/thumb?id=${id}`;
    },

    async refreshEduKey() {
        try {
            const response = await fetch('/api/get_key');
            if (!response.ok) throw new Error("APIアクセス失敗");
            const data = await response.json();
            if (data && data.key) {
                this.currentEduKey = data.key;
                Actions.showStatusNotification("最新キーを自動更新しました✅");
            }
        } catch (error) { console.error("自動収集エラー:", error); }
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
    isAdmin() { return localStorage.getItem('is_admin') === 'true'; },
    setAdmin(status) { localStorage.setItem('is_admin', status); },
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
    isWatchLater(id) { return this.get('yt_watchlater').some(x => x.id === id); },
    getMyPlaylists() { const d = localStorage.getItem('yt_my_playlists'); return d ? JSON.parse(d) : {}; },
    setMyPlaylists(data) { localStorage.setItem('yt_my_playlists', JSON.stringify(data)); },
    createPlaylist(name) {
        let dict = this.getMyPlaylists();
        if (dict[name]) return alert("既に同じ名前のリストがあります");
        dict[name] = [];
        this.setMyPlaylists(dict);
    },
    deletePlaylist(name) {
        let dict = this.getMyPlaylists();
        delete dict[name];
        this.setMyPlaylists(dict);
    },
    addToPlaylist(name, video) {
        let dict = this.getMyPlaylists();
        if (!dict[name]) return;
        if (dict[name].some(v => v.id === video.id)) return alert("既に入っています");
        dict[name].push(video);
        this.setMyPlaylists(dict);
        alert(`「${name}」に追加しました！`);
    },
    removeFromPlaylist(name, videoId) {
        let dict = this.getMyPlaylists();
        if (!dict[name]) return;
        dict[name] = dict[name].filter(v => v.id !== videoId);
        this.setMyPlaylists(dict);
    }
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
    activePlaylistName: null,
    videoStats: {},

    init() {
        const input = document.getElementById('search-input');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.search(); input.blur(); } });
        document.getElementById('search-btn').onclick = () => this.search();
        
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            if (!document.getElementById('nav-watch-later')) {
                const historyNav = document.querySelector('.sidebar .nav-item[onclick="Actions.showHistory()"]');
                if (historyNav) historyNav.insertAdjacentHTML('beforebegin', '<div id="nav-watch-later" class="nav-item" onclick="Actions.showWatchLater()">📌<span>後で見る</span></div>');
            }
            if (!document.getElementById('nav-playlist')) {
                const wlNav = document.getElementById('nav-watch-later');
                if (wlNav) wlNav.insertAdjacentHTML('afterend', '<div id="nav-playlist" class="nav-item" onclick="Actions.showMyPlaylists()" style="color:#3ea6ff;">📂<span>プレイリスト</span></div>');
            }
            if (!document.getElementById('nav-ai-recommend')) {
                const homeNav = document.querySelector('.sidebar .nav-item[onclick="Actions.goHome()"]');
                if (homeNav) homeNav.insertAdjacentHTML('afterend', '<div id="nav-ai-recommend" class="nav-item" onclick="Actions.showAIRecommendations()">🤖<span>AIおすすめ</span></div>');
            }
            if (!document.getElementById('nav-admin-login')) {
                sidebar.insertAdjacentHTML('beforeend', `<hr><div id="nav-admin-login" class="nav-item" onclick="Actions.adminLogin()" style="opacity:0.5; font-size:12px;">🔑<span>${Storage.isAdmin() ? '管理者ログイン済み' : '管理者ログイン'}</span></div>`);
            }
        }
    },

    adminLogin() {
        if (Storage.isAdmin()) return alert("既に管理者としてログインしています。");
        const pass = prompt("管理者パスワードを入力してください:");
        if (pass === "2973") {
            Storage.setAdmin(true);
            alert("管理者として認証されました✅");
            location.reload();
        } else {
            alert("パスワードが違います。");
        }
    },

    async fillStats(items) {
        const ids = items
            .map(i => i.id?.videoId || (typeof i.id === 'string' ? i.id : null))
            .filter(id => id)
            .join(',');
        if (!ids) return;
        const data = await YT.fetchAPI('videos', { id: ids, part: 'statistics' });
        if (data.items) {
            data.items.forEach(v => { this.videoStats[v.id] = v.statistics.viewCount; });
        }
    },

    showMyPlaylists() {
        this.currentView = "my_playlists";
        const dict = Storage.getMyPlaylists();
        const container = document.getElementById('view-container');
        let html = `<div style="padding:20px;"><div style="display:flex; justify-content:space-between; align-items:center;"><h2>📂 マイプレイリスト</h2><button class="btn" onclick="Actions.createNewPlaylistPrompt()" style="background:#3ea6ff; color:#fff;">＋ 新規作成</button></div><div class="grid" style="margin-top:20px;">`;
        Object.keys(dict).forEach(name => {
            const count = dict[name].length;
            const thumb = count > 0 ? dict[name][0].thumb : "";
            html += `<div class="v-card" onclick="Actions.viewPlaylistDetail('${name.replace(/'/g, "\\'")}')"><div class="thumb-container" style="background:#333; display:flex; align-items:center; justify-content:center;">${thumb ? `<img src="${thumb}" class="main-thumb">` : '<span style="font-size:40px;">📂</span>'}<div style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.8); padding:2px 8px; border-radius:4px; font-size:12px;">${count}本</div></div><div class="v-text"><h3>${name}</h3><button class="btn" onclick="event.stopPropagation(); Actions.deletePlaylistConfirm('${name.replace(/'/g, "\\'")}')" style="margin-top:5px; font-size:11px; padding:2px 8px;">削除</button></div></div>`;
        });
        html += `</div></div>`;
        container.innerHTML = html;
    },

    createNewPlaylistPrompt() {
        const name = prompt("プレイリスト名を入力してください:");
        if (name) { Storage.createPlaylist(name); this.showMyPlaylists(); }
    },

    deletePlaylistConfirm(name) {
        if (confirm(`プレイリスト「${name}」を削除しますか？`)) { Storage.deletePlaylist(name); this.showMyPlaylists(); }
    },

    viewPlaylistDetail(name) {
        this.currentView = "playlist_detail";
        this.activePlaylistName = name;
        const dict = Storage.getMyPlaylists();
        const list = dict[name] || [];
        this.currentList = list.map(v => ({ id: v.id, snippet: { title: v.title, thumbnails: { high: { url: v.thumb } }, channelTitle: v.channelTitle } }));
        const container = document.getElementById('view-container');
        container.innerHTML = `
            <div style="padding:20px;">
                <h2>📂 ${name}</h2>
                <button class="btn" onclick="Actions.playFromList(0)" style="margin-bottom:20px; background:#fff; color:#000;">▶ すべて再生</button>
                <div class="grid">
                    ${list.map((v, i) => `
                        <div class="v-card">
                            <div class="thumb-container" onclick="Actions.playFromList(${i})"><img src="${v.thumb}" class="main-thumb"></div>
                            <div class="v-text">
                                <h3>${v.title}</h3>
                                <p>${v.channelTitle}</p>
                                <button class="btn" onclick="Actions.removeFromPlaylistAndRefresh('${name.replace(/'/g, "\\'")}', '${v.id}')" style="font-size:11px; padding:2px 8px;">削除</button>
                            </div>
                        </div>`).join('')}
                </div>
            </div>`;
    },

    removeFromPlaylistAndRefresh(name, id) {
        Storage.removeFromPlaylist(name, id);
        this.viewPlaylistDetail(name);
    },

    async showAIRecommendations() {
        this.currentView = "ai_recommend";
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>🤖 AIが分析中...</h2></div>`;
        const history = Storage.get('yt_history');
        if (history.length < 3) { container.innerHTML = `<div style="padding:20px;"><h2>🤖 あと ${3 - history.length} 件の視聴履歴が必要です。</h2></div>`; return; }
        try {
            const resp = await fetch('/api/get_recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ history: history }) });
            const aiData = await resp.json();
            this.currentParams = { q: aiData.query, part: 'snippet', maxResults: 24, type: 'video' };
            const data = await YT.fetchAPI('search', this.currentParams);
            this.currentList = data.items || [];
            this.nextToken = data.nextPageToken || "";
            await this.fillStats(this.currentList);
            this.renderGrid(`<h2>🤖 AIおすすめ: ${aiData.query}</h2><p style="color:#aaa; margin:-10px 0 20px 0;">${aiData.explanation}</p>`);
        } catch (e) { container.innerHTML = `<div style="padding:20px;"><h2>AI分析エラーが発生しました。</h2></div>`; }
    },

    showStatusNotification(text) {
        const div = document.createElement('div');
        div.style = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:20px; z-index:9999; font-size:14px; pointer-events:none; transition: opacity 0.5s;";
        div.innerText = text; document.body.appendChild(div);
        setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 500); }, 3000);
    },

    async goHome() {
        this.currentView = "home";
        this.activePlaylistName = null;
        this.currentParams = { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 };
        const data = await YT.fetchAPI('videos', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid("<h2>急上昇</h2>");
    },

    async showShorts() {
        this.currentView = "shorts";
        this.activePlaylistName = null;
        this.currentParams = { q: '#Shorts', part: 'snippet', type: 'video', videoDuration: 'short', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid("<h2>ショート</h2>");
    },

    async showLiveHub() {
        this.currentView = "live";
        this.activePlaylistName = null;
        this.currentParams = { q: 'live', part: 'snippet', type: 'video', eventType: 'live', regionCode: 'JP', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid("<h2>🔴 ライブ配信</h2>");
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;

        let finalQ = q;
        const vParams = { part: 'snippet', maxResults: 15, type: 'video' };
        let includePlaylists = true;

        if (this.currentView === "shorts") {
            finalQ = `${q} #shorts`;
            vParams.videoDuration = "short";
            includePlaylists = false;
        } else if (this.currentView === "live") {
            vParams.eventType = "live";
            includePlaylists = false;
        }

        vParams.q = finalQ;
        this.currentParams = vParams;

        const promises = [YT.fetchAPI('search', vParams)];
        if (includePlaylists) {
            promises.push(YT.fetchAPI('search', { q, part: 'snippet', maxResults: 5, type: 'playlist' }));
        }

        const results = await Promise.all(promises);
        const vData = results[0];
        const plData = results[1] || { items: [] };

        const limitedPlaylists = plData.items.slice(0, 5);
        this.currentList = [...limitedPlaylists, ...vData.items];
        this.nextToken = vData.nextPageToken || "";
        this.activePlaylistName = null; 
        await this.fillStats(this.currentList);
        this.renderGrid(`<h2>"${q}" の検索結果</h2>`);
    },

    renderCards(items) {
        return items.map((item, index) => {
            const snip = item.snippet;
            const thumb = YT.getProxiedThumb(item);
            const isPlaylist = !!(item.id?.playlistId || (item.kind === 'youtube#playlist'));
            const isLive = snip.liveBroadcastContent === 'live';
            const vId = item.id?.videoId || (typeof item.id === 'string' ? item.id : null);
            const plId = item.id?.playlistId || (typeof item.id === 'string' ? item.id : "");
            
            const stats = vId ? this.videoStats[vId] : null;
            const metaInfo = isPlaylist ? 
                `<span style="color:#3ea6ff; font-weight:bold;">📋 再生リスト</span>` : 
                `<span>${formatViews(stats)} • ${timeAgo(snip.publishedAt)}</span>`;

            const glowStyle = isLive ? 'box-shadow: 0 0 15px #ff0000; border: 2px solid #ff0000;' : '';

            return `
            <div class="v-card" style="${glowStyle}" onclick="${isPlaylist ? `Actions.showPlaylistView('${plId}', '${snip.title.replace(/'/g,"")}')` : `Actions.playFromList(${index})`}">
                <div class="thumb-container">
                    <img src="${thumb}" class="main-thumb">
                    ${isPlaylist ? '<div style="position:absolute; top:0; right:0; bottom:0; width:40%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; font-size:24px;">☰</div>' : ''}
                    ${isLive ? '<div class="live-badge" style="background:#ff0000;">● LIVE</div>' : ''}
                    <img src="${this.channelIcons[snip.channelId] || ''}" class="ch-icon-img" data-chid="${snip.channelId}">
                </div>
                <div class="v-text">
                    <h3 style="${isLive ? 'color:#ff4e45;' : ''}">${snip.title}</h3>
                    <p>${snip.channelTitle}</p>
                    <p style="font-size:11px; margin-top:2px; color:#aaa;">${metaInfo}</p>
                </div>
            </div>`;
        }).join('');
    },

    renderGrid(headerHtml = "") {
        const container = document.getElementById('view-container');
        if (headerHtml) container.dataset.header = headerHtml;
        const currentHeader = container.dataset.header || "";
        const moreBtn = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0; background:#333; color:#fff;">もっと読み込む</button>` : "";
        container.innerHTML = `<div style="padding: 10px 20px;">${currentHeader}</div><div class="grid">${this.renderCards(this.currentList)}</div>${moreBtn}`;
        const ids = this.currentList.map(i => i.snippet?.channelId).filter(id => id && !this.channelIcons[id]).join(',');
        if (ids) this.fetchMissingIcons(ids);
    },

    async loadMore() {
        if (!this.nextToken) return;
        let endpoint = "search";
        if (this.currentView === 'home' && !this.currentParams.q) endpoint = "videos";
        else if (this.currentView === 'playlist') endpoint = "playlistItems";
        else if (this.currentView === 'channel_playlists') endpoint = "playlists";
        
        const data = await YT.fetchAPI(endpoint, { ...this.currentParams, pageToken: this.nextToken });
        const newItems = data.items || [];
        await this.fillStats(newItems);
        this.currentList = [...this.currentList, ...newItems];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid();
    },

    async showChannel(chId) {
        this.currentView = "channel";
        const chData = await YT.fetchAPI('channels', { id: chId, part: 'snippet,brandingSettings' });
        const ch = chData.items[0];
        const isSubbed = Storage.get('yt_subs').some(x => x.id === chId);
        document.getElementById('view-container').innerHTML = `
            <div class="channel-header">
                <div style="width:100%; height:150px; background:url(${ch.brandingSettings?.image?.bannerExternalUrl || ''}) center/cover #333; border-radius:15px;"></div>
                <div style="display:flex; align-items:center; padding:20px;">
                    <img src="${ch.snippet.thumbnails.medium.url}" style="width:80px; height:80px; border-radius:50%;">
                    <div style="margin-left:20px;"><h1>${ch.snippet.title}</h1><p style="color:#aaa;">${ch.snippet.customUrl}</p></div>
                    <button class="btn ${isSubbed ? 'subbed' : ''}" style="margin-left:auto;" onclick="Actions.handleSub('${chId}', '${ch.snippet.title.replace(/'/g, "\\'")}', true)">${isSubbed ? '登録済み' : '登録'}</button>
                </div>
                <div class="tabs">
                    <div class="tab active" onclick="Actions.loadChannelTab('${chId}', 'videos')">動画</div>
                    <div class="tab" onclick="Actions.loadChannelTab('${chId}', 'playlists')">再生リスト</div>
                </div>
            </div><div id="channel-content-grid" class="grid"></div><div id="more-btn-area"></div>`;
        this.loadChannelTab(chId, 'videos');
    },

    async loadChannelTab(chId, type) {
        const grid = document.getElementById('channel-content-grid');
        grid.innerHTML = "読込中...";
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        
        if (type === 'videos') {
            this.currentView = "channel";
            this.currentParams = { channelId: chId, part: 'snippet', type: 'video', order: 'date', maxResults: 24 };
            const data = await YT.fetchAPI('search', this.currentParams);
            this.currentList = data.items || []; 
            this.nextToken = data.nextPageToken || "";
            await this.fillStats(this.currentList);
            grid.innerHTML = this.renderCards(this.currentList);
        } else if (type === 'playlists') {
            this.currentView = "channel_playlists";
            this.currentParams = { channelId: chId, part: 'snippet', maxResults: 24 };
            const data = await YT.fetchAPI('playlists', this.currentParams);
            this.currentList = data.items || [];
            this.nextToken = data.nextPageToken || "";
            grid.innerHTML = this.renderCards(this.currentList);
        }
        document.getElementById('more-btn-area').innerHTML = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0;">もっと読む</button>` : "";
    },

    async showPlaylistView(plId, title) {
        this.currentView = "playlist";
        this.activePlaylistName = title;
        this.currentParams = { playlistId: plId, part: 'snippet,contentDetails', maxResults: 24 };
        const data = await YT.fetchAPI('playlistItems', this.currentParams);
        this.currentList = data.items || []; 
        this.nextToken = data.nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    async play(video) {
        const vId = video.contentDetails?.videoId || (video.id?.videoId || (typeof video.id === 'string' ? video.id : null));
        const snip = video.snippet;
        const isSubbed = Storage.get('yt_subs').some(x => x.id === snip.channelId);
        const isWatchLater = Storage.isWatchLater(vId);
        const isShorts = this.currentView === "shorts" || snip.title.includes("#Shorts");
        const safeTitle = snip.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeChTitle = snip.channelTitle.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const thumbUrl = `/api/thumb?id=${vId}`;
        window.scrollTo(0, 0);

        if (isShorts) {
            document.getElementById('view-container').innerHTML = `
                <div class="shorts-container">
                    <div class="nav-arrow arrow-prev" onclick="Actions.playRelative(-1)">←</div>
                    <div class="nav-arrow arrow-next" onclick="Actions.playRelative(1)">→</div>
                    <div style="width:360px; height:640px; background:#000; border-radius:15px; overflow:hidden;"><iframe src="${YT.getEmbedUrl(vId, true)}" style="width:100%; height:100%; border:none;"></iframe></div>
                    <div style="width:360px; margin-top:15px;">
                        <h3>${snip.title}</h3>
                        <p onclick="Actions.showChannel('${snip.channelId}')" style="cursor:pointer; color:#aaa;">${snip.channelTitle}</p>
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
                        <div style="padding-top:15px;">
                            <h2 style="margin:0;">${snip.title}</h2>
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:15px; flex-wrap:wrap;">
                                <div style="display:flex; align-items:center; cursor:pointer;" onclick="Actions.showChannel('${snip.channelId}')">
                                    <img src="${this.channelIcons[snip.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                    <span style="margin-left:10px; font-weight:bold;">${snip.channelTitle}</span>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${safeChTitle}', true)">${isSubbed ? '登録済み' : 'チャンネル登録'}</button>
                                    <button class="btn ${isWatchLater ? 'subbed' : ''}" onclick="Actions.handleWatchLater('${vId}', '${safeTitle}', '${safeChTitle}', '${thumbUrl}', '${snip.channelId}')">${isWatchLater ? '保存済み' : '📌 後で'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="related-area"><h3 id="side-title">関連動画</h3><div id="side-content-box"></div></div>
                </div>`;

            const sideBox = document.getElementById('side-content-box');
            if (this.activePlaylistName) {
                document.getElementById('side-title').innerText = `再生中: ${this.activePlaylistName}`;
                this.relatedList = this.currentList;
            } else {
                const rel = await YT.fetchAPI('search', { q: snip.title, type: 'video', part: 'snippet', maxResults: 15 });
                this.relatedList = rel.items || [];
            }
            sideBox.innerHTML = this.relatedList.map((i, idx) => `
                <div class="v-card" style="display:flex; gap:10px; margin-bottom:12px;" onclick="Actions.playFromRelated(${idx})">
                    <img src="${YT.getProxiedThumb(i)}" style="width:120px; aspect-ratio:16/9; object-fit:cover; border-radius:8px;">
                    <div style="font-size:12px;"><b>${i.snippet.title}</b><br>${i.snippet.channelTitle}</div>
                </div>`).join('');
        }
        Storage.addHistory({ id: vId, title: snip.title, thumb: thumbUrl, channelTitle: snip.channelTitle });
    },

    playFromList(index) { this.currentIndex = index; this.play(this.currentList[index]); },
    playFromRelated(index) { 
        if (this.activePlaylistName) this.playFromList(index);
        else if (this.relatedList && this.relatedList[index]) this.play(this.relatedList[index]); 
    },
    playRelative(offset) {
        const newIndex = this.currentIndex + offset;
        if (newIndex >= 0 && newIndex < this.currentList.length) this.playFromList(newIndex);
    },

    async fetchMissingIcons(ids) {
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if (data.items) {
            data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
            document.querySelectorAll('.ch-icon-img').forEach(img => {
                if (this.channelIcons[img.dataset.chid]) img.src = this.channelIcons[img.dataset.chid];
            });
        }
    },

    handleSub(id, name, refresh = false) {
        Storage.toggleSub({ id, name, thumb: this.channelIcons[id] || '' });
        if (refresh) { if (this.currentView === "channel") this.showChannel(id); else this.play(this.currentList[this.currentIndex]); }
    },

    handleWatchLater(id, title, channelTitle, thumb, channelId) {
        Storage.toggleWatchLater({ id, title, channelTitle, thumb, channelId });
        this.play(this.currentList[this.currentIndex]);
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
    },

    showGame() {
        window.scrollTo(0, 0);
        GameModule.renderGameMenu();
    }
};

window.onload = async () => { Actions.init(); await YT.refreshEduKey(); Actions.goHome(); };

/* 各種ゲーム起動用関数 */
function startTetris() { if (typeof initTetris === 'function') initTetris(); }
function startSnake() { if (typeof initSnake === 'function') initSnake(); }
function startReversi() { if (typeof initReversi === 'function') initReversi(); }
function startShogi() { if (typeof initShogi === 'function') initShogi(); }
function startBlockBlast() { if (typeof initBlock === 'function') initBlock(); }
function start2048() { if (typeof init2048 === 'function') init2048(); }
