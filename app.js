const YT = {
    API_KEYS: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWAE",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vC"
    ],
    currentKeyIndex: 0,
    // 💡 だいき、ここに「あの長いキー」を直接固定したぞ。
    // これなら自動取得に失敗して空になる心配もない。
    EDU_TOKEN: "AXH1ezlTIv1iET739iyM40XBTC-rMyUWcQxOgfqaUQcrFTpcX9b6OFMaFtizY_gF5XcWSVzqxlKauGTacUn-KEbquLUbsJGkTUAtn-QLC0SF8NkYXoVyAphLMuUywzlVHkq7x5moacy4NzQmF-_cGm-zi26NmgkTLQ==",

    // 💡 エラーの原因になる自動取得を一時的に停止
    async refreshEduKey() {
        console.log("Using hardcoded key to avoid 152-2 error.");
        return true; 
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

    // 💡 152-2エラー対策：一切の関数を通さず、生の文字列をただ繋げるだけにする
    getEmbedUrl(id) {
        const baseUrl = "https://www.youtubeeducation.com/embed/" + id;
        const filterPart = "?edufilter=" + this.EDU_TOKEN;
        const finalUrl = baseUrl + filterPart + "&autoplay=1";
        console.log("Final Embed URL:", finalUrl);
        return finalUrl;
    }
};

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
        const data = await YT.fetchAPI('search', params);
        if (this.isShortsMode) {
            this.relatedList = isMore ? [...this.relatedList, ...data.items] : data.items;
            this.renderShortsGrid(this.relatedList, 'view-container');
        } else {
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
                </div>
                <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
            </div>`).join('') + `</div>`;
    },

    async play(video) {
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : (video.id.resourceId ? video.id.resourceId.videoId : ""));
        this.showView();
        // 💡 ここで生成されるURLが「生」であることを祈る
        const embedUrl = YT.getEmbedUrl(videoId);
        document.getElementById('view-container').innerHTML = `
            <div class="watch-container">
                <div class="player-main">
                    <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                        <iframe src="${embedUrl}" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>
                    </div>
                    <div style="padding:15px;">
                        <h2>${video.snippet.title}</h2>
                        <p>${video.snippet.channelTitle}</p>
                    </div>
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
