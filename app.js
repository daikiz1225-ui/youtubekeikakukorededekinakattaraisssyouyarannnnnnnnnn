const YT = {
    API_KEYS: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWAE",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vC"
    ],
    currentKeyIndex: 0,
    EDU_TOKEN: "", // ここに Kahoot のキーが入る

    // Kahootからキーを抜いて変数に叩き込む
    async getEducationKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            
            // data.key にあの長い文字列が入っているはず
            if (data && data.key) {
                this.EDU_TOKEN = data.key;
                console.log("Token Acquired:", this.EDU_TOKEN);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Fetch Error:", e);
            return false;
        }
    },

    async fetchAPI(endpoint, params) {
        if (!this.EDU_TOKEN) await this.getEducationKey();
        
        for (let i = 0; i < this.API_KEYS.length; i++) {
            const key = this.API_KEYS[this.currentKeyIndex];
            try {
                const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({...params, key})}`);
                const data = await res.json();
                if (data.error && (data.error.code === 403 || data.error.code === 400)) {
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.API_KEYS.length;
                    continue;
                }
                return data;
            } catch (e) {
                this.currentKeyIndex = (this.currentKeyIndex + 1) % this.API_KEYS.length;
            }
        }
    },

    // 確実に current token を使う埋め込みURL生成
    getEmbedUrl(id) {
        // 変数の中身を直接埋め込む
        const url = `https://www.youtubeeducation.com/embed/${id}?edufilter=${this.EDU_TOKEN}&autoplay=1`;
        console.log("Final URL:", url);
        return url;
    }
};

const Storage = {
    getHistory() { return JSON.parse(localStorage.getItem('yt_history')) || []; },
    addHistory(v) {
        let h = this.getHistory();
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50);
        localStorage.setItem('yt_history', JSON.stringify(h));
    },
    getLiked() { return JSON.parse(localStorage.getItem('yt_liked')) || []; },
    toggleLike(v) {
        let l = this.getLiked();
        const idx = l.findIndex(x => x.id === v.id);
        if (idx > -1) l.splice(idx, 1); else l.unshift(v);
        localStorage.setItem('yt_liked', JSON.stringify(l));
    }
};

const Actions = {
    currentList: [], 
    relatedList: [], 
    nextToken: "", 
    isShortsMode: false,
    searchQuery: "",

    async init() {
        this.renderSidebar();
        // ここでキーが取れるまで確実に待つ
        const success = await YT.getEducationKey();
        if (success) {
            this.goHome();
        } else {
            document.getElementById('view-container').innerHTML = "認証キーの取得に失敗しました。";
        }
        
        // iPad Enter制御
        document.getElementById('search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.search(document.getElementById('search-input').value);
            }
        });
    },

    renderSidebar() {
        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome(true)">🏠 <span>急上昇</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div>
            <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div>
            <div class="nav-item" onclick="Actions.showLiked()">👍 <span>高評価</span></div>
        `;
    },

    async goHome(clear = false) {
        if(clear) { document.getElementById('search-input').value = ""; this.searchQuery = ""; }
        this.isShortsMode = false;
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        if (data && data.items) {
            this.currentList = data.items;
            this.renderGrid(this.currentList, 'view-container');
        }
    },

    async search(q, isMore = false) {
        if (!isMore) { this.searchQuery = q; this.nextToken = ""; }
        const params = { 
            q: this.isShortsMode ? `#Shorts ${this.searchQuery}` : this.searchQuery, 
            part: 'snippet', type: 'video', maxResults: 24, pageToken: this.nextToken 
        };
        const data = await YT.fetchAPI('search', params);
        if (data && data.items) {
            this.nextToken = data.nextPageToken || "";
            this.currentList = isMore ? [...this.currentList, ...data.items] : data.items;
            if (this.isShortsMode) {
                this.relatedList = this.currentList;
                this.renderShortsGrid(this.currentList, 'view-container');
            } else {
                this.renderGrid(this.currentList, 'view-container');
            }
        }
        document.getElementById('load-more').style.display = this.nextToken ? 'block' : 'none';
    },

    loadMore() { this.search(this.searchQuery, true); },

    renderGrid(items, targetId) {
        const html = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playFromList(${i})">
                <div class="thumb-container"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
            </div>`).join('');
        document.getElementById(targetId).innerHTML = `<div class="grid">${html}</div>`;
    },

    renderShortsGrid(items, targetId) {
        const html = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playShort(${i})">
                <div class="thumb-container" style="aspect-ratio:9/16;"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3></div>
            </div>`).join('');
        document.getElementById(targetId).innerHTML = `<div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">${html}</div>`;
    },

    async play(video) {
        const vId = video.id.videoId || video.id;
        // 生成されたURLを直接使用
        const embedUrl = YT.getEmbedUrl(vId);
        
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${embedUrl}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>
                </div>
                <h2>${video.snippet.title}</h2>
                <button class="btn" onclick="Actions.handleLike('${vId}')">👍 保存</button>
            </div>`;
        Storage.addHistory({ id: vId, title: video.snippet.title, thumb: video.snippet.thumbnails.high.url, channelTitle: video.snippet.channelTitle });
    },

    playFromList(i) { this.play(this.currentList[i]); },

    async playShort(i) {
        const v = this.relatedList[i];
        const vId = v.id.videoId;
        const embedUrl = YT.getEmbedUrl(vId);
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container">
                <div class="shorts-wrapper">
                    <iframe src="${embedUrl}&loop=1&playlist=${vId}" style="width:100%;height:100%;border:none;"></iframe>
                </div>
                <div class="shorts-right-controls">
                    <button class="short-action-btn" onclick="Actions.playShort(${i-1})">▲</button>
                    <button class="short-action-btn" onclick="Actions.playShort(${i+1})">▼</button>
                </div>
            </div>`;
    },

    showShortsFeed() { this.isShortsMode = true; this.search(""); },
    showHistory() { this.isShortsMode = false; this.renderGrid(Storage.getHistory().map(x => ({id:x.id, snippet:{title:x.title, channelTitle:x.channelTitle, thumbnails:{high:{url:x.thumb}}}})), 'view-container'); },
    showLiked() { this.isShortsMode = false; this.renderGrid(Storage.getLiked().map(x => ({id:x.id, snippet:{title:x.title, channelTitle:x.channelTitle, thumbnails:{high:{url:x.thumb}}}})), 'view-container'); },
    handleLike(id) { 
        const v = this.currentList.find(x => (x.id.videoId||x.id) === id);
        if(v) Storage.toggleLike({id, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url, channelTitle: v.snippet.channelTitle});
    },
    toggleTheme() {
        const next = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', next);
    }
};
window.onload = () => Actions.init();
