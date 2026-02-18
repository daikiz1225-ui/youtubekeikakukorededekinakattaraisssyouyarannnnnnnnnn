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

    // サイトに表示されている「==」までの全文字を一切削らずに抜く
    async getEducationKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            
            // JSONのkeyプロパティにある、あの長い文字列をそのまま代入
            if (data && data.key) {
                this.EDU_TOKEN = data.key; 
                console.log("全文字列取得成功:", this.EDU_TOKEN);
                return true;
            }
            return false;
        } catch (e) {
            console.error("取得失敗。だいきが貼ってくれた長いキーを直接使うわ。");
            // 万が一のフォールバック
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

    getEmbedUrl(id) {
        // 特殊文字(+, =, /)が含まれるので、URL用にエンコードして結合
        return `https://www.youtubeeducation.com/embed/${id}?edufilter=${encodeURIComponent(this.EDU_TOKEN)}&autoplay=1`;
    }
};

const Actions = {
    async init() {
        this.renderSidebar();
        await YT.getEducationKey();
        this.goHome();
        
        // iPad Enter
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
        if (data && data.items) this.renderGrid(data.items);
    },

    async search(q) {
        const data = await YT.fetchAPI('search', { q: q, part: 'snippet', type: 'video', maxResults: 24 });
        if (data && data.items) this.renderGrid(data.items);
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
            </div>`;
    }
};

window.onload = () => Actions.init();
