/* app.js - URL Routing System Integrated & AI Recommendations Updated (kanrenn.js利用版) */

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

    getVideoId(item) {
        if (!item) return "";
        return item.id?.videoId || item.contentDetails?.videoId || item.contentDetails?.upload?.videoId || item.snippet?.resourceId?.videoId || (typeof item.id === 'string' ? item.id : "");
    },

    getProxiedThumb(video) {
        const vId = this.getVideoId(video);
        if (vId) return `/api/thumb?id=${vId}`;
        return video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url || "";
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
        if (typeof SearchHandler !== 'undefined') {
            return await SearchHandler.fetch(endpoint, params);
        }
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
        
        const resumeTime = Storage.getResumeTime(id);
        if (resumeTime > 0) params.append('start', resumeTime);

        if (isShort) { params.append('loop', '1'); params.append('playlist', id); }
        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

const Storage = {
    get(key) { const data = localStorage.getItem(key); try { return data ? JSON.parse(data) : []; } catch (e) { return []; } },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    isAdmin() { return localStorage.getItem('is_admin') === 'true'; },
    setAdmin(status) { localStorage.setItem('is_admin', status); },

    isIncognito() { return localStorage.getItem('yt_incognito') === 'true'; },
    setIncognito(status) { localStorage.setItem('yt_incognito', status); },

    saveResumeProgress(video, currentTime, duration) {
        if (this.isIncognito()) return; 
        let list = this.get('yt_resume_list');
        if (!Array.isArray(list)) list = [];
        
        const vId = YT.getVideoId(video);
        if (!vId) return;

        if (duration > 0 && (currentTime / duration) >= 0.95) {
            list = list.filter(item => item.id !== vId);
            this.set('yt_resume_list', list);
            return;
        }

        const newItem = {
            id: vId,
            title: video.snippet.title,
            thumb: `/api/thumb?id=${vId}`,
            channelTitle: video.snippet.channelTitle,
            time: Math.floor(currentTime),
            duration: Math.floor(duration),
            timestamp: Date.now()
        };

        list = [newItem, ...list.filter(item => item.id !== vId)].slice(0, 3);
        this.set('yt_resume_list', list);
    },

    getResumeTime(vId) {
        const list = this.get('yt_resume_list');
        const item = list.find(i => i.id === vId);
        return item ? item.time : 0;
    },

    addHistory(v) { 
        if (this.isIncognito()) return; 
        let h = this.get('yt_history'); 
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50); 
        this.set('yt_history', h); 
    },

    deleteHistoryItem(vId) {
        let h = this.get('yt_history');
        h = h.filter(x => x.id !== vId);
        this.set('yt_history', h);
    },

    clearAllHistory() {
        if (confirm("すべての視聴履歴を削除しますか？")) {
            this.set('yt_history', []);
            Actions.showHistory();
        }
    },

    toggleSub(ch) {
        let s = this.get('yt_subs');
        const i = s.findIndex(x => x.id === ch.id);
        if (i > -1) s.splice(i, 1); else s.push({ id: ch.id, name: ch.name, thumb: ch.thumb || '' });
        this.set('yt_subs', s);
        Actions.loadSidebarLatest();
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
    resumeTimer: null,
    playbackMode: localStorage.getItem('yt_playback_mode') || "edu",
    
    // チャンネルページ専用の状態管理
    chState: { type: 'videos', sort: 'date' },

    init() {
        const input = document.getElementById('search-input');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.search(); input.blur(); } });
        document.getElementById('search-btn').onclick = () => this.search();
        
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            if (!document.getElementById('nav-resume')) {
                const homeNav = document.querySelector('.sidebar .nav-item[onclick="Actions.goHome()"]');
                if (homeNav) homeNav.insertAdjacentHTML('afterend', '<div id="nav-resume" class="nav-item" onclick="Actions.showResumeList()" style="color:#ff8c00;">🕒<span>続きから見る</span></div>');
            }
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
            if (!document.getElementById('nav-incognito')) {
                const isInc = Storage.isIncognito();
                const historyNav = document.querySelector('.sidebar .nav-item[onclick="Actions.showHistory()"]');
                if (historyNav) {
                    historyNav.insertAdjacentHTML('afterend', `
                        <div id="nav-incognito" class="nav-item" onclick="Actions.toggleIncognito()" style="color:${isInc ? '#00ff00' : '#aaa'};">
                            👤<span>${isInc ? 'シークレット: ON' : 'シークレット: OFF'}</span>
                        </div>
                    `);
                }
            }
            if (!document.getElementById('nav-admin-login')) {
                sidebar.insertAdjacentHTML('beforeend', `<hr><div id="nav-admin-login" class="nav-item" onclick="Actions.adminLogin()" style="opacity:0.5; font-size:12px;">🔑<span>${Storage.isAdmin() ? '管理者ログイン済み' : '管理者ログイン'}</span></div>`);
            }
        }
    },

    Maps(html, skipScroll = false) {
        const container = document.getElementById('view-container');
        container.innerHTML = html;
        if (!skipScroll) {
            window.scrollTo(0, 0);
        }
    },

    async routeCurrentUrl() {
        const params = new URLSearchParams(window.location.search);
        const vId = params.get('v');
        const searchQ = params.get('search');
        const mode = params.get('mode');
        const list = params.get('list');
        const channel = params.get('channel');
        const ytPlaylist = params.get('playlist'); 

        if (vId) {
            try {
                const data = await YT.fetchAPI('videos', { id: vId, part: 'snippet' });
                if (data && data.items && data.items.length > 0) {
                    Actions.currentList = data.items;
                    Actions.currentIndex = 0;
                    await Actions.fillStats(data.items);
                    Actions.play(data.items[0], true); 
                } else { Actions.goHome(true); }
            } catch(e) { Actions.goHome(true); }
        } else if (searchQ) {
            document.getElementById('search-input').value = searchQ;
            Actions.search(true);
        } else if (list) {
            Actions.viewPlaylistDetail(list, true);
        } else if (ytPlaylist) {
            const plTitle = params.get('title') || '再生リスト';
            Actions.showPlaylistView(ytPlaylist, plTitle, true);
        } else if (channel) {
            Actions.showChannel(channel, true);
        } else if (mode) {
            switch(mode) {
                case 'shorts': Actions.showShorts(true); break;
                case 'live': Actions.showLiveHub(true); break;
                case 'subs': Actions.showSubs(true); break;
                case 'history': Actions.showHistory(true); break;
                case 'resume': Actions.showResumeList(true); break;
                case 'playlists': Actions.showMyPlaylists(true); break;
                case 'ai_recommend': Actions.showAIRecommendations(true); break;
                case 'watchlater': Actions.showWatchLater(true); break;
                case 'game': Actions.showGame(true); break;
                default: Actions.goHome(true);
            }
        } else {
            Actions.goHome(true);
        }
    },

    loadSidebarLatest() {},

    async playFromSidebar(vId) {
        const data = await YT.fetchAPI('videos', { id: vId, part: 'snippet' });
        if (data.items && data.items[0]) this.play(data.items[0]);
    },

    showResumeList(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?mode=resume');
        this.currentView = "resume";
        const list = Storage.get('yt_resume_list');
        
        if (list.length === 0) {
            this.Maps(`<div style="padding:40px; text-align:center;"><h2>🕒 続きから見る動画はありません</h2><p style="color:#aaa;">視聴途中の動画がここに3つまで表示されます。</p></div>`);
            return;
        }

        this.currentList = list.map(x => ({ 
            id: x.id, 
            snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, publishedAt: new Date(x.timestamp).toISOString() } 
        }));

        let html = `<div style="padding:20px;"><h2>🕒 続きから見る</h2><div class="grid">`;
        list.forEach((v, i) => {
            const progress = (v.time / v.duration) * 100;
            html += `
            <div class="v-card" onclick="Actions.playFromList(${i})">
                <div class="thumb-container">
                    <img src="${v.thumb}" class="main-thumb">
                    <div style="position:absolute; bottom:0; left:0; height:4px; width:${progress}%; background:#ff0000;"></div>
                    <div style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.8); padding:2px 5px; border-radius:4px; font-size:10px;">残り ${Math.floor((v.duration - v.time)/60)}分</div>
                </div>
                <div class="v-text">
                    <h3>${v.title}</h3>
                    <p>${v.channelTitle}</p>
                    <p style="font-size:11px; color:#ff8c00;">再生再開位置: ${Math.floor(v.time/60)}分${v.time%60}秒</p>
                </div>
            </div>`;
        });
        html += `</div></div>`;
        this.Maps(html);
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
        const ids = items.map(i => YT.getVideoId(i)).filter(id => id).join(',');
        if (!ids) return;
        const data = await YT.fetchAPI('videos', { id: ids, part: 'statistics' });
        if (data.items) {
            data.items.forEach(v => { this.videoStats[v.id] = v.statistics.viewCount; });
        }
    },

    showMyPlaylists(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?mode=playlists');
        this.currentView = "my_playlists";
        const dict = Storage.getMyPlaylists();
        let html = `<div style="padding:20px;"><div style="display:flex; justify-content:space-between; align-items:center;"><h2>📂 マイプレイリスト</h2><button class="btn" onclick="Actions.createNewPlaylistPrompt()" style="background:#3ea6ff; color:#fff;">＋ 新規作成</button></div><div class="grid" style="margin-top:20px;">`;
        Object.keys(dict).forEach(name => {
            const count = dict[name].length;
            const thumb = count > 0 ? dict[name][0].thumb : "";
            html += `<div class="v-card" onclick="Actions.viewPlaylistDetail('${name.replace(/'/g, "\\\\'")}')"><div class="thumb-container" style="background:#333; display:flex; align-items:center; justify-content:center;">${thumb ? `<img src="${thumb}" class="main-thumb">` : '<span style="font-size:40px;">📂</span>'}<div style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.8); padding:2px 8px; border-radius:4px; font-size:12px;">${count}本</div></div><div class="v-text"><h3>${name}</h3><button class="btn" onclick="event.stopPropagation(); Actions.deletePlaylistConfirm('${name.replace(/'/g, "\\\\'")}')" style="margin-top:5px; font-size:11px; padding:2px 8px;">削除</button></div></div>`;
        });
        html += `</div></div>`;
        this.Maps(html);
    },

    createNewPlaylistPrompt() {
        const name = prompt("プレイリスト名を入力してください:");
        if (name) { Storage.createPlaylist(name); this.showMyPlaylists(); }
    },

    deletePlaylistConfirm(name) {
        if (confirm(`プレイリスト「${name}」を削除しますか？`)) { Storage.deletePlaylist(name); this.showMyPlaylists(); }
    },

    viewPlaylistDetail(name, skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?list=' + encodeURIComponent(name));
        this.currentView = "playlist_detail";
        this.activePlaylistName = name;
        const dict = Storage.getMyPlaylists();
        const list = dict[name] || [];
        this.currentList = list.map(v => ({ id: v.id, snippet: { title: v.title, thumbnails: { high: { url: v.thumb } }, channelTitle: v.channelTitle } }));
        let html = `
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
        this.Maps(html);
    },

    removeFromPlaylistAndRefresh(name, id) {
        Storage.removeFromPlaylist(name, id);
        this.viewPlaylistDetail(name, true); 
    },

    async showAIRecommendations(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?mode=ai_recommend');
        this.currentView = "ai_recommend";
        this.Maps(`<div style="padding:20px;"><h2>🤖 AIが10件の履歴を深掘り中...</h2><p style="color:#aaa; font-size:12px;">各動画の関連TOP2を抽出しています。</p></div>`);
        
        const history = Storage.get('yt_history');
        if (history.length < 1) { 
            this.Maps(`<div style="padding:20px;"><h2>🤖 履歴がまだありません。</h2></div>`); 
            return; 
        }
        
        try {
            const targetItems = history.slice(0, 10);
            const results = await Promise.all(targetItems.map(async (item) => {
                try {
                    const res = await fetch(`/api/ai_recommend/?vId=${item.id}`);
                    const ids = await res.json();
                    if (Array.isArray(ids) && ids.length >= 2) {
                        return ids.slice(0, 2); 
                    }
                    return ids.slice(0, 1); 
                } catch (e) { return []; }
            }));

            let recommendedIds = [...new Set(results.flat())].filter(id => id && !id.includes("Error") && id !== "DEBUG_EMPTY_DATA");

            if (recommendedIds.length === 0) {
                this.Maps(`<div style="padding:20px;"><h2>🤖 関連動画が見つかりませんでした。</h2></div>`);
                return;
            }

            this.currentParams = { id: recommendedIds.slice(0, 20).join(','), part: 'snippet,statistics' };
            const data = await YT.fetchAPI('videos', this.currentParams);
            
            this.currentList = data.items || [];
            this.nextToken = ""; 
            await this.fillStats(this.currentList);
            
            this.renderGrid(`<h2>🤖 AIおすすめ (超濃縮版)</h2><p style="color:#aaa; margin:-10px 0 20px 0; font-size:12px;">直近10件の視聴傾向から上位2件ずつを抽出しました。</p>`);
        } catch (e) { 
            console.error("AI分析エラー:", e);
            this.Maps(`<div style="padding:20px;"><h2>❌ 抽出エラーが発生しました。</h2></div>`); 
        }
    },
    
    showStatusNotification(text) {
        const div = document.createElement('div');
        div.style = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:20px; z-index:9999; font-size:14px; pointer-events:none; transition: opacity 0.5s;";
        div.innerText = text; document.body.appendChild(div);
        setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 500); }, 3000);
    },

    async goHome(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', window.location.pathname);
        this.currentView = "home";
        this.activePlaylistName = null;
        this.currentParams = { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 };
        const data = await YT.fetchAPI('videos', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid("<h2>急上昇</h2>");
    },

    async showShorts(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?mode=shorts');
        this.currentView = "shorts";
        this.activePlaylistName = null;
        this.currentParams = { q: '#Shorts', part: 'snippet', type: 'video', videoDuration: 'short', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid("<h2>ショート</h2>");
    },

    async showLiveHub(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?mode=live');
        this.currentView = "live";
        this.activePlaylistName = null;
        this.currentParams = { q: 'live', part: 'snippet', type: 'video', eventType: 'live', regionCode: 'JP', maxResults: 24 };
        const data = await YT.fetchAPI('search', this.currentParams);
        this.currentList = data.items || [];
        this.nextToken = data.nextPageToken || "";
        await this.fillStats(this.currentList);
        this.renderGrid("<h2>🔴 ライブ配信</h2>");
    },

    async search(skipPush = false) {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        if (!skipPush) window.history.pushState(null, '', '?search=' + encodeURIComponent(q));
        
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
            const vId = YT.getVideoId(item);
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

    renderGrid(headerHtml = "", skipScroll = false) {
        const container = document.getElementById('view-container');
        const moreBtn = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0; background:#333; color:#fff;">もっと読み込む</button>` : "";
        if (headerHtml) container.dataset.header = headerHtml;
        const currentHeader = container.dataset.header || "";
        const finalHtml = `<div style="padding: 10px 20px;">${currentHeader}</div><div class="grid">${this.renderCards(this.currentList)}</div>${moreBtn}`;
        
        this.Maps(finalHtml, skipScroll);

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
        let newItems = data.items || [];
        
        // チャンネルでの横長動画の追加読み込み時もショートを除外
        if (this.currentView === 'channel') {
            newItems = newItems.filter(item => {
                const title = item.snippet?.title?.toLowerCase() || '';
                return !title.includes('#shorts') && !title.includes('shorts');
            });
        }

        await this.fillStats(newItems);
        this.currentList = [...this.currentList, ...newItems];
        this.nextToken = data.nextPageToken || "";
        
        this.renderGrid("", true);
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

    async downloadVideo(vId, title) {
        Actions.showStatusNotification("動画ファイルを準備中...");
        try {
            const response = await fetch(`${window.location.origin}/api/streaming?id=${vId}`);
            if (!response.ok) throw new Error("ストリーミングの取得に失敗しました");
            Actions.showStatusNotification("ダウンロードを開始します...");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const safeFileName = (title || vId).replace(/[\\/:*?"<>|]/g, "_");
            a.download = `${safeFileName}.mp4`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                Actions.showStatusNotification("保存が完了しました✅");
            }, 100);
        } catch (error) {
            console.error("Download error:", error);
            Actions.showStatusNotification("エラー: 直接保存できませんでした");
        }
    },

    changeSpeed(rate) {
        const player = document.getElementById('yt-player');
        if (!player) return;
        if (player.tagName === 'IFRAME') {
            player.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [rate] }), '*');
        } else {
            player.playbackRate = rate;
        }
    },

    handleWatchLater(id, title, channelTitle, thumb, channelId) {
        const proxiedThumb = `/api/thumb?id=${id}`;
        Storage.toggleWatchLater({ id, title, channelTitle, thumb: proxiedThumb, channelId });
        if (this.currentIndex !== -1 && !["subs","watchlater"].includes(this.currentView)) this.play(this.currentList[this.currentIndex], true);
        else if (this.currentView === "watchlater") this.showWatchLater(true);
    },

    async showComments(vId, order = 'relevance') {
        let panel = document.getElementById('comment-panel');
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
            const resp = await fetch(`/api/komento?vId=${vId}&key=${YT.getCurrentKey()}&order=${order}`);
            const data = await resp.json();
            const list = document.getElementById('comment-list');
            if (!data.items || data.items.length === 0) { list.innerHTML = "コメントが無効か、存在しません。"; return; }
            list.innerHTML = data.items.map(item => {
                const c = item.snippet.topLevelComment.snippet;
                return `<div style="display:flex; gap:10px; margin-bottom:20px; font-size:13px;"><img src="${c.authorProfileImageUrl}" style="width:35px; height:35px; border-radius:50%;"><div><div style="font-weight:bold;">${c.authorDisplayName} <span style="color:#aaa; font-weight:normal;">${timeAgo(c.publishedAt)}</span></div><div style="margin-top:5px; white-space:pre-wrap;">${c.textDisplay}</div><div style="color:#aaa; margin-top:5px;">👍 ${c.likeCount}</div></div></div>`;
            }).join('');
        } catch (e) { document.getElementById('comment-list').innerHTML = "コメント取得失敗"; }
    },

    async play(video, skipPush = false) {
        const vId = YT.getVideoId(video);
        if (!skipPush) window.history.pushState(null, '', '?v=' + vId);

        const snip = video.snippet;
        const isSubbed = Storage.get('yt_subs').some(x => x.id === snip.channelId);
        const isWatchLater = Storage.isWatchLater(vId);
        const isShorts = this.currentView === "shorts" || this.currentView === "channel_shorts" || snip.title.includes("#Shorts");
        const safeTitle = snip.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeChTitle = snip.channelTitle.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const thumbUrl = `/api/thumb?id=${vId}`;
        
        const cp = document.getElementById('comment-panel'); if (cp) cp.remove();

        const renderPlayerContent = () => {
            if (this.playbackMode === "streaming") {
                return `<video id="yt-player" src="${window.location.origin}/api/streaming?id=${vId}" controls autoplay playsinline style="width:100%; height:100%; background:#000;" onerror="setTimeout(() => { this.src=this.src; }, 3000); console.log('Retrying streaming source...')"></video>`;
            } else {
                return `<iframe id="yt-player" src="${YT.getEmbedUrl(vId, isShorts)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>`;
            }
        };

        let playHtml = "";
        if (isShorts) {
            playHtml = `
                <div class="shorts-container">
                    <div class="nav-arrow arrow-prev" onclick="Actions.playRelative(-1)">←</div>
                    <div class="nav-arrow arrow-next" onclick="Actions.playRelative(1)">→</div>
                    <div style="width:360px; height:640px; background:#000; border-radius:15px; overflow:hidden;">
                        ${renderPlayerContent()}
                    </div>
                    <div style="width:360px; margin-top:15px;">
                        <h3>${snip.title}</h3>
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px;">
                            <span onclick="Actions.showChannel('${snip.channelId}')" style="cursor:pointer; color:#aaa;">${snip.channelTitle}</span>
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap: 8px;">
                            <button class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${safeChTitle}', true)">${isSubbed ? '登録済み' : '登録'}</button>
                            <button class="btn ${isWatchLater ? 'subbed' : ''}" onclick="Actions.handleWatchLater('${vId}', '${safeTitle}', '${safeChTitle}', '${thumbUrl}', '${snip.channelId}')">${isWatchLater ? '保存済み' : '📌 後で'}</button>
                            <button class="btn" style="background:#333;" onclick="Actions.showComments('${vId}')">💬</button>
                            <button class="btn-download" onclick="Actions.downloadVideo('${vId}', '${safeTitle}')">📥</button>
                        </div>
                    </div>
                </div>`;
        } else {
            playHtml = `
                <div class="watch-layout">
                    <div class="player-area">
                        <div class="video-wrapper">${renderPlayerContent()}</div>
                        <div style="margin-top:15px; display:flex; gap:10px; align-items:center; background:#1e1e1e; padding:10px 20px; border-radius:10px; flex-wrap:wrap;">
                            <span style="font-size:14px; color:#aaa; font-weight:bold; margin-right:10px;">再生速度:</span>
                            <button class="btn" onclick="Actions.changeSpeed(0.5)">0.5x</button>
                            <button class="btn" style="background:#444;" onclick="Actions.changeSpeed(1.0)">1.0x</button>
                            <button class="btn" onclick="Actions.changeSpeed(1.5)">1.5x</button>
                            <button class="btn" onclick="Actions.changeSpeed(2.0)">2.0x</button>
                            <div style="margin-left:auto; display:flex; align-items:center; gap:10px;">
                                <span style="font-size:12px; color:#aaa;">再生モード:</span>
                                <select id="mode-select" class="btn" style="background:#333; color:#fff; border:none;" onchange="Actions.playbackMode=this.value; localStorage.setItem('yt_playback_mode', this.value); Actions.play(Actions.currentList[Actions.currentIndex] || Actions.relatedList[Actions.currentIndex], true)">
                                    <option value="edu" ${this.playbackMode==='edu'?'selected':''}>Education</option>
                                    <option value="streaming" ${this.playbackMode==='streaming'?'selected':''}>ストリーミング</option>
                                </select>
                            </div>
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
                                    <button class="btn-download" onclick="Actions.downloadVideo('${vId}', '${safeTitle}')">📥</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="related-area"><h3 id="side-title" style="margin-top:0;">関連動画</h3><div id="side-content-box"></div></div>
                </div>`;
        }

        this.Maps(playHtml);

        const sideBox = document.getElementById('side-content-box');
        if (sideBox) {
            if (this.activePlaylistName) {
                document.getElementById('side-title').innerText = `再生中: ${this.activePlaylistName}`;
                this.relatedList = this.currentList;
            } else {
                try {
                    const relResp = await fetch(`/api/kanrenn?vId=${vId}`);
                    const relIds = await relResp.json();
                    if (Array.isArray(relIds) && relIds.length > 0) {
                        const relData = await YT.fetchAPI('videos', { id: relIds.join(','), part: 'snippet' });
                        this.relatedList = relData.items || [];
                    } else {
                        this.relatedList = [];
                    }
                } catch (e) {
                    console.error("Related fetch error:", e);
                    this.relatedList = [];
                }
                await this.fillStats(this.relatedList);
            }
            sideBox.innerHTML = this.relatedList.map((i, idx) => `
                <div class="v-card" style="display:flex; gap:10px; margin-bottom:12px; ${idx === this.currentIndex && this.activePlaylistName ? 'background:#333; border-left:4px solid #3ea6ff;' : ''}" onclick="Actions.playFromRelated(${idx})">
                    <img src="${YT.getProxiedThumb(i)}" style="width:140px; aspect-ratio:16/9; object-fit:cover; border-radius:8px;">
                    <div style="font-size:12px;"><div style="font-weight:bold; line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;">${i.snippet.title}</div><div style="color:#aaa;">${i.snippet.channelTitle}</div><div style="color:#888;">${formatViews(this.videoStats[YT.getVideoId(i)])}</div></div>
                </div>`).join('');
        }

        Storage.addHistory({ id: vId, title: snip.title, thumb: thumbUrl, channelTitle: snip.channelTitle });

        if (this.resumeTimer) clearInterval(this.resumeTimer);
        this.resumeTimer = setInterval(() => {
            const player = document.getElementById('yt-player');
            if (player) {
                if (player.tagName === 'IFRAME') {
                    player.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
                    window.addEventListener('message', function listener(e) {
                        try {
                            const data = JSON.parse(e.data);
                            if (data.event === 'infoDelivery' && data.info && data.info.currentTime) {
                                Storage.saveResumeProgress(video, data.info.currentTime, data.info.duration);
                            }
                        } catch(err) {}
                    });
                } else if (player.tagName === 'VIDEO') {
                    Storage.saveResumeProgress(video, player.currentTime, player.duration);
                }
            }
        }, 5000);
    },

    // --- チャンネルページ用 UIとロジック（UI大型化・分離版） ---
    async showChannel(chId, skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?channel=' + chId);
        this.currentView = "channel";
        
        // チャンネルを開いた時の初期状態
        this.chState = { type: 'videos', sort: 'date' };

        const chData = await YT.fetchAPI('channels', { id: chId, part: 'snippet,brandingSettings' });
        const ch = chData.items[0];
        const isSubbed = Storage.get('yt_subs').some(x => x.id === chId);
        
        const channelHtml = `
            <div class="channel-header">
                <div style="width:100%; height:150px; background:url(${ch.brandingSettings?.image?.bannerExternalUrl || ''}) center/cover #333; border-radius:15px;"></div>
                <div style="display:flex; align-items:center; padding:20px;">
                    <img src="${ch.snippet.thumbnails.medium.url}" style="width:80px; height:80px; border-radius:50%;">
                    <div style="margin-left:20px;"><h1>${ch.snippet.title}</h1><p style="color:#aaa;">${ch.snippet.customUrl}</p></div>
                    <button class="btn ${isSubbed ? 'subbed' : ''}" style="margin-left:auto;" onclick="Actions.handleSub('${chId}', '${ch.snippet.title.replace(/'/g, "\\\\'")}', true)">${isSubbed ? '登録済み' : '登録'}</button>
                </div>
                
                <div style="padding: 10px 20px;">
                    <div style="display:flex; gap:30px; flex-wrap:wrap; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:20px;">
                        <div id="ch-type-videos" class="ch-type-btn" onclick="Actions.changeChType('${chId}', 'videos')" style="padding:15px 40px; font-size:18px; font-weight:bold; border-radius:30px; cursor:pointer; transition:all 0.3s ease;">🎬 動画</div>
                        <div id="ch-type-shorts" class="ch-type-btn" onclick="Actions.changeChType('${chId}', 'shorts')" style="padding:15px 40px; font-size:18px; font-weight:bold; border-radius:30px; cursor:pointer; transition:all 0.3s ease;">⚡ ショート</div>
                        <div id="ch-type-playlists" class="ch-type-btn" onclick="Actions.changeChType('${chId}', 'playlists')" style="padding:15px 40px; font-size:18px; font-weight:bold; border-radius:30px; cursor:pointer; transition:all 0.3s ease;">📂 再生リスト</div>
                    </div>
                    
                    <div id="ch-sort-container" style="display:flex; gap:20px; margin-bottom:10px;">
                        <div id="ch-sort-date" class="ch-sort-btn" onclick="Actions.changeChSort('${chId}', 'date')" style="padding:10px 25px; font-size:15px; font-weight:bold; border-radius:20px; cursor:pointer; transition:all 0.3s ease;">🕒 最新順</div>
                        <div id="ch-sort-viewCount" class="ch-sort-btn" onclick="Actions.changeChSort('${chId}', 'viewCount')" style="padding:10px 25px; font-size:15px; font-weight:bold; border-radius:20px; cursor:pointer; transition:all 0.3s ease;">🔥 人気順</div>
                    </div>
                </div>
            </div>
            <div id="channel-content-grid" class="grid" style="padding: 0 20px;"></div>
            <div id="more-btn-area" style="padding: 0 20px;"></div>`;
        this.Maps(channelHtml);
        
        // UIの初期発光設定とデータ取得
        this.updateChUI();
        this.fetchChData(chId);
    },

    changeChType(chId, type) {
        this.chState.type = type;
        this.updateChUI();
        this.fetchChData(chId);
    },

    changeChSort(chId, sort) {
        this.chState.sort = sort;
        this.updateChUI();
        this.fetchChData(chId);
    },

    updateChUI() {
        // メインカテゴリのUIリセット＆発光
        document.querySelectorAll('.ch-type-btn').forEach(b => {
            b.style.background = '#222';
            b.style.boxShadow = 'none';
            b.style.border = '2px solid transparent';
            b.style.color = '#fff';
        });
        const activeType = document.getElementById('ch-type-' + this.chState.type);
        if (activeType) {
            activeType.style.background = '#1a1a1a';
            activeType.style.boxShadow = '0 0 20px rgba(62, 166, 255, 0.6)';
            activeType.style.border = '2px solid #3ea6ff';
            activeType.style.color = '#3ea6ff';
        }

        // 並び替えメニューのUIリセット＆発光（再生リストの場合は非表示）
        const sortContainer = document.getElementById('ch-sort-container');
        if (this.chState.type === 'playlists') {
            sortContainer.style.display = 'none';
        } else {
            sortContainer.style.display = 'flex';
            document.querySelectorAll('.ch-sort-btn').forEach(b => {
                b.style.background = '#222';
                b.style.boxShadow = 'none';
                b.style.border = '1px solid transparent';
                b.style.color = '#fff';
            });
            const activeSort = document.getElementById('ch-sort-' + this.chState.sort);
            if (activeSort) {
                activeSort.style.background = '#1a1a1a';
                activeSort.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.5)';
                activeSort.style.border = '1px solid #00ff88';
                activeSort.style.color = '#00ff88';
            }
        }
    },

    async fetchChData(chId) {
        const grid = document.getElementById('channel-content-grid');
        grid.innerHTML = "<div style='padding:40px; text-align:center;'>読込中...</div>";

        if (this.chState.type === 'videos') {
            this.currentView = "channel";
            // 修正: qパラメータのAPI除外検索をやめ、全取得後にJavaScriptでフィルタリング
            this.currentParams = { channelId: chId, part: 'snippet', type: 'video', order: this.chState.sort, maxResults: 24 };
            const data = await YT.fetchAPI('search', this.currentParams);
            let items = data.items || [];
            this.nextToken = data.nextPageToken || "";
            
            // クライアント側で #shorts を含むタイトルを除外
            items = items.filter(item => {
                const title = item.snippet?.title?.toLowerCase() || '';
                return !title.includes('#shorts') && !title.includes('shorts');
            });
            
            this.currentList = items;
            await this.fillStats(this.currentList);
            grid.innerHTML = this.renderCards(this.currentList);
            
        } else if (this.chState.type === 'shorts') {
            this.currentView = "channel_shorts";
            // 修正: videoDuration='short' だけでショート動画を抽出
            this.currentParams = { channelId: chId, part: 'snippet', type: 'video', videoDuration: 'short', order: this.chState.sort, maxResults: 24 };
            const data = await YT.fetchAPI('search', this.currentParams);
            this.currentList = data.items || []; 
            this.nextToken = data.nextPageToken || "";
            
            await this.fillStats(this.currentList);
            grid.innerHTML = this.renderCards(this.currentList);
            
        } else if (this.chState.type === 'playlists') {
            this.currentView = "channel_playlists";
            this.currentParams = { channelId: chId, part: 'snippet', maxResults: 24 };
            const data = await YT.fetchAPI('playlists', this.currentParams);
            this.currentList = data.items || [];
            this.nextToken = data.nextPageToken || "";
            grid.innerHTML = this.renderCards(this.currentList);
        }
        document.getElementById('more-btn-area').innerHTML = this.nextToken ? `<button class="btn" onclick="Actions.loadMore()" style="width:100%; margin:20px 0; background:#333; color:#fff; padding:15px; font-size:16px;">もっと読み込む</button>` : "";
    },

    async showPlaylistView(plId, title, skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', `?playlist=${plId}&title=${encodeURIComponent(title)}`);
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
        if (refresh) { if (this.currentView === "channel") this.showChannel(id, true); else if (this.currentIndex !== -1 && this.currentView !== "subs") this.play(this.currentList[this.currentIndex], true); }
    },

    async showSubs(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?mode=subs');
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        
        const scrollStyles = `display: flex; overflow-x: auto; gap: 20px; padding: 20px; background: #0f0f0f; border-bottom: 1px solid #333; scrollbar-width: none; -ms-overflow-style: none;`;
        const channelItemsHtml = subs.map(ch => `
            <div style="flex: 0 0 auto; text-align: center; width: 85px; cursor: pointer;" onclick="Actions.showChannel('${ch.id}')">
                <div style="position:relative; width:65px; height:65px; margin: 0 auto;">
                    <img src="${ch.thumb}" style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid #444; object-fit: cover;">
                </div>
                <div style="font-size: 11px; color: #fff; margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 2px;">${ch.name}</div>
            </div>`).join('');

        const subHtml = `
            <div style="${scrollStyles}" class="no-scrollbar">${channelItemsHtml}</div>
            <div style="padding: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0;">最新タイムライン</h2>
                    <span style="font-size:12px; color:#aaa;">(3日以内の一括取得)</span>
                </div>
                <div id="subs-timeline-grid" class="grid" style="margin-top:20px;">タイムライン読み込み中...</div>
            </div>`;
        this.Maps(subHtml);

        try {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            let allActivities = [];
            for (let i = 0; i < subs.length; i += 5) {
                const chunk = subs.slice(i, i + 5);
                const promises = chunk.map(ch => YT.fetchAPI('activities', { channelId: ch.id, part: 'snippet,contentDetails', maxResults: 5, publishedAfter: threeDaysAgo.toISOString() }));
                const results = await Promise.all(promises);
                results.forEach(res => { if (res.items) allActivities = [...allActivities, ...res.items]; });
            }
            const timelineVideos = allActivities.filter(a => a.snippet.type === 'upload').sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
            this.currentList = timelineVideos;
            await this.fillStats(this.currentList);
            const grid = document.getElementById('subs-timeline-grid');
            if (grid) grid.innerHTML = timelineVideos.length === 0 ? `<p style="color:#aaa; text-align:center; grid-column: 1/-1; padding:40px;">最近の新着動画はありません。</p>` : this.renderCards(timelineVideos);
        } catch (e) { if(document.getElementById('subs-timeline-grid')) document.getElementById('subs-timeline-grid').innerHTML = "取得に失敗しました。"; }
    },

    showWatchLater(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?mode=watchlater');
        this.currentView = "watchlater";
        const list = Storage.get('yt_watchlater');
        this.currentList = list.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId, publishedAt: new Date().toISOString() } }));
        this.activePlaylistName = "後で見る";
        this.renderGrid("<h2>📌 後で見る</h2>");
    },

    toggleIncognito() {
        const current = Storage.isIncognito();
        Storage.setIncognito(!current);
        const item = document.getElementById('nav-incognito');
        if (item) {
            const isInc = !current;
            item.style.color = isInc ? '#00ff00' : '#aaa';
            item.innerHTML = `👤<span>${isInc ? 'シークレット: ON' : 'シークレット: OFF'}</span>`;
        }
        Actions.showStatusNotification(current ? "シークレットモードを終了しました" : "シークレットモードを開始しました。履歴は保存されません。");
    },

    showHistory(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?mode=history');
        this.currentView = "history";
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, publishedAt: new Date().toISOString() } }));
        this.activePlaylistName = null;
        
        let html = `
            <div style="padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2>履歴</h2>
                    <button class="btn" onclick="Storage.clearAllHistory()" style="background:#ff4e45; color:white; font-size:12px;">すべて削除</button>
                </div>
                <div class="grid" style="margin-top:20px;">`;
        if (history.length === 0) {
            html += `<p style="padding:40px; color:#aaa; grid-column:1/-1; text-align:center;">視聴履歴はありません。</p>`;
        } else {
            this.currentList.forEach((v, i) => {
                html += `
                <div class="v-card">
                    <div class="thumb-container" onclick="Actions.playFromList(${i})">
                        <img src="${v.snippet.thumbnails.high.url}" class="main-thumb">
                    </div>
                    <div class="v-text">
                        <h3>${v.snippet.title}</h3>
                        <p>${v.snippet.channelTitle}</p>
                        <button class="btn" onclick="Storage.deleteHistoryItem('${v.id}'); Actions.showHistory(true);" style="margin-top:5px; font-size:10px; padding:2px 5px; background:#444;">削除</button>
                    </div>
                </div>`;
            });
        }
        html += `</div></div>`;
        this.Maps(html);
    },

    showGame(skipPush = false) {
        if (!skipPush) window.history.pushState(null, '', '?mode=game');
        window.scrollTo(0, 0);
        if (typeof M3U8Player !== 'undefined') M3U8Player.stopPlayer();
        GameModule.renderGameMenu();
    }
};

window.onload = async () => { 
    Actions.init(); 
    await YT.refreshEduKey(); 
    Actions.routeCurrentUrl();
};

// ゲーム起動関数群
function startTetris() { if (typeof initTetris === 'function') initTetris(); else Actions.showStatusNotification("エラー"); }
function startSnake() { if (typeof initSnake === 'function') initSnake(); else Actions.showStatusNotification("エラー"); }
function startReversi() { if (typeof initReversi === 'function') initReversi(); else Actions.showStatusNotification("エラー"); }
function startShogi() { if (typeof initShogi === 'function') initShogi(); else Actions.showStatusNotification("エラー"); }
function startBlockBlast() { if (typeof initBlock === 'function') initBlock(); else Actions.showStatusNotification("エラー"); }
function start2048() { if (typeof init2048 === 'function') init2048(); else Actions.showStatusNotification("エラー"); }
