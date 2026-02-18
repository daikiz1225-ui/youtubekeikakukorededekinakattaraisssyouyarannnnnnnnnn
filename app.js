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

    // 「読み込んだらそのコードになる」＝ scriptタグで読み込む方式
    async getEducationKey() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            // お前が教えてくれたURL
            script.src = 'https://apis.kahoot.it/media-api/youtube/key';
            
            // 読み込みが完了した時の処理
            script.onload = () => {
                // サイトを読み込んだ結果、もし key という変数が定義されたならそれを使う
                // あるいは JSONP 形式ならこれで取れる
                if (window.key) {
                    this.EDU_TOKEN = window.key;
                } else {
                    // もし変数に入らないタイプなら、さっきのテキスト取得を再試行する
                    this.fetchTextFallback();
                }
                console.log("Key set to:", this.EDU_TOKEN);
                resolve();
            };

            script.onerror = async () => {
                // scriptタグでダメなら、最終手段として fetch をもう一度試す
                await this.fetchTextFallback();
                resolve();
            };

            document.head.appendChild(script);
        });
    },

    // 予備の取得手段
    async fetchTextFallback() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            this.EDU_TOKEN = data.key || "";
        } catch (e) {
            console.error("Fallback failed");
        }
    },

    async fetchAPI(endpoint, params) {
        if (!this.EDU_TOKEN) await this.getEducationKey();
        
        for (let i = 0; i < this.API_KEYS.length; i++) {
            const key = this.API_KEYS[this.currentKeyIndex];
            try {
                const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({...params, key})}`);
                const data = await res.json();
                if (data.error && (data.error.code === 403)) {
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
        // 抜いたキーをそのままURLに結合
        return `https://www.youtubeeducation.com/embed/${id}?edufilter=${this.EDU_TOKEN}&autoplay=1`;
    }
};

const Actions = {
    async init() {
        // サイドバーなどは省略せずに維持
        this.renderSidebar();
        await YT.getEducationKey();
        this.goHome();
        
        // iPad Enter
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
        if(clear) { document.getElementById('search-input').value = ""; }
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        if (data && data.items) this.renderGrid(data.items, 'view-container');
    },

    async search(q) {
        const data = await YT.fetchAPI('search', { q: q, part: 'snippet', type: 'video', maxResults: 24 });
        if (data && data.items) this.renderGrid(data.items, 'view-container');
    },

    renderGrid(items, targetId) {
        const html = items.map((item, i) => {
            const vId = item.id.videoId || item.id;
            return `
            <div class="v-card" onclick="Actions.play('${vId}', '${item.snippet.title.replace(/'/g, "\\'")}')">
                <div class="thumb-container"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3></div>
            </div>`;
        }).join('');
        document.getElementById(targetId).innerHTML = `<div class="grid">${html}</div>`;
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
