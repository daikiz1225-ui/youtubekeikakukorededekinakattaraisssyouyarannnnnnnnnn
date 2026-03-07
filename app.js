/* app.js - Final Mode-Specific Fix & Live Glow Update (Search & Pagination Integrated) + Komento Sorting Support */

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
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE","AIzaSyDU4jrOT0o2Jd4zDwZyU5OOBsKt1P3RJNs","AIzaSyB2L_plk45E1wihBUB4VJ516pIfqcBc2Yw","AIzaSyDcYrvxFDKcXNqI65Aihrqk0uK2Ebj7KVo","AIzaSyAmfASO-61oyXFOfzJCR9e3oGbnKenBZb","AIzaSyCU7xnDWAFbXt1ze0_DBaWDKt7NDT1XP7"],
    currentEduKey: "",

    getProxiedThumb(video) {
        if (!video || !video.snippet || !video.snippet.thumbnails) return "";
        let videoId = video.contentDetails?.videoId || (video.id?.videoId || (typeof video.id === 'string' ? video.id : ""));
        if (!videoId || video.id?.playlistId || video.kind === 'youtube#playlist') {
            const thumbUrl = video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url || "";
            const match = thumbUrl.match(/\/vi\/([^\/]+)\//);
            if (match && match[1]) { videoId = match[1]; }
        }
        if (!videoId) return video.snippet.thumbnails.high?.url || "";
        return `/api/thumb?id=${videoId}`;
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

    seek(seconds) {
        const iframe = document.querySelector('.video-wrapper iframe, .shorts-container iframe');
        if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }), '*');
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
        return await SearchHandler.fetch(endpoint, params);
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
            html += `<div class="v-card" onclick="Actions.viewPlaylistDetail('${name.replace(/'/g, "\\\\'")}')"><div class="thumb-container" style="background:#333; display:flex; align-items:center; justify-content:center;">${thumb ? `<img src="${thumb}" class="main-thumb">` : '<span style="font-size:40px;">📂</span>'}<div style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.8); padding:2px 8px; border-radius:4px; font-size:12px;">${count}本</div></div><div class="v-text"><h3>${name}</h3><button class="btn" onclick="event.stopPropagation(); Actions.deletePlaylistConfirm('${name.replace(/'/g, "\\\\'")}')" style="margin-top:5px; font-size:11px; padding:2px 8px;">削除</button></div></div>`;
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
                                <button class="btn" onclick="Actions.removeFromPlaylistAndRefresh('${name.replace(/'/g, "\\\\'")}', '${v.id}')" style="font-size:11px; padding:2px 8px;">削除</button>
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
        const moreBtn = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0; background:#333; color:#fff;">もっと読み込む</button>` : "";
        if (headerHtml) container.dataset.header = headerHtml;
        const currentHeader = container.dataset.header || "";
        container.innerHTML = `<div style="padding: 10px 20px;">${currentHeader}</div><div class="grid">${this.renderCards(this.currentList)}</div>${moreBtn}`;
        const ids = this.currentList.map(i => i.snippet?.channelId).filter(id => id && !this.channelIcons[id]).join(',');
        if (ids) this.fetchMissingIcons(ids);
    },

    async loadMore() {
        if (!this.nextToken) return;
        let endpoint = 'search';
        if (this.currentView === 'home' && !this.currentParams.q) endpoint = 'videos';
        else if (this.currentView === 'playlist') endpoint = 'playlistItems';
        else if (this.currentView === 'channel_playlists') endpoint = 'playlists';
        const data = await YT.fetchAPI(endpoint, { ...this.currentParams, pageToken: this.nextToken });
        const newItems = data.items || [];
        await this.fillStats(newItems);
        this.currentList = [...this.currentList, ...newItems];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid();
    },

    playFromList(index) { this.currentIndex = index; this.play(this.currentList[index]); },
    playFromRelated(index) { 
        if (this.activePlaylistName) this.playFromList(index);
        else if (this.relatedList && this.relatedList[index]) this.play(this.relatedList[index]); 
    },
    playRelative(offset) {
        const newIndex = this.currentIndex + offset;
        if (newIndex >= 0 && newIndex < this.currentList.length) this.playFromList(newIndex);
        else if (newIndex >= this.currentList.length && this.activePlaylistName) this.playFromList(0);
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
        const targetUrl = `https://ja.savefrom.net/1-youtube-video-downloader-175dk.html?url=${encodeURIComponent('https://www.youtube.com/watch?v='+vId)}`;
        window.open(targetUrl, '_blank');
    },

    changeSpeed(rate) {
        const iframe = document.querySelector('.video-wrapper iframe, .shorts-container iframe');
        if (iframe) iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [rate] }), '*');
    },

    handleWatchLater(id, title, channelTitle, thumb, channelId) {
        const proxiedThumb = `/api/thumb?id=${id}`;
        Storage.toggleWatchLater({ id, title, channelTitle, thumb: proxiedThumb, channelId });
        if (this.currentIndex !== -1 && !["subs","watchlater"].includes(this.currentView)) this.play(this.currentList[this.currentIndex]);
        else if (this.currentView === "watchlater") this.showWatchLater();
    },

    // ★修正: コメント取得と表示 (並び替え対応)
    async showComments(vId, order = 'relevance') {
        let panel = document.getElementById('comment-panel');
        
        // パネルが既にあって、同じ動画IDかつ同じ並び順なら閉じる
        if (panel && panel.dataset.vId === vId && panel.dataset.order === order) {
            panel.remove();
            document.querySelector('.watch-layout, .shorts-container').style.marginRight = "0";
            return;
        }

        const layout = document.querySelector('.watch-layout, .shorts-container');
        if (layout) layout.style.marginRight = "400px";

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'comment-panel';
            panel.style = "position:fixed; top:60px; right:0; width:400px; height:calc(100vh - 60px); background:#0f0f0f; border-left:1px solid #333; z-index:100; padding:20px; overflow-y:auto; color:white;";
            document.body.appendChild(panel);
        }

        panel.dataset.vId = vId;
        panel.dataset.order = order;
        
        // UIの描画 (並び替えボタン追加)
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0;">コメント</h3>
                <div style="display:flex; gap:10px;">
                    <button class="btn" style="font-size:11px; padding:4px 8px; ${order === 'relevance' ? 'background:#3ea6ff;' : 'background:#333;'}" onclick="Actions.showComments('${vId}', 'relevance')">いいね順</button>
                    <button class="btn" style="font-size:11px; padding:4px 8px; ${order === 'time' ? 'background:#3ea6ff;' : 'background:#333;'}" onclick="Actions.showComments('${vId}', 'time')">新着順</button>
                </div>
            </div>
            <div id="comment-list">読み込み中...</div>`;

        try {
            // ★APIリクエストに order を追加
            const resp = await fetch(`/api/komento?vId=${vId}&order=${order}&key=${YT.getCurrentKey()}`);
            const data = await resp.json();
            const list = document.getElementById('comment-list');
            if (!data.items || data.items.length === 0) {
                list.innerHTML = "コメントが無効か、存在しません。";
                return;
            }
            list.innerHTML = data.items.map(item => {
                const c = item.snippet.topLevelComment.snippet;
                return `
                <div style="display:flex; gap:10px; margin-bottom:20px; font-size:13px;">
                    <img src="${c.authorProfileImageUrl}" style="width:35px; height:35px; border-radius:50%;">
                    <div>
                        <div style="font-weight:bold;">${c.authorDisplayName} <span style="color:#aaa; font-weight:normal;">${timeAgo(c.publishedAt)}</span></div>
                        <div style="margin-top:5px; white-space:pre-wrap;">${c.textDisplay}</div>
                        <div style="color:#aaa; margin-top:5px;">👍 ${c.likeCount}</div>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            document.getElementById('comment-list').innerHTML = "コメントの取得に失敗しました。";
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
        const thumbUrl = `/api/thumb?id=${vId}`;
        
        const cp = document.getElementById('comment-panel'); if (cp) cp.remove();
        window.scrollTo(0, 0);

        if (isShorts) {
            document.getElementById('view-container').innerHTML = `
                <div class="shorts-container">
                    <div class="nav-arrow arrow-prev" onclick="Actions.playRelative(-1)">←</div>
                    <div class="nav-arrow arrow-next" onclick="Actions.playRelative(1)">→</div>
                    <div style="width:360px; height:640px; background:#000; border-radius:15px; overflow:hidden;"><iframe src="${YT.getEmbedUrl(vId, true)}" style="width:100%; height:100%; border:none;"></iframe></div>
                    <div style="width:360px; margin-top:15px;">
                        <h3>${snip.title}</h3>
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px;">
                            <span onclick="Actions.showChannel('${snip.channelId}')" style="cursor:pointer; color:#aaa;">${snip.channelTitle}</span>
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap: 8px;">
                            <button class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${safeChTitle}', true)">${isSubbed ? '登録済み' : '登録'}</button>
                            <button class="btn ${isWatchLater ? 'subbed' : ''}" onclick="Actions.handleWatchLater('${vId}', '${safeTitle}', '${safeChTitle}', '${thumbUrl}', '${snip.channelId}')">${isWatchLater ? '保存済み' : '📌 後で'}</button>
                            <button class="btn" style="background:#333;" onclick="Actions.showComments('${vId}')">💬</button>
                            <button class="btn-download" onclick="Actions.downloadVideo('${vId}')">📥</button>
                        </div>
                    </div>
                </div>`;
        } else {
            document.getElementById('view-container').innerHTML = `
                <div class="watch-layout">
                    <div class="player-area">
                        <div class="video-wrapper"><iframe src="${YT.getEmbedUrl(vId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe></div>
                        <div style="margin-top:15px; display:flex; gap:10px; align-items:center; background:#1e1e1e; padding:10px 20px; border-radius:10px; flex-wrap:wrap;">
                            <span style="font-size:14px; color:#aaa; font-weight:bold; margin-right:10px;">再生速度:</span>
                            <button class="btn" onclick="Actions.changeSpeed(0.5)">0.5x</button>
                            <button class="btn" style="background:#444;" onclick="Actions.changeSpeed(1.0)">1.0x</button>
                            <button class="btn" onclick="Actions.changeSpeed(1.5)">1.5x</button>
                            <button class="btn" onclick="Actions.changeSpeed(2.0)">2.0x</button>
                        </div>
                        <div style="padding-top:15px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                                <h2 style="margin:0;">${snip.title}</h2>
                                <div style="display:flex; gap:10px;">
                                    <select id="plist-select" class="btn" style="background:#333; color:#fff; border:none;"><option value="">📂 リスト選択</option>${Object.keys(Storage.getMyPlaylists()).map(name => `<option value="${name}">${name}</option>`).join('')}</select>
                                    <button class="btn" onclick="const n=document.getElementById('plist-select').value; if(n) Storage.addToPlaylist(n, {id:'${vId}', title:'${safeTitle}', thumb:'${thumbUrl}', channelTitle:'${safeChTitle}'}); else alert('選択してね');" style="background:#3ea6ff; color:#fff;">追加</button>
                                </div>
                            </div>
                            <p style="color:#aaa; font-size:14px; margin-top:5px;">${formatViews(this.videoStats[vId])} • ${timeAgo(snip.publishedAt)}</p>
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:15px; flex-wrap:wrap; gap:10px;">
                                <div style="display:flex; align-items:center; cursor:pointer;" onclick="Actions.showChannel('${snip.channelId}')">
                                    <img src="${this.channelIcons[snip.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                    <span style="margin-left:10px; font-weight:bold;">${snip.channelTitle}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <button class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${safeChTitle}', true)">${isSubbed ? '登録済み' : 'チャンネル登録'}</button>
                                    <button class="btn ${isWatchLater ? 'subbed' : ''}" onclick="Actions.handleWatchLater('${vId}', '${safeTitle}', '${safeChTitle}', '${thumbUrl}', '${snip.channelId}')">${isWatchLater ? '保存済み' : '📌 後で'}</button>
                                    <button class="btn" style="background:#333;" onclick="Actions.showComments('${vId}')">💬 コメント</button>
                                    <button class="btn-download" onclick="Actions.downloadVideo('${vId}')">📥</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="related-area"><h3 id="side-title" style="margin-top:0;">関連動画</h3><div id="side-content-box"></div></div>
                </div>`;
            const sideBox = document.getElementById('side-content-box');
            if (this.activePlaylistName) {
                document.getElementById('side-title').innerText = `再生中: ${this.activePlaylistName}`;
                this.relatedList = this.currentList;
            } else {
                const qK = snip.title.replace(/[【】「」]/g, ' ').split(' ').filter(w => w.length > 1).slice(0, 3).join(' ');
                const rel = await YT.fetchAPI('search', { q: qK, type: 'video', part: 'snippet', maxResults: 15 });
                this.relatedList = rel.items || [];
                await this.fillStats(this.relatedList);
            }
            sideBox.innerHTML = this.relatedList.map((i, idx) => `
                <div class="v-card" style="display:flex; gap:10px; margin-bottom:12px; ${idx === this.currentIndex && this.activePlaylistName ? 'background:#333; border-left:4px solid #3ea6ff;' : ''}" onclick="Actions.playFromRelated(${idx})">
                    <img src="${YT.getProxiedThumb(i)}" style="width:140px; aspect-ratio:16/9; object-fit:cover; border-radius:8px;">
                    <div style="font-size:12px;"><div style="font-weight:bold; line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;">${i.snippet.title}</div><div style="color:#aaa;">${i.snippet.channelTitle}</div><div style="color:#888;">${formatViews(this.videoStats[i.id?.videoId || i.contentDetails?.videoId])}</div></div>
                </div>`).join('');
        }
        Storage.addHistory({ id: vId, title: snip.title, thumb: thumbUrl, channelTitle: snip.channelTitle });
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
                    <button class="btn ${isSubbed ? 'subbed' : ''}" style="margin-left:auto;" onclick="Actions.handleSub('${chId}', '${ch.snippet.title.replace(/'/g, "\\\\'")}', true)">${isSubbed ? '登録済み' : '登録'}</button>
                </div>
                <div class="tabs"><div class="tab active" onclick="Actions.loadChannelTab('${chId}', 'videos', 'date')">最新</div><div class="tab" onclick="Actions.loadChannelTab('${chId}', 'videos', 'viewCount')">人気</div><div class="tab" onclick="Actions.loadChannelTab('${chId}', 'playlists')">再生リスト</div></div>
            </div><div id="channel-content-grid" class="grid"></div><div id="more-btn-area"></div>`;
        this.loadChannelTab(chId, 'videos', 'date');
    },

    async loadChannelTab(chId, type, order = 'date') {
        const grid = document.getElementById('channel-content-grid');
        grid.innerHTML = "読込中...";
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        if (type === 'videos') {
            this.currentView = "channel";
            this.currentParams = { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 24 };
            const data = await YT.fetchAPI('search', this.currentParams);
            this.currentList = data.items || []; this.nextToken = data.nextPageToken || "";
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
        this.currentList = data.items || []; this.nextToken = data.nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    handleSub(id, name, refresh = false) {
        Storage.toggleSub({ id, name, thumb: this.channelIcons[id] || '' });
        if (refresh) { if (this.currentView === "channel") this.showChannel(id); else if (this.currentIndex !== -1 && this.currentView !== "subs") this.play(this.currentList[this.currentIndex]); }
    },

    toggleSubSelect(chId) {
        if (this.selectedSubs.includes(chId)) this.selectedSubs = this.selectedSubs.filter(id => id !== chId);
        else if (this.selectedSubs.length < 5) this.selectedSubs.push(chId);
        else alert("最大5件までです。");
        this.showSubs(); 
    },

    async catchLatestSubVideos() {
        const subs = Storage.get('yt_subs');
        const targetIds = Storage.isAdmin() ? subs.map(s => s.id) : this.selectedSubs;
        if (targetIds.length === 0) return;

        this.currentView = "latest_subs";
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>3日以内の最新動画をキャッチ中...</h2></div>`;

        try {
            // 基準時刻（現在から72時間前）
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

            // 1. 各チャンネルの Uploads プレイリスト ID を取得
            const chData = await YT.fetchAPI('channels', { id: targetIds.join(','), part: 'contentDetails' });
            if (!chData.items) return;

            let allVideos = [];
            const playlistPromises = chData.items.map(ch => {
                const uploadsListId = ch.contentDetails?.relatedPlaylists?.uploads;
                if (uploadsListId) {
                    // 2. プレイリスト内の動画を取得 (API節約のため maxResults: 15)
                    return YT.fetchAPI('playlistItems', { playlistId: uploadsListId, part: 'snippet', maxResults: 15 });
                }
                return null;
            }).filter(p => p !== null);

            const playlistResults = await Promise.all(playlistPromises);
            
            playlistResults.forEach(res => {
                if (res.items) {
                    // 3. 投稿日時が3日以内のものだけを抽出
                    const recentVideos = res.items.filter(item => {
                        const publishDate = new Date(item.snippet.publishedAt);
                        return publishDate >= threeDaysAgo;
                    });
                    allVideos = allVideos.concat(recentVideos);
                }
            });

            // 4. 公開日時が新しい順にソート
            allVideos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));

            this.currentList = allVideos;
            this.nextToken = ""; 
            this.activePlaylistName = null;

            if (allVideos.length === 0) {
                container.innerHTML = `<div style="padding:20px;"><h2>過去3日間に投稿された動画はありません。</h2></div>`;
                return;
            }

            await this.fillStats(this.currentList);
            this.renderGrid(`<h2>最新動画 (3日以内)</h2>`);
        } catch (e) {
            console.error("最新動画取得エラー:", e);
            container.innerHTML = `<div style="padding:20px;"><h2>動画の取得に失敗しました。</h2></div>`;
        }
    },

    showSubs() {
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        const isAdmin = Storage.isAdmin();
        this.selectedSubs = this.selectedSubs.filter(id => subs.some(s => s.id === id));
        const html = subs.map(ch => {
            const isSel = this.selectedSubs.includes(ch.id);
            const borderStyle = isSel ? 'border: 4px solid #0055ff; box-shadow: 0 0 15px rgba(0,85,255,0.8);' : 'border: 4px solid #444;';
            return `<div class="v-card" style="padding:20px; text-align:center;" onclick="Actions.showChannel('${ch.id}')"><div style="display:inline-block; border-radius:50%; padding:4px; ${borderStyle} cursor:pointer;" onclick="event.stopPropagation(); ${isAdmin ? '' : "Actions.toggleSubSelect('"+ch.id+"')" }"><img src="${ch.thumb}" style="width:92px; height:92px; border-radius:50%;"></div><h3 style="margin-top:10px;">${ch.name}</h3></div>`;
        }).join('');
        let btnHtml = "";
        if (isAdmin) {
            btnHtml = `<div style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%); z-index:1000;"><button class="btn" style="background:linear-gradient(45deg, #ff0000, #ff4e45); color:#fff; padding:15px 30px; font-size:16px; border-radius:30px; box-shadow:0 10px 20px rgba(0,0,0,0.5);" onclick="Actions.catchLatestSubVideos()">👑 全ch最新キャッチ</button></div>`;
        } else if (this.selectedSubs.length > 0) {
            btnHtml = `<div style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%); z-index:1000;"><button class="btn" style="background:#0055ff; color:#fff; padding:15px 30px; font-size:16px; border-radius:30px; box-shadow:0 10px 20px rgba(0,0,0,0.5);" onclick="Actions.catchLatestSubVideos()">${this.selectedSubs.length}件をキャッチ</button></div>`;
        }
        document.getElementById('view-container').innerHTML = `<div style="padding:20px; padding-bottom:100px;"><h2>登録済み</h2><div class="grid">${html}</div></div>${btnHtml}`;
    },

    showWatchLater() {
        this.currentView = "watchlater";
        const list = Storage.get('yt_watchlater');
        this.currentList = list.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId, publishedAt: new Date().toISOString() } }));
        this.activePlaylistName = "後で見る";
        this.renderGrid("<h2>📌 後で見る</h2>");
    },

    showHistory() {
        this.currentView = "history";
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, publishedAt: new Date().toISOString() } }));
        this.activePlaylistName = null;
        this.renderGrid("<h2>履歴</h2>");
    },

    showGame() {
        window.scrollTo(0, 0);
        if (typeof M3U8Player !== 'undefined') M3U8Player.stopPlayer();
        GameModule.renderGameMenu();
    }
};

window.onload = async () => { Actions.init(); await YT.refreshEduKey(); Actions.goHome(); };

/* 各種ゲーム起動用関数 */
function startTetris() { if (typeof initTetris === 'function') initTetris(); else Actions.showStatusNotification("エラー"); }
function startSnake() { if (typeof initSnake === 'function') initSnake(); else Actions.showStatusNotification("エラー"); }
function startReversi() { if (typeof initReversi === 'function') initReversi(); else Actions.showStatusNotification("エラー"); }
function startShogi() { if (typeof initShogi === 'function') initShogi(); else Actions.showStatusNotification("エラー"); }
function startBlockBlast() { if (typeof initBlock === 'function') initBlock(); else Actions.showStatusNotification("エラー"); }
function start2048() { if (typeof init2048 === 'function') init2048(); else Actions.showStatusNotification("エラー"); }
