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

    async refreshEduKey() {
        try {
            const response = await fetch('/api/get_key');
            if (!response.ok) throw new Error("APIアクセス失敗");
            const data = await response.json();
            if (data && data.key) {
                this.currentEduKey = data.key;
                console.log("最新キーを自動収集完了✅");
                return true;
            }
        } catch (error) {
            console.error("教育用キー取得エラー:", error);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return await this.refreshEduKey(); 
        }
    },

    getCurrentKey() {
        let index = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[index] || this.keys[0];
    },

    rotateKey() {
        let index = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
        if (index >= this.keys.length) index = 0;
        localStorage.setItem('yt_key_index', index);
        console.log("キーを切り替えました: Index " + index);
        return index;
    },

    // --- ここを search.js (SearchHandler) 連携に書き換え ---
    async fetchAPI(endpoint, params) {
        if (typeof SearchHandler !== 'undefined' && SearchHandler.fetch) {
            // search.js が読み込まれている場合はその fetch を使う
            return await SearchHandler.fetch(endpoint, params);
        } else {
            // 万が一 search.js がない場合のフォールバック
            const currentKey = this.getCurrentKey();
            const queryParams = new URLSearchParams({ ...params, key: currentKey });
            const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
            const response = await fetch(url);
            if (response.status === 403 || response.status === 429) {
                this.rotateKey();
                return await this.fetchAPI(endpoint, params);
            }
            return await response.json();
        }
    },

    getEmbedUrl(id) {
        const key = this.currentEduKey || "";
        const config = { enc: key, hideTitle: true };
        const params = new URLSearchParams({
            autoplay: 1,
            origin: location.origin,
            embed_config: JSON.stringify(config),
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            v: id
        });
        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

const Storage = {
    get(key) {
        const data = localStorage.getItem(key);
        try { return data ? JSON.parse(data) : []; } catch (e) { return []; }
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    isAdmin() {
        return localStorage.getItem('is_admin') === 'true';
    },
    addHistory(video) {
        let history = this.get('yt_history');
        history = [video, ...history.filter(v => v.id !== video.id)].slice(0, 50);
        this.set('yt_history', history);
    },
    toggleSub(channel) {
        let subs = this.get('yt_subs');
        const index = subs.findIndex(s => s.id === channel.id);
        if (index > -1) {
            subs.splice(index, 1);
        } else {
            subs.push({ id: channel.id, name: channel.name, thumb: channel.thumb || '' });
        }
        this.set('yt_subs', subs);
    },
    toggleWatchLater(video) {
        let list = this.get('yt_watchlater');
        const index = list.findIndex(v => v.id === video.id);
        if (index > -1) {
            list.splice(index, 1);
        } else {
            list.unshift(video);
        }
        this.set('yt_watchlater', list);
    },
    isWatchLater(id) {
        return this.get('yt_watchlater').some(v => v.id === id);
    },
    getMyPlaylists() {
        const data = localStorage.getItem('yt_my_playlists');
        return data ? JSON.parse(data) : {};
    },
    setMyPlaylists(data) {
        localStorage.setItem('yt_my_playlists', JSON.stringify(data));
    },
    createPlaylist(name) {
        let dict = this.getMyPlaylists();
        if (dict[name]) return alert("既に同じ名前のリストがあります");
        dict[name] = [];
        this.setMyPlaylists(dict);
    },
    addToPlaylist(name, video) {
        let dict = this.getMyPlaylists();
        if (!dict[name]) return;
        if (dict[name].some(v => v.id === video.id)) return alert("既に入っています");
        dict[name].push(video);
        this.setMyPlaylists(dict);
        alert(`「${name}」に追加しました！`);
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
    videoStats: {},
    activePlaylistName: null,

    init() {
        const input = document.getElementById('search-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.search();
                input.blur();
            }
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
            if (!document.getElementById('nav-admin-login')) {
                sidebar.insertAdjacentHTML('beforeend', `<hr><div id="nav-admin-login" class="nav-item" onclick="Actions.adminLogin()" style="opacity:0.5; font-size:12px;">🔑<span>${Storage.isAdmin() ? '管理者ログイン済み' : '管理者ログイン'}</span></div>`);
            }
        }
    },

    adminLogin() {
        if (Storage.isAdmin()) return alert("既に管理者としてログインしています。");
        const pass = prompt("管理者パスワードを入力してください:");
        if (pass === "2973") {
            localStorage.setItem('is_admin', 'true');
            alert("管理者として認証されました✅");
            location.reload();
        } else {
            alert("パスワードが違います。");
        }
    },

    async fillStats(items) {
        const ids = items.map(item => {
            return item.id?.videoId || (item.contentDetails?.videoId || (typeof item.id === 'string' ? item.id : null));
        }).filter(id => id && !this.videoStats[id]).join(',');
        
        if (!ids) return;
        const data = await YT.fetchAPI('videos', { id: ids, part: 'statistics' });
        if (data.items) {
            data.items.forEach(v => {
                this.videoStats[v.id] = v.statistics.viewCount;
            });
        }
    },

    async showAIRecommendations() {
        this.currentView = "ai_recommend";
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:20px;"><h2>🤖 AIがあなたの好みを分析中...</h2></div>`;
        
        const history = Storage.get('yt_history');
        if (history.length < 3) {
            container.innerHTML = `<div style="padding:20px;"><h2>🤖 AI分析にはあと ${3 - history.length} 件の視聴履歴が必要です。</h2></div>`;
            return;
        }

        try {
            const response = await fetch('/api/get_recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: history })
            });
            const aiData = await response.json();
            this.currentParams = { q: aiData.query, part: 'snippet', maxResults: 24, type: 'video' };
            const data = await YT.fetchAPI('search', this.currentParams);
            this.currentList = data.items || [];
            this.nextToken = data.nextPageToken || "";
            await this.fillStats(this.currentList);
            this.renderGrid(`<h2>🤖 AIおすすめ: ${aiData.query}</h2><p style="color:#aaa; margin:-10px 0 20px 0;">${aiData.explanation}</p>`);
        } catch (error) {
            container.innerHTML = `<div style="padding:20px;"><h2>AI分析エラーが発生しました。</h2></div>`;
        }
    },

    showStatusNotification(text) {
        const div = document.createElement('div');
        div.style = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:20px; z-index:9999; font-size:14px; pointer-events:none; transition: opacity 0.5s;";
        div.innerText = text;
        document.body.appendChild(div);
        setTimeout(() => {
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 500);
        }, 3000);
    },

    async goHome() {
        this.currentView = "home";
        this.currentParams = { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 };
        const data = await YT.fetchAPI('videos', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.activePlaylistName = null;
        await this.fillStats(this.currentList);
        this.renderGrid("<h2>急上昇</h2>");
    },

    async showShorts() {
        this.currentView = "shorts";
        this.currentParams = { q: '#Shorts', part: 'snippet', type: 'video', videoDuration: 'short', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.activePlaylistName = null;
        await this.fillStats(this.currentList);
        this.renderGrid("<h2>ショート</h2>");
    },

    async showLiveHub() {
        this.currentView = "live";
        this.currentParams = { q: 'live', part: 'snippet', type: 'video', eventType: 'live', regionCode: 'JP', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        this.activePlaylistName = null;
        await this.fillStats(this.currentList);
        this.renderGrid("<h2>🔴 ライブ配信</h2>");
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        
        let finalQ = q;
        const videoParams = { part: 'snippet', maxResults: 15, type: 'video' };
        let includePlaylists = true;

        if (this.currentView === "shorts") {
            finalQ = `${q} #shorts`;
            videoParams.videoDuration = "short";
            includePlaylists = false;
        } else if (this.currentView === "live") {
            videoParams.eventType = "live";
            includePlaylists = false;
        }

        videoParams.q = finalQ;
        this.currentParams = videoParams;
        this.activePlaylistName = null;

        const promises = [YT.fetchAPI('search', videoParams)];
        if (includePlaylists) {
            promises.push(YT.fetchAPI('search', { q, part: 'snippet', maxResults: 5, type: 'playlist' }));
        }

        const results = await Promise.all(promises);
        const videos = results[0].items || [];
        const playlists = results[1]?.items || [];

        this.currentList = [...playlists, ...videos];
        this.nextToken = results[0].nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid(`<h2>"${q}" の結果</h2>`);
    },

    renderCards(items) {
        return items.map((item, index) => {
            const snip = item.snippet;
            const vId = item.id?.videoId || (item.contentDetails?.videoId || (typeof item.id === 'string' ? item.id : ""));
            const isPlaylist = !!(item.id?.playlistId || (item.kind === 'youtube#playlist'));
            const isLive = snip.liveBroadcastContent === 'live';
            const stats = this.videoStats[vId];
            
            const thumb = `/api/thumb?id=${vId}`;

            let metaInfo = "";
            if (isPlaylist) {
                metaInfo = `<span style="color:#3ea6ff; font-weight:bold;">📋 再生リスト</span>`;
            } else {
                metaInfo = `<span>${formatViews(stats)} • ${timeAgo(snip.publishedAt)}</span>`;
            }

            return `
            <div class="v-card" onclick="${isPlaylist ? `Actions.showPlaylistView('${item.id.playlistId}', '${snip.title.replace(/'/g, "\\'")}')` : `Actions.playFromList(${index})`}">
                <div class="thumb-container">
                    <img src="${thumb}" class="main-thumb">
                    ${isPlaylist ? '<div style="position:absolute; top:0; right:0; bottom:0; width:40%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; font-size:24px;">☰</div>' : ''}
                    ${isLive ? '<div class="live-badge" style="background:#ff0000; box-shadow: 0 0 10px rgba(255,0,0,0.8);">● LIVE</div>' : ''}
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
        const moreBtn = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0; background:#333; color:#fff; border:none; padding:12px; border-radius:8px; cursor:pointer;">もっと読み込む</button>` : "";
        
        if (headerHtml) container.dataset.header = headerHtml;
        container.innerHTML = `
            <div style="padding: 10px 20px;">${container.dataset.header || ""}</div>
            <div class="grid">${this.renderCards(this.currentList)}</div>
            ${moreBtn}
        `;

        const chIds = this.currentList.map(item => item.snippet?.channelId).filter(id => id && !this.channelIcons[id]).join(',');
        if (chIds) this.fetchMissingIcons(chIds);
    },

    async loadMore() {
        if (!this.nextToken) return;
        let endpoint = (this.currentView === 'home' && !this.currentParams.q) ? 'videos' : (this.currentView === 'playlist' ? 'playlistItems' : 'search');
        const data = await YT.fetchAPI(endpoint, { ...this.currentParams, pageToken: this.nextToken });
        this.currentList = [...this.currentList, ...(data.items || [])];
        this.nextToken = data.nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid();
    },

    playFromList(index) {
        this.currentIndex = index;
        this.play(this.currentList[index]);
    },

    playFromRelated(index) {
        this.play(this.relatedList[index]);
    },

    async fetchMissingIcons(ids) {
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if (data.items) {
            data.items.forEach(ch => {
                this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url;
            });
            document.querySelectorAll('.ch-icon-img').forEach(img => {
                if (this.channelIcons[img.dataset.chid]) img.src = this.channelIcons[img.dataset.chid];
            });
        }
    },

    downloadVideo(vId) {
        window.open(`https://ja.savefrom.net/1-youtube-video-downloader-175dk.html?url=${encodeURIComponent('https://www.youtube.com/watch?v='+vId)}`, '_blank');
    },

    changeSpeed(rate) {
        const iframe = document.querySelector('.video-wrapper iframe');
        if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'setPlaybackRate',
                args: [rate]
            }), '*');
        }
    },

    async showComments(vId, order = 'relevance') {
        let panel = document.getElementById('comment-panel');
        if (panel && panel.dataset.vId === vId) {
            panel.remove();
            document.querySelector('.watch-layout').style.marginRight = "0";
            return;
        }

        const layout = document.querySelector('.watch-layout');
        if (layout) layout.style.marginRight = "400px";

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'comment-panel';
            panel.style = "position:fixed; top:60px; right:0; width:400px; height:calc(100vh - 60px); background:#0f0f0f; border-left:1px solid #333; z-index:100; padding:20px; overflow-y:auto; color:white; scrollbar-width: thin;";
            document.body.appendChild(panel);
        }
        
        panel.dataset.vId = vId;
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3>コメント</h3>
                <select id="comment-sort" onchange="Actions.showComments('${vId}', this.value)" style="background:#333; color:white; border:none; padding:5px; border-radius:4px;">
                    <option value="relevance" ${order==='relevance'?'selected':''}>評価順</option>
                    <option value="time" ${order==='time'?'selected':''}>新しい順</option>
                </select>
            </div>
            <div id="comment-list">読み込み中...</div>
        `;

        try {
            const currentKey = YT.getCurrentKey();
            const response = await fetch(`/api/komento?vId=${vId}&order=${order}&key=${currentKey}`);
            const data = await response.json();
            if (!data.items) throw new Error();
            
            document.getElementById('comment-list').innerHTML = data.items.map(item => {
                const c = item.snippet.topLevelComment.snippet;
                return `
                <div style="display:flex; gap:12px; margin-bottom:24px; font-size:13px; line-height:1.4;">
                    <img src="${c.authorProfileImageUrl}" style="width:36px; height:36px; border-radius:50%; flex-shrink:0;">
                    <div>
                        <div style="font-weight:bold; color:#aaa; margin-bottom:4px;">${c.authorDisplayName} <span style="font-weight:normal; font-size:11px; margin-left:8px;">${timeAgo(c.publishedAt)}</span></div>
                        <div style="word-break: break-all;">${c.textDisplay}</div>
                        <div style="margin-top:8px; display:flex; align-items:center; gap:15px; color:#aaa; font-size:11px;">
                            <span>👍 ${c.likeCount || 0}</span>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            document.getElementById('comment-list').innerHTML = "コメントを読み込めませんでした（無効化されている可能性があります）";
        }
    },

    async play(video) {
        const vId = video.id?.videoId || (video.contentDetails?.videoId || (typeof video.id === 'string' ? video.id : null));
        const snip = video.snippet;
        const isWatchLater = Storage.isWatchLater(vId);

        window.scrollTo(0, 0);
        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="video-wrapper"><iframe src="${YT.getEmbedUrl(vId)}" allowfullscreen allow="autoplay"></iframe></div>
                    <div style="margin-top:15px; display:flex; gap:10px; background:#1e1e1e; padding:10px; border-radius:10px;">
                        <button class="btn" onclick="Actions.changeSpeed(1.0)">1.0x</button>
                        <button class="btn" onclick="Actions.changeSpeed(1.5)">1.5x</button>
                        <button class="btn" onclick="Actions.changeSpeed(2.0)">2.0x</button>
                        <button class="btn" onclick="Actions.changeSpeed(0.5)">0.5x</button>
                    </div>
                    <div style="padding-top:15px;">
                        <h2 style="font-size:20px; line-height:1.4;">${snip.title}</h2>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; flex-wrap:wrap; gap:10px;">
                            <div style="display:flex; align-items:center;">
                                <img src="${this.channelIcons[snip.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                <div style="margin-left:12px;">
                                    <div style="font-weight:bold;">${snip.channelTitle}</div>
                                </div>
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button class="btn ${isWatchLater ? 'active' : ''}" onclick="Actions.handleWatchLater('${vId}', '${snip.title.replace(/'/g, "\\'")}', '${snip.channelTitle.replace(/'/g, "\\'")}', this)">
                                    ${isWatchLater ? '✅ 保存済み' : '📌 後で見る'}
                                </button>
                                <button class="btn" onclick="Actions.handleSub('${snip.channelId}', '${snip.channelTitle.replace(/'/g, "\\'")}')">登録</button>
                                <button class="btn" onclick="Actions.showComments('${vId}')">💬 コメント</button>
                                <button class="btn-download" onclick="Actions.downloadVideo('${vId}')" title="外部サイトでダウンロード">📥</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="related-area">
                    <h3 style="margin-bottom:15px; font-size:16px;">関連動画</h3>
                    <div id="side-content-box"></div>
                </div>
            </div>`;
        
        Storage.addHistory({ id: vId, title: snip.title, thumb: `/api/thumb?id=${vId}`, channelTitle: snip.channelTitle });
        const related = await YT.fetchAPI('search', { q: snip.title.slice(0, 15), type: 'video', part: 'snippet', maxResults: 15 });
        this.relatedList = related.items || [];
        document.getElementById('side-content-box').innerHTML = this.relatedList.map((item, idx) => `
            <div class="v-card" style="display:flex; gap:10px; margin-bottom:12px; cursor:pointer;" onclick="Actions.playFromRelated(${idx})">
                <img src="/api/thumb?id=${item.id.videoId}" style="width:140px; aspect-ratio:16/9; object-fit:cover; border-radius:8px; flex-shrink:0;">
                <div style="font-size:12px;">
                    <div style="font-weight:bold; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${item.snippet.title}</div>
                    <div style="color:#aaa; margin-top:4px;">${item.snippet.channelTitle}</div>
                </div>
            </div>`).join('');
    },

    handleWatchLater(id, title, channel, btn) {
        Storage.toggleWatchLater({ id, title, thumb: `/api/thumb?id=${id}`, channelTitle: channel });
        const active = Storage.isWatchLater(id);
        btn.classList.toggle('active', active);
        btn.innerText = active ? '✅ 保存済み' : '📌 後で見る';
    },

    async showPlaylistView(plId, title) {
        this.currentView = "playlist";
        this.currentParams = { playlistId: plId, part: 'snippet,contentDetails', maxResults: 24 };
        const data = await YT.fetchAPI('playlistItems', this.currentParams);
        this.currentList = data.items || [];
        this.activePlaylistName = title;
        await this.fillStats(this.currentList);
        this.renderGrid(`<h2>再生リスト: ${title}</h2>`);
    },

    handleSub(id, name) {
        Storage.toggleSub({ id, name, thumb: this.channelIcons[id] || '' });
        alert(`${name} を登録/解除しました`);
    },

    showWatchLater() {
        this.currentView = \"watchlater\";
        const list = Storage.get('yt_watchlater');
        this.currentList = list.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId } }));
        this.activePlaylistName = \"後で見る\";
        this.renderGrid(\"<h2>📌 後で見る</h2>\");
    },

    showHistory() {
        this.currentView = \"history\";
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, publishedAt: new Date().toISOString() } }));
        this.activePlaylistName = null;
        this.renderGrid(\"<h2>履歴</h2>\");
    },

    showGame() {
        window.scrollTo(0, 0);
        if (typeof M3U8Player !== 'undefined') M3U8Player.stopPlayer();
        GameModule.renderGameMenu();
    }
};

window.onload = async () => { Actions.init(); await YT.refreshEduKey(); Actions.goHome(); };

/* 各種ゲーム起動用関数 */
function startTetris() { if (typeof initTetris === 'function') initTetris(); else Actions.showStatusNotification(\"エラー\"); }
function startSnake() { if (typeof initSnake === 'function') initSnake(); else Actions.showStatusNotification(\"エラー\"); }
function startReversi() { if (typeof initReversi === 'function') initReversi(); else Actions.showStatusNotification(\"エラー\"); }
function startShogi() { if (typeof initShogi === 'function') initShogi(); else Actions.showStatusNotification(\"エラー\"); }
function startBlockBlast() { if (typeof initBlock === 'function') initBlock(); else Actions.showStatusNotification(\"エラー\"); }
function start2048() { if (typeof init2048 === 'function') init2048(); else Actions.showStatusNotification(\"エラー\"); }
function startTowerDefense() { if (typeof initTowerDefense === 'function') initTowerDefense(); else Actions.showStatusNotification(\"エラー\"); }
function startAirHockey() { if (typeof initAirHockey === 'function') initAirHockey(); else Actions.showStatusNotification(\"エラー\"); }
