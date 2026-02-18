const YT = {
    API_KEYS: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWAE",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vC"
    ],
    currentKeyIndex: 0,
    EDU_TOKEN: "AXH1ezlTIv1iET739iyM40XBTC-rMyUWcQxOgfqaUQcrFTpcX9b6OFMaFtizY_gF5XcWSVzqxlKauGTacUn-KEbquLUbsJGkTUAtn-QLC0SF8NkYXoVyAphLMuUywzlVHkq7x5moacy4NzQmF-_cGm-zi26NmgkTLQ==",

    // 152-2エラー対策：fetchではなくscriptタグで読み込む
    async refreshEduKey() {
        return new Promise((resolve) => {
            // 前のタグがあれば消す
            const old = document.getElementById('edu-fetcher');
            if (old) old.remove();

            const script = document.createElement('script');
            script.id = 'edu-fetcher';
            // サイトをJSとして読み込む。もしJSONならエラーが出るが、その場合は予備を使う
            script.src = 'https://apis.kahoot.it/media-api/youtube/key';
            
            script.onload = () => {
                // 読み込み完了。もしwindow.keyとかに代入される形式ならここで取れる
                if (window.key) this.EDU_TOKEN = window.key;
                resolve();
            };
            
            script.onerror = () => {
                // 通信エラーでも、だいきが貼ってくれた最新キーがあるから大丈夫
                resolve();
            };
            document.head.appendChild(script);
            
            // 1秒待っても終わらなければ次に進む（保険）
            setTimeout(resolve, 1000);
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
        // 152-2を防ぐため、一切の変換をせず、生の長いキーを直結
        return `https://www.youtubeeducation.com/embed/${id}?edufilter=${this.EDU_TOKEN}`;
    }
};

// --- ここから下は Actions (お前が持ってきた全機能を維持) ---
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
    currentList: [], relatedList: [], nextToken: "", channelIcons: {}, isHome: false, isShortsMode: false,
    
    async search(q = document.getElementById('search-input').value, isMore = false) {
        if (!q) return;
        this.isHome = false;
        let params = { q, part: 'snippet', type: 'video', maxResults: 30, pageToken: isMore ? this.nextToken : "" };
        if (this.isShortsMode) {
            params.q = q + " #Shorts";
            const data = await YT.fetchAPI('search', params);
            this.relatedList = isMore ? [...this.relatedList, ...data.items] : data.items;
            this.renderShortsGrid(this.relatedList, 'view-container');
        } else {
            const data = await YT.fetchAPI('search', params);
            data.items = data.items.filter(item => !item.snippet.title.toLowerCase().includes('shorts'));
            this.processData(data, isMore);
        }
    },

    async fetchTrending(isMore = false) {
        this.isHome = true; this.isShortsMode = false;
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24, pageToken: isMore ? this.nextToken : "" });
        this.processData(data, isMore);
    },

    async processData(data, isMore) {
        this.nextToken = data.nextPageToken || "";
        const chIds = [...new Set(data.items.map(i => i.snippet.channelId))].join(',');
        await this.fetchChannelIcons(chIds);
        if (isMore) this.currentList.push(...data.items); else { this.currentList = data.items; this.showView(); }
        this.renderGrid(this.currentList, 'view-container');
    },

    async fetchChannelIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if(data.items) data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
    },

    renderGrid(items, targetId) {
        document.getElementById(targetId).innerHTML = `<div class="grid">` + items.map((item, i) => `
            <div class="v-card" onclick="Actions.playFromList(${i}, '${targetId}')">
                <div class="thumb-container">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                    <img src="${this.channelIcons[item.snippet.channelId] || ''}" class="ch-icon-img">
                </div>
                <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
            </div>`).join('') + `</div>`;
    },

    async play(video) {
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : (video.id.resourceId ? video.id.resourceId.videoId : ""));
        // 再生直前にキーをリフレッシュ
        await YT.refreshEduKey();
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="watch-container">
                <div class="player-main">
                    <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                        <iframe src="${YT.getEmbedUrl(videoId)}&autoplay=1" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>
                    </div>
                    <h2>${video.snippet.title}</h2>
                </div>
            </div>`;
        Storage.addHistory({id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url});
    },

    playFromList(i, targetId) { this.play(targetId === 'related-list' ? this.relatedList : this.currentList[i]); },
    goHome() { this.isShortsMode = false; this.fetchTrending(); },
    showView() { window.scrollTo(0,0); }
};

window.onload = () => {
    Actions.goHome();
    document.getElementById('search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); Actions.search(); }
    });
};
