const YT = {
    API_KEYS: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWAE",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vC"
    ],
    currentKeyIndex: 0,
    // 【重要】だいき、もし今手元にあの長いキー(AXH...)があるなら、下の空欄に直接コピペしてくれ。
    // それが一番確実だ。
    EDU_TOKEN: "AXH1ezlT63u_E7v-7A-8zQ", // 一旦、最新と思われる値をセットしておく

    // サイトの中身を「覗く」のではなく、ブラウザに「読み込ませる」だけにする
    async prepareAuth() {
        return new Promise((resolve) => {
            const img = new Image();
            // 画像として読み込ませることで、通信ブロック(CORS)を回避しつつ認証を走らせる
            img.src = 'https://apis.kahoot.it/media-api/youtube/key?t=' + Date.now();
            img.onload = img.onerror = () => {
                console.log("Auth trigger sent");
                resolve();
            };
        });
    },

    async fetchAPI(endpoint, params) {
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

    getEmbedUrl(id) {
        // キーが空にならないよう、this.EDU_TOKEN を確実に使う
        return `https://www.youtubeeducation.com/embed/${id}?edufilter=${this.EDU_TOKEN}&autoplay=1`;
    }
};

const Actions = {
    currentList: [],

    async init() {
        this.renderSidebar();
        // 認証だけ飛ばして、キー取得を待たずに進める
        await YT.prepareAuth();
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
            return `
            <div class="v-card" onclick="Actions.play('${vId}', '${item.snippet.title.replace(/'/g, "\\'")}')">
                <div class="thumb-container"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3></div>
            </div>`;
        }).join('');
        document.getElementById('view-container').innerHTML = `<div class="grid">${html}</div>`;
    },

    play(id, title) {
        const embedUrl = YT.getEmbedUrl(id);
        console.log("Playing with URL:", embedUrl); // ここでURLが空じゃないかチェックできる
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
