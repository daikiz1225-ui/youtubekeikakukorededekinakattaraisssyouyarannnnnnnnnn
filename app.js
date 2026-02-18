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

    // サイトの文字を「生のまま」抜き取る
    async getEducationKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            
            if (data && data.key) {
                // ここで一切の加工をせず、生の文字列を代入
                this.EDU_TOKEN = data.key; 
                console.log("Raw Token Set:", this.EDU_TOKEN);
                return true;
            }
            return false;
        } catch (e) {
            // 万が一の時もだいきがくれた生キーをそのまま使う
            this.EDU_TOKEN = "AXH1ezlTIv1iET739iyM40XBTC-rMyUWcQxOgfqaUQcrFTpcX9b6OFMaFtizY_gF5XcWSVzqxlKauGTacUn-KEbquLUbsJGkTUAtn-QLC0SF8NkYXoVyAphLMuUywzlVHkq7x5moacy4NzQmF-_cGm-zi26NmgkTLQ==";
            return true;
        }
    },

    async fetchAPI(endpoint, params) {
        if (!this.EDU_TOKEN) await this.getEducationKey();
        
        for (let i = 0; i < this.API_KEYS.length; i++) {
            const key = this.API_KEYS[this.currentKeyIndex];
            try {
                const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({...params, key})}`);
                const data = await res.json();
                if (data.error && data.error.code === 403) {
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.API_KEYS.length;
                    continue;
                }
                return data;
            } catch (e) {
                this.currentKeyIndex = (this.currentKeyIndex + 1) % this.API_KEYS.length;
            }
        }
    },

    // 変換せず、生でぶち込む
    getEmbedUrl(id) {
        // encodeURIComponentを使わず、${this.EDU_TOKEN}をそのまま置く
        return `https://www.youtubeeducation.com/embed/${id}?edufilter=${this.EDU_TOKEN}&autoplay=1`;
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

    async init() {
        this.renderSidebar();
        await YT.getEducationKey();
        this.goHome();
        
        // iPad Enterキー制御（検索ボタンをトリガーさせない）
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.search(searchInput.value);
            }
        });
    },

    renderSidebar() {
        document.getElementById('sidebar-nav').innerHTML = `
            <div class="nav-item" onclick="Actions.goHome()">🏠 <span>急上昇</span></div>
            <div class="nav-item" onclick="Actions.showShorts()">⚡ <span>ショート</span></div>
            <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div>
            <div class="nav-item" onclick="Actions.showLiked()">👍 <span>高評価</span></div>
        `;
    },

    async goHome() {
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        if (data && data.items) {
            this.currentList = data.items;
            this.renderGrid(this.currentList);
        }
    },

    async search(q) {
        const data = await YT.fetchAPI('search', { q: q, part: 'snippet', type: 'video', maxResults: 24 });
        if (data && data.items) {
            this.currentList = data.items;
            this.renderGrid(this.currentList);
        }
    },

    async showShorts() {
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 24 });
        if (data && data.items) {
            this.currentList = data.items;
            this.renderGrid(this.currentList);
        }
    },

    renderGrid(items) {
        const html = items.map((item) => {
            const vId = item.id.videoId || item.id;
            const title = item.snippet.title.replace(/"/g, '&quot;');
            return `
            <div class="v-card" onclick="Actions.play('${vId}', '${title}')">
                <div class="thumb-container"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3></div>
            </div>`;
        }).join('');
        document.getElementById('view-container').innerHTML = `<div class="grid">${html}</div>`;
    },

    play(id, title) {
        const embedUrl = YT.getEmbedUrl(id);
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${embedUrl}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>
                </div>
                <h2>${title}</h2>
                <button class="btn" onclick="Actions.handleLike('${id}')">👍 高評価保存</button>
            </div>`;
        
        // 履歴に追加
        const v = this.currentList.find(x => (x.id.videoId || x.id) === id);
        if(v) Storage.addHistory({id, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url});
    },

    showHistory() { this.renderStorageGrid(Storage.getHistory()); },
    showLiked() { this.renderStorageGrid(Storage.getLiked()); },

    renderStorageGrid(items) {
        const html = items.map(v => `
            <div class="v-card" onclick="Actions.play('${v.id}', '${v.title.replace(/'/g, "\\'")}')">
                <div class="thumb-container"><img src="${v.thumb}" class="main-thumb"></div>
                <div class="v-text"><h3>${v.title}</h3></div>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div class="grid">${html}</div>`;
    },

    handleLike(id) {
        const v = this.currentList.find(x => (x.id.videoId || x.id) === id);
        if(v) {
            Storage.toggleLike({id, title: v.snippet.title, thumb: v.snippet.thumbnails.high.url});
            alert("高評価に保存しました");
        }
    }
};

window.onload = () => Actions.init();
