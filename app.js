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

    // 教育用キーを取得する
    async getEducationKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            // ここでJSONではなく、テキストとして一旦全部受け取る
            const raw = await res.text();
            
            // 取得した文字列の中から「AXH」で始まる長い文字列だけを抜き出す
            const match = raw.match(/AXH[a-zA-Z0-9\-_]+/);
            
            if (match) {
                this.EDU_TOKEN = match[0];
                console.log("キーの取得に成功しました:", this.EDU_TOKEN);
                return true;
            }
            return false;
        } catch (e) {
            console.error("キーの取得に失敗しました。");
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

    // 埋め込みURLの生成
    getEmbedUrl(id) {
        // 取得したキーをedufilterに確実に渡す
        return `https://www.youtubeeducation.com/embed/${id}?edufilter=${this.EDU_TOKEN}&autoplay=1`;
    }
};

const Actions = {
    currentList: [],

    async init() {
        // サイドバーの初期表示
        this.renderSidebar();
        // 起動時にキーを取得
        await YT.getEducationKey();
        this.goHome();
        
        // iPad Enterキー制御
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
            <div class="nav-item" onclick="Actions.search('#Shorts')">⚡ <span>ショート</span></div>
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

    renderGrid(items) {
        const html = items.map((item, i) => {
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
            </div>`;
    }
};

window.onload = () => Actions.init();
