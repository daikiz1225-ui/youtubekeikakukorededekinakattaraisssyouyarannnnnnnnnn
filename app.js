const YT = {
    API_KEYS: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWAE",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vC"
    ],
    currentKeyIndex: 0,
    EDU_TOKEN: "",

    // JSONだと思わずに、サイトに書いてある文字をそのまま抜く
    async getEducationKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            // テキストとして丸ごと読み込む
            const rawText = await res.text();
            
            // もしJSON形式だったとしても、生テキストだったとしても、
            // 「AXH」から始まる長い英数字の部分だけを抜き出す（安全策）
            const match = rawText.match(/AXH[a-zA-Z0-9\-_]+/);
            
            if (match) {
                this.EDU_TOKEN = match[0];
                console.log("Raw Key Captured:", this.EDU_TOKEN);
                return true;
            } else {
                // 正規表現に引っかからなければ、最悪読み込んだ文字をそのまま使う
                this.EDU_TOKEN = rawText.trim();
                return true;
            }
        } catch (e) {
            console.error("Fetch Error");
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

    // 抜いたテキストをそのまま edufilter にぶち込む
    getEmbedUrl(id) {
        return `https://www.youtubeeducation.com/embed/${id}?edufilter=${this.EDU_TOKEN}&autoplay=1`;
    }
};

const Actions = {
    currentList: [], 
    nextToken: "", 
    isShortsMode: false,
    searchQuery: "",

    async init() {
        this.renderSidebar();
        // サイトの文字を抜き終わるまで待機
        await YT.getEducationKey();
        this.goHome();
        
        // iPad Enterキー制御
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
            this.renderGrid(this.currentList, 'view-container');
        }
    },

    renderGrid(items, targetId) {
        const html = items.map((item, i) => `
            <div class="v-card" onclick="Actions.playFromList(${i})">
                <div class="thumb-container"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
            </div>`).join('');
        document.getElementById(targetId).innerHTML = `<div class="grid">${html}</div>`;
    },

    async play(video) {
        const vId = video.id.videoId || video.id;
        const embedUrl = YT.getEmbedUrl(vId);
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${embedUrl}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>
                </div>
                <h2>${video.snippet.title}</h2>
            </div>`;
    },

    playFromList(i) { this.play(this.currentList[i]); },
    showShortsFeed() { this.isShortsMode = true; this.search(""); },
    showHistory() { /* 履歴 */ },
    showLiked() { /* 高評価 */ },
    toggleTheme() { document.body.setAttribute('data-theme', document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light'); }
};

window.onload = () => Actions.init();
