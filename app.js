const YT{
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    // 予備のキー
    currentEduKey: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",

    async refreshEduKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            if (data && data.key) this.currentEduKey = data.key;
        } catch (e) { console.error("Key error"); }
    },

    getCurrentKey() {
        const index = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[index];
    },

    async fetchAPI(endpoint, params) {
        const queryParams = new URLSearchParams({ ...params, key: this.getCurrentKey() });
        const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams}`);
        
        if (res.status === 403) {
            let next = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
            if (next < this.keys.length) {
                localStorage.setItem('yt_key_index', next);
                return this.fetchAPI(endpoint, params); // 次のキーで再試行
            }
        }
        return await res.json();
    },

    // 💡 152-2エラーを殺す核心部分
    getEmbedUrl(id) {
        const params = new URLSearchParams({
            autoplay: 1,
            origin: "https://create.kahoot.it",
            embed_config: JSON.stringify({ enc: this.currentEduKey, hideTitle: true }),
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1
        });
        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

// --- Storage & Actions (だいきが持っていた検索・視聴機能) ---
const Storage = {
    getHistory() { return JSON.parse(localStorage.getItem('yt_history')) || []; },
    addHistory(v) {
        let h = this.getHistory();
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50);
        localStorage.setItem('yt_history', JSON.stringify(h));
    },
    getSubs() { return JSON.parse(localStorage.getItem('yt_subs')) || []; },
    toggleSub(c) {
        let s = this.getSubs();
        const exists = s.find(x => x.id === c.id);
        if (exists) s = s.filter(x => x.id !== c.id); else s.push(c);
        localStorage.setItem('yt_subs', JSON.stringify(s));
    }
};

const Actions = {
    currentList: [],
    
    async init() {
        await YT.refreshEduKey();
        this.goHome();
        
        // iPad対応: Enterキーで検索
        const searchInput = document.getElementById('search-input');
        if(searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.search(searchInput.value);
                }
            });
        }
    },

    async goHome() {
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        if (data.items) {
            this.currentList = data.items;
            this.renderGrid(this.currentList);
        }
    },

    async search(q) {
        if (!q) return;
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 24 });
        if (data.items) {
            this.currentList = data.items;
            this.renderGrid(this.currentList);
        }
    },

    renderGrid(items) {
        const html = items.map((item, i) => `
            <div class="v-card" onclick="Actions.play(${i})">
                <div class="thumb-container"><img src="${item.snippet.thumbnails.high.url}" class="main-thumb"></div>
                <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div class="grid">${html}</div>`;
    },

    async play(index) {
        const video = this.currentList[index];
        const videoId = video.id.videoId || video.id;
        
        // 再生直前にキーを最新にする
        await YT.refreshEduKey();
        
        const embedUrl = YT.getEmbedUrl(videoId);
        document.getElementById('view-container').innerHTML = `
            <div class="watch-container">
                <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe src="${embedUrl}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                </div>
                <div style="padding:15px;">
                    <h2>${video.snippet.title}</h2>
                    <p>${video.snippet.channelTitle}</p>
                    <button class="btn" onclick="Actions.goHome()">🔙 戻る</button>
                </div>
            </div>`;
        
        Storage.addHistory({id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url});
    },

    showHistory() {
        const h = Storage.getHistory();
        this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: "履歴" } }));
        this.renderGrid(this.currentList);
    }
};

window.onload = () => Actions.init();
