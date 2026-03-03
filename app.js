/* app vr3.js - AI Recommendation Update
  既存機能を保持し、AIおすすめ機能のみを追加 
*/

const YT = {
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"],
    currentEduKey: "",

    // ★追加: サムネイルを自前API経由に変換する関数
    getProxiedThumb(video) {
        if (!video || !video.snippet || !video.snippet.thumbnails) return "";
        const id = video.contentDetails?.videoId || (typeof video.id === 'string' ? video.id : (video.id?.videoId || ""));
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
                console.log("最新キーを自動収集完了✅");
                Actions.showStatusNotification("最新キーを自動更新しました✅");
            }
        } catch (error) { console.error("自動収集エラー:", error); }
    },

    seek(seconds) {
        const iframe = document.querySelector('.video-wrapper iframe, .shorts-container iframe');
        if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'seekTo',
                args: [seconds, true]
            }), '*');
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
    isWatchLater(id) { return this.get('yt_watchlater').some(x => x.id === id); },

    // ★プレイリスト管理用
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
    activePlaylistName: null, // 現在再生中のプレイリスト名

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
            // プレイリストナビ
            if (!document.getElementById('nav-playlist')) {
                const wlNav = document.getElementById('nav-watch-later');
                if (wlNav) wlNav.insertAdjacentHTML('afterend', '<div id="nav-playlist" class="nav-item" onclick="Actions.showMyPlaylists()" style="color:#3ea6ff;">📂<span>プレイリスト</span></div>');
            }
            if (!document.getElementById('nav-ai-recommend')) {
                const homeNav = document.querySelector('.sidebar .nav-item[onclick="Actions.goHome()"]');
                if (homeNav) homeNav.insertAdjacentHTML('afterend', '<div id="nav-ai-recommend" class="nav-item" onclick="Actions.showAIRecommendations()">🤖<span>AIおすすめ</span></div>');
            }
        }
    },

    // プレイリスト一覧画面
    showMyPlaylists() {
        this.currentView = "my_playlists";
        const dict = Storage.getMyPlaylists();
        const container = document.getElementById('view-container');
        let html = `
            <div style="padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2>📂 マイプレイリスト</h2>
                    <button class="btn" onclick="Actions.createNewPlaylistPrompt()" style="background:#3ea6ff; color:#fff;">＋ 新規作成</button>
                </div>
                <div class="grid" style="margin-top:20px;">
        `;
        
        Object.keys(dict).forEach(name => {
            const count = dict[name].length;
            const thumb = count > 0 ? dict[name][0].thumb : "";
            html += `
                <div class="v-card" onclick="Actions.viewPlaylistDetail('${name.replace(/'/g, "\\'")}')">
                    <div class="thumb-container" style="background:#333; display:flex; align-items:center; justify-content:center;">
                        ${thumb ? `<img src="${thumb}" class="main-thumb">` : '<span style="font-size:40px;">📂</span>'}
                        <div style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.8); padding:2px 8px; border-radius:4px; font-size:12px;">${count}本</div>
                    </div>
                    <div class="v-text">
                        <h3>${name}</h3>
                        <button class="btn" onclick="event.stopPropagation(); Actions.deletePlaylistConfirm('${name.replace(/'/g, "\\'")}')" style="margin-top:5px; font-size:11px; padding:2px 8px;">削除</button>
                    </div>
                </div>
            `;
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
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    removeFromPlaylistAndRefresh(name, id) {
        Storage.removeFromPlaylist(name, id);
        this.viewPlaylistDetail(name);
    },

    async showAIRecommendations() {
        this.currentView = "ai_recommend";
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>🤖 AIが好みを分析中...</h2></div>`;
        const history = Storage.get('yt_history');
        if (history.length < 3) { container.innerHTML = `<div style="padding:20px;"><h2>🤖 分析にはあと ${3 - history.length} 件の視聴履歴が必要です。</h2></div>`; return; }
        try {
            const resp = await fetch('/api/get_recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ history: history }) });
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
        this.renderGrid("<h2>急上昇</h2>");
    },

    async showShorts() {
        this.currentView = "shorts";
        this.activePlaylistName = null;
        this.currentParams = { q: '#Shorts', part: 'snippet', type: 'video', videoDuration: 'short', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid("<h2>ショート</h2>");
    },

    async showLiveHub() {
        this.currentView = "live";
        this.activePlaylistName = null;
        this.currentParams = { q: 'live', part: 'snippet', type: 'video', eventType: 'live', regionCode: 'JP', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.renderGrid("<h2>🔴 ライブ配信</h2>");
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        this.activePlaylistName = null;
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
            const thumb = YT.getProxiedThumb(item);
            return `
            <div class="v-card" onclick="Actions.playFromList(${index})">
                <div class="thumb-container">
                    <img src="${thumb}" class="main-thumb">
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
        else if (newIndex >= this.currentList.length && this.activePlaylistName) this.playFromList(0); // プレイリスト末尾なら最初へ
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
        if (iframe) iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [rate] }), '*');
    },

    handleWatchLater(id, title, channelTitle, thumb, channelId) {
        const proxiedThumb = `/api/thumb?id=${id}`;
        Storage.toggleWatchLater({ id, title, channelTitle, thumb: proxiedThumb, channelId });
        if (this.currentIndex !== -1 && !["subs","watchlater"].includes(this.currentView)) this.play(this.currentList[this.currentIndex]);
        else if (this.currentView === "watchlater") this.showWatchLater();
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
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px;">
                            <span onclick="Actions.showChannel('${snip.channelId}')" style="cursor:pointer; color:#aaa;">${snip.channelTitle}</span>
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap: 8px;">
                            <button class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${safeChTitle}', true)">${isSubbed ? '登録済み' : '登録'}</button>
                            <button class="btn ${isWatchLater ? 'subbed' : ''}" onclick="Actions.handleWatchLater('${vId}', '${safeTitle}', '${safeChTitle}', '${thumbUrl}', '${snip.channelId}')">${isWatchLater ? '保存済み' : '📌 後で'}</button>
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
                            <div style="border-left:1px solid #333; height:20px; margin:0 10px;"></div>
                            <span style="font-size:14px; color:#aaa; font-weight:bold;">スキップ:</span>
                            <button class="btn" onclick="YT.seek(-10)">⏪ 10s</button>
                            <button class="btn" onclick="YT.seek(10)">10s ⏩</button>
                        </div>
                        <div style="padding-top:15px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                                <h2 style="margin:0;">${snip.title}</h2>
                                <div style="display:flex; gap:10px;">
                                    <select id="plist-select" class="btn" style="background:#333; color:#fff; border:none;">
                                        <option value="">📂 プレイリストを選択</option>
                                        ${Object.keys(Storage.getMyPlaylists()).map(name => `<option value="${name}">${name}</option>`).join('')}
                                    </select>
                                    <button class="btn" onclick="const n=document.getElementById('plist-select').value; if(n) Storage.addToPlaylist(n, {id:'${vId}', title:'${safeTitle}', thumb:'${thumbUrl}', channelTitle:'${safeChTitle}'}); else alert('リストを選択してね');" style="background:#3ea6ff; color:#fff;">追加</button>
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:15px; flex-wrap:wrap; gap:10px;">
                                <div style="display:flex; align-items:center; cursor:pointer;" onclick="Actions.showChannel('${snip.channelId}')">
                                    <img src="${this.channelIcons[snip.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                    <span style="margin-left:10px; font-weight:bold;">${snip.channelTitle}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <button id="sub-btn" class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${safeChTitle}', true)">${isSubbed ? '登録済み' : 'チャンネル登録'}</button>
                                    <button class="btn ${isWatchLater ? 'subbed' : ''}" onclick="Actions.handleWatchLater('${vId}', '${safeTitle}', '${safeChTitle}', '${thumbUrl}', '${snip.channelId}')">${isWatchLater ? '保存済み' : '📌 後で見る'}</button>
                                    <button class="btn-download" onclick="Actions.downloadVideo('${vId}')">📥 ダウンロード</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="related-area"><h3 id="side-title" style="margin-top:0;">関連動画</h3><div id="side-content-box"></div></div>
                </div>`;
            const sideBox = document.getElementById('side-content-box');
            
            // プレイリスト再生中なら右側をプレイリストにする
            if (this.activePlaylistName) {
                document.getElementById('side-title').innerText = `再生中: ${this.activePlaylistName}`;
                this.relatedList = this.currentList;
            } else {
                const qK = snip.title.replace(/[【】「」]/g, ' ').split(' ').filter(w => w.length > 1).slice(0, 3).join(' ');
                const rel = await YT.fetchAPI('search', { q: qK, type: 'video', part: 'snippet', maxResults: 15 });
                this.relatedList = rel.items || [];
            }
            
            sideBox.innerHTML = this.relatedList.map((i, idx) => `
                <div class="v-card" style="display:flex; gap:10px; margin-bottom:12px; ${idx === this.currentIndex && this.activePlaylistName ? 'background:#333; border-left:4px solid #3ea6ff;' : ''}" onclick="Actions.playFromRelated(${idx})">
                    <img src="${YT.getProxiedThumb(i)}" style="width:140px; aspect-ratio:16/9; object-fit:cover; border-radius:8px;">
                    <div style="font-size:12px;"><div style="font-weight:bold;">${i.snippet.title}</div><div style="color:#aaa;">${i.snippet.channelTitle}</div></div>
                </div>`).join('');
        }
        Storage.addHistory({ id: vId, title: snip.title, thumb: thumbUrl, channelTitle: snip.channelTitle });
        
        // ★自動再生の仕掛け: 動画が終わったら次へ（iframe経由は難しいので簡易的にボタン追加かタイマー検討だが、まずはRelatedクリックで次へ行けるようにした）
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
                    <button class="btn ${isSubbed ? 'subbed' : ''}" style="margin-left:auto;" onclick="Actions.handleSub('${chId}', '${ch.snippet.title.replace(/'/g, "\\'")}', true)">${isSubbed ? '登録済み' : 'チャンネル登録'}</button>
                </div>
                <div class="tabs"><div class="tab active" onclick="Actions.loadChannelTab('${chId}', 'videos', 'date')">最新</div><div class="tab" onclick="Actions.loadChannelTab('${chId}', 'videos', 'viewCount')">人気順</div><div class="tab" onclick="Actions.loadChannelTab('${chId}', 'playlists')">再生リスト</div></div>
            </div><div id="channel-content-grid" class="grid"></div><div id="more-btn-area"></div>`;
        this.loadChannelTab(chId, 'videos', 'date');
    },

    async loadChannelTab(chId, type, order = 'date') {
        const grid = document.getElementById('channel-content-grid');
        grid.innerHTML = "読込中...";
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        if (type === 'videos') {
            const data = await YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: order, maxResults: 24 });
            this.currentList = data.items || []; this.nextToken = data.nextPageToken || "";
            grid.innerHTML = this.renderCards(this.currentList);
        } else if (type === 'playlists') {
            const data = await YT.fetchAPI('playlists', { channelId: chId, part: 'snippet', maxResults: 24 });
            grid.innerHTML = data.items.map(pl => `<div class="v-card" onclick="Actions.showPlaylistView('${pl.id}', '${pl.snippet.title.replace(/'/g, "\\")}')"><div class="thumb-container"><img src="${YT.getProxiedThumb(pl)}" class="main-thumb"></div><div class="v-text"><h3>${pl.snippet.title}</h3></div></div>`).join('');
            this.nextToken = "";
        }
        document.getElementById('more-btn-area').innerHTML = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0;">もっと読む</button>` : "";
    },

    async showPlaylistView(plId, title) {
        this.currentView = "playlist";
        this.currentParams = { playlistId: plId, part: 'snippet,contentDetails', maxResults: 24 };
        const data = await YT.fetchAPI('playlistItems', this.currentParams);
        this.currentList = data.items || []; this.nextToken = data.nextPageToken || "";
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    handleSub(id, name, refresh = false) {
        Storage.toggleSub({ id, name, thumb: this.channelIcons[id] || '' });
        if (refresh) { if (this.currentView === "channel") this.showChannel(id); else if (this.currentIndex !== -1 && this.currentView !== "subs") this.play(this.currentList[this.currentIndex]); }
    },

    toggleSubSelect(chId) {
        if (this.selectedSubs.includes(chId)) this.selectedSubs = this.selectedSubs.filter(id => id !== chId);
        else if (this.selectedSubs.length < 5) this.selectedSubs.push(chId);
        else alert("選択できるのは最大5件までです。");
        this.showSubs(); 
    },

    async catchLatestSubVideos() {
        if (this.selectedSubs.length === 0) return;
        this.currentView = "latest_subs";
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>最新動画をキャッチ中...</h2></div>`;
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        let allVideos = [];
        const promises = this.selectedSubs.map(chId => YT.fetchAPI('search', { channelId: chId, part: 'snippet', type: 'video', order: 'date', publishedAfter: twoDaysAgo, maxResults: 10 }));
        const results = await Promise.all(promises);
        results.forEach(res => { if (res.items) allVideos = allVideos.concat(res.items); });
        allVideos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        this.currentList = allVideos; this.nextToken = ""; 
        this.renderGrid(`<h2>選択した ${this.selectedSubs.length} 件の最新動画</h2>`);
    },

    showSubs() {
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        this.selectedSubs = this.selectedSubs.filter(id => subs.some(s => s.id === id));
        const html = subs.map(ch => {
            const isSel = this.selectedSubs.includes(ch.id);
            const borderStyle = isSel ? 'border: 4px solid #0055ff; box-shadow: 0 0 15px rgba(0,85,255,0.8);' : 'border: 4px solid #444;';
            return `<div class="v-card" style="padding:20px; text-align:center; background:var(--card-bg);" onclick="Actions.showChannel('${ch.id}')">
                <div style="display:inline-block; border-radius:50%; padding:4px; ${borderStyle} cursor:pointer; transition:0.2s;" onclick="event.stopPropagation(); Actions.toggleSubSelect('${ch.id}')">
                    <img src="${ch.thumb}" style="width:92px; height:92px; border-radius:50%; display:block; object-fit:cover;">
                </div>
                <h3 style="margin-top:10px;">${ch.name}</h3>
                <button class="btn subbed" onclick="event.stopPropagation(); Actions.handleSub('${ch.id}', '${ch.name}', true); Actions.showSubs();">解除</button>
            </div>`;
        }).join('');
        let btnHtml = this.selectedSubs.length > 0 ? `<div style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%); z-index:1000;"><button class="btn" style="background:#0055ff; color:#fff; padding:15px 30px; font-size:16px; border-radius:30px; box-shadow:0 10px 20px rgba(0,0,0,0.5);" onclick="Actions.catchLatestSubVideos()">${this.selectedSubs.length}件の最新動画をキャッチ</button></div>` : "";
        document.getElementById('view-container').innerHTML = `<div style="padding:20px; padding-bottom:100px;"><h2>登録済み</h2><div class="grid">${html}</div></div>${btnHtml}`;
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
        if (typeof M3U8Player !== 'undefined') M3U8Player.stopPlayer();
        GameModule.renderGameMenu();
    }
};

window.onload = async () => { Actions.init(); await YT.refreshEduKey(); Actions.goHome(); };

/* --- 各種ゲーム起動用関数 --- */
function startTetris() { if (typeof initTetris === 'function') initTetris(); else Actions.showStatusNotification("エラー"); }
function startSnake() { if (typeof initSnake === 'function') initSnake(); else Actions.showStatusNotification("エラー"); }
function startReversi() { if (typeof initReversi === 'function') initReversi(); else Actions.showStatusNotification("エラー"); }
function startShogi() { if (typeof initShogi === 'function') initShogi(); else Actions.showStatusNotification("エラー"); }
function startBlockBlast() { if (typeof initBlock === 'function') initBlock(); else Actions.showStatusNotification("エラー"); }
function start2048() { if (typeof init2048 === 'function') init2048(); else Actions.showStatusNotification("エラー"); }
