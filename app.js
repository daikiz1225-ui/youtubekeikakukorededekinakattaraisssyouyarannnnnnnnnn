const YT = {
    keys: ["AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU", "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY", "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0", "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA", "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"],
    // 手動入力箇所を削除し、空にしました。自動で取得されます。
    currentEduKey: "",

    async refreshEduKey() {
        try {
            // KahootのAPIから最新の教育用キーを自動取得
            const response = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await response.json();
            if (data && data.key) {
                this.currentEduKey = data.key;
                console.log("YouTube Education Key Updated Automatically");
            }
        } catch (error) { 
            console.error("Key fetch failed. Checking fallback..."); 
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
            if (response.status === 403) {
                this.rotateKey();
                return this.fetchAPI(endpoint, params);
            }
            if (!response.ok) throw new Error("API error");
            return await response.json();
        } catch (error) {
            return { items: [], nextPageToken: "" };
        }
    },

    getEmbedUrl(id, isShort = false) {
        // 自動取得した currentEduKey を使用してURLを組み立てる
        const config = { enc: this.currentEduKey, hideTitle: true };
        const params = new URLSearchParams({
            autoplay: 1,
            origin: location.origin,
            embed_config: JSON.stringify(config),
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
    get(key) { 
        const data = localStorage.getItem(key);
        try { return data ? JSON.parse(data) : []; } catch (e) { return []; }
    },
    set(key, value) { 
        localStorage.setItem(key, JSON.stringify(value)); 
    },
    addHistory(v) {
        let h = this.get('yt_history');
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50);
        this.set('yt_history', h);
    },
    toggleSub(ch) {
        let s = this.get('yt_subs');
        const i = s.findIndex(x => x.id === ch.id);
        if (i > -1) s.splice(i, 1);
        else s.push({ id: ch.id, name: ch.name, thumb: ch.thumb || '' });
        this.set('yt_subs', s);
    },
    toggleWatchLater(v) {
        let list = this.get('yt_watchlater');
        const i = list.findIndex(x => x.id === v.id);
        if (i > -1) list.splice(i, 1);
        else list.unshift(v);
        this.set('yt_watchlater', list);
    }
};

const Actions = {
    currentList: [],
    nextPageToken: "",
    currentView: "home",
    selectedSubs: [],

    init() {
        const input = document.getElementById('search-input');
        // iPad対応: Enterキーで検索（リロード）を走らせない設定
        input.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                this.search();
                input.blur(); 
            } 
        });
        document.getElementById('search-btn').onclick = () => this.search();

        // 起動時に自動でキーを取得し、完了してからホームを表示
        YT.refreshEduKey().then(() => {
            this.goHome();
        });
    },

    async search(query = null) {
        const q = query || document.getElementById('search-input').value;
        if (!q) return;
        this.currentView = "search";
        const data = await YT.fetchAPI('search', { q, part: 'snippet', maxResults: 24, type: 'video' });
        this.currentList = data.items;
        this.nextPageToken = data.nextPageToken || "";
        this.renderGrid(`<h2>「${q}」の検索結果</h2>`);
    },

    async goHome() {
        this.currentView = "home";
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', part: 'snippet,statistics', maxResults: 24, regionCode: 'JP' });
        this.currentList = data.items;
        this.renderGrid("<h2>急上昇</h2>");
    },

    renderGrid(titleHtml = "") {
        const container = document.getElementById('view-container');
        const cards = this.currentList.map(v => {
            const id = typeof v.id === 'string' ? v.id : v.id.videoId;
            const isWl = Storage.get('yt_watchlater').some(x => x.id === id);
            return `
                <div class="video-card">
                    <div class="thumbnail-container" onclick="Actions.play('${id}')">
                        <img src="${v.snippet.thumbnails.high.url}" alt="">
                    </div>
                    <div class="video-info">
                        <div class="video-title" onclick="Actions.play('${id}')">${v.snippet.title}</div>
                        <div class="video-meta">
                            <span onclick="Actions.showChannel('${v.snippet.channelId}', '${v.snippet.channelTitle.replace(/'/g, "\\'")}')">${v.snippet.channelTitle}</span>
                        </div>
                        <button class="wl-btn ${isWl ? 'active' : ''}" onclick="event.stopPropagation(); Actions.toggleWL('${id}', '${v.snippet.title.replace(/'/g, "\\'")}', '${v.snippet.thumbnails.high.url}', '${v.snippet.channelTitle.replace(/'/g, "\\'")}', '${v.snippet.channelId}')">
                            ${isWl ? '✅' : '📌'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        container.innerHTML = `<div style="padding:20px;">${titleHtml}<div class="grid">${cards}</div></div>`;
    },

    play(id) {
        const video = this.currentList.find(v => (typeof v.id === 'string' ? v.id : v.id.videoId) === id);
        if (video) {
            Storage.addHistory({
                id: id,
                title: video.snippet.title,
                thumb: video.snippet.thumbnails.high.url,
                channelTitle: video.snippet.channelTitle,
                channelId: video.snippet.channelId
            });
        }
        const container = document.getElementById('view-container');
        const url = YT.getEmbedUrl(id);
        container.innerHTML = `
            <div class="player-container">
                <iframe src="${url}" allowfullscreen allow="autoplay"></iframe>
                <div class="player-details" style="padding:20px;">
                    <h2 style="font-size:20px; margin-bottom:10px;">${video ? video.snippet.title : ''}</h2>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <button class="btn" onclick="Actions.toggleSubFromPlay('${video.snippet.channelId}', '${video.snippet.channelTitle.replace(/'/g, "\\'")}', '${video.snippet.thumbnails.high.url}')">チャンネル登録 / 解除</button>
                        <button class="btn" onclick="Actions.goHome()">閉じる</button>
                    </div>
                </div>
            </div>
        `;
    },

    toggleWL(id, title, thumb, channelTitle, channelId) {
        Storage.toggleWatchLater({ id, title, thumb, channelTitle, channelId });
        if (this.currentView === "watchlater") this.showWatchLater();
        else this.renderGrid(document.querySelector('h2') ? document.querySelector('h2').outerHTML : "");
    },

    showHistory() {
        this.currentView = "history";
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId } }));
        this.renderGrid("<h2>🕒 視聴履歴</h2>");
    },

    showWatchLater() {
        this.currentView = "watchlater";
        const list = Storage.get('yt_watchlater');
        this.currentList = list.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle, channelId: x.channelId } }));
        this.renderGrid("<h2>📌 後で見る</h2>");
    },

    showSubs() {
        this.currentView = "subs";
        const subs = Storage.get('yt_subs');
        let html = subs.map(s => `
            <div class="nav-item" style="padding:15px; background:#fff; margin-bottom:10px; border-radius:10px; display:flex; align-items:center; justify-content:space-between;">
                <span onclick="Actions.showChannel('${s.id}', '${s.name.replace(/'/g, "\\'")}')" style="cursor:pointer; font-weight:bold;">${s.name}</span>
                <button class="btn" style="background:#ff4e45; color:#fff;" onclick="Storage.toggleSub({id:'${s.id}'}); Actions.showSubs();">解除</button>
            </div>
        `).join('');
        if (subs.length === 0) html = "<p>登録済みのチャンネルはありません。</p>";
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>👥 登録済みチャンネル</h2>${html}</div>`;
    },

    showGame() {
        this.currentView = "game";
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px; text-align:center;">
                <h2>🎮 ゲームハブ</h2>
                <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:15px; margin-top:20px;">
                    <button class="btn" onclick="Tetris.start()" style="height:100px; font-size:18px; background:#333; color:#fff;">テトリス</button>
                    <button class="btn" onclick="Snake.start()" style="height:100px; font-size:18px; background:#2e7d32; color:#fff;">ヘビゲーム</button>
                    <button class="btn" onclick="Reversi.start()" style="height:100px; font-size:18px; background:#1565c0; color:#fff;">リバーシ</button>
                </div>
            </div>
        `;
    }
};

// 最後に初期化を実行
Actions.init();
