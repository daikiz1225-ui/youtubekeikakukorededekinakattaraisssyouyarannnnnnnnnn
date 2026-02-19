
const YT = {
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    // 起動時の初期キー（だいきが貼ってくれた最新版）
    currentEduKey: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",

    async refreshEduKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            if (data && data.key) {
                this.currentEduKey = data.key;
                console.log("Edu Key Refreshed");
            }
        } catch (e) {
            console.error("Key error, using backup");
        }
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
                return this.fetchAPI(endpoint, params);
            }
        }
        return await res.json();
    },

    // 💡 Kahoot専用の埋め込み方式。152-2エラーを回避する
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
    relatedList: [],
    nextToken: "",
    channelIcons: {},
    isHome: false,
    isShortsMode: false,

    async init() {
        this.renderSidebar();
        await YT.refreshEduKey();
        this.goHome();
        
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');

        // 検索ボタンのクリックイベント
        if (searchBtn) {
            searchBtn.onclick = () => this.search();
        }

        // iPad対応: Enterキーで検索（キーボードを閉じる処理付き）
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.search();
                    searchInput.blur();
                }
            });
        }
    },

    renderSidebar() {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;
        nav.innerHTML = `
            <div class="nav-item" onclick="Actions.goHome()">🏠 <span>急上昇</span></div>
            <div class="nav-item" onclick="Actions.showShortsFeed()">⚡ <span>ショート</span></div>
            <div class="nav-item" onclick="Actions.showHistory()">🕒 <span>履歴</span></div>
            <div class="nav-item" onclick="Actions.showSubs()">🔔 <span>登録中</span></div>
        `;
    },

    async goHome() {
        this.isHome = true;
        this.isShortsMode = false;
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.processData(data);
    },

    async search(isMore = false) {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        this.isHome = false;
        
        let params = { q, part: 'snippet', type: 'video', maxResults: 24, pageToken: isMore ? this.nextToken : "" };
        
        if (this.isShortsMode) {
            params.q += " #Shorts";
        }

        const data = await YT.fetchAPI('search', params);
        this.processData(data, isMore);
    },

    async processData(data, isMore = false) {
        this.nextToken = data.nextPageToken || "";
        const items = data.items || [];
        
        const chIds = [...new Set(items.map(i => i.snippet.channelId))].join(',');
        await this.fetchChannelIcons(chIds);

        if (isMore) {
            this.currentList.push(...items);
        } else {
            this.currentList = items;
            this.showView();
        }
        this.renderGrid(this.currentList, 'view-container');
    },

    async fetchChannelIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if(data.items) data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
    },

    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        if (!container) return;
        
        const html = items.map((item, i) => {
            const chId = item.snippet.channelId;
            return `
            <div class="v-card" onclick="Actions.playFromList(${i})">
                <div class="thumb-container">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                    <img src="${this.channelIcons[chId] || ''}" class="ch-icon-img">
                </div>
                <div class="v-text">
                    <h3>${item.snippet.title}</h3>
                    <p>${item.snippet.channelTitle}</p>
                </div>
            </div>`;
        }).join('');
        container.innerHTML = `<div class="grid">${html}</div>`;
    },

    async showShortsFeed() {
        this.isShortsMode = true;
        this.search();
    },

    async playFromList(index) {
        const video = this.currentList[index];
        this.play(video);
    },

    async play(video) {
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        if (!videoId) return;

        await YT.refreshEduKey();
        this.showView();
        
        const embedUrl = YT.getEmbedUrl(videoId);
        
        document.getElementById('view-container').innerHTML = `
            <div class="watch-container">
                <div class="player-main">
                    <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                        <iframe src="${embedUrl}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                    </div>
                    <div style="padding:15px 0;">
                        <h2>${video.snippet.title}</h2>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                            <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                                <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                <strong>${video.snippet.channelTitle}</strong>
                            </div>
                            <button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')">登録</button>
                        </div>
                    </div>
                </div>
                <div id="related-container" class="related-side"></div>
            </div>`;

        this.updateSubButton(video.snippet.channelId);
        Storage.addHistory({ 
            id: videoId, 
            title: video.snippet.title, 
            thumb: video.snippet.thumbnails.medium.url,
            channelId: video.snippet.channelId,
            channelTitle: video.snippet.channelTitle
        });
    },

    async openChannel(id, name, order = 'date') {
        this.showView();
        const data = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order: order, maxResults: 24 });
        this.currentList = data.items;
        
        document.getElementById('view-container').innerHTML = `
            <div class="channel-header" style="padding:20px; background:#1a1a1a; border-radius:12px; margin-bottom:20px; display:flex; align-items:center; gap:20px;">
                <img src="${this.channelIcons[id] || ''}" style="width:80px; height:80px; border-radius:50%;">
                <div>
                    <h2 style="margin:0;">${name}</h2>
                    <button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${id}', '${name}')" style="margin-top:10px;">登録</button>
                </div>
            </div>
            <div class="tabs" style="display:flex; gap:20px; margin-bottom:20px; padding:0 20px;">
                <span onclick="Actions.openChannel('${id}', '${name}', 'date')" style="cursor:pointer;">最新順</span>
                <span onclick="Actions.openChannel('${id}', '${name}', 'viewCount')" style="cursor:pointer;">人気順</span>
            </div>
            <div id="channel-grid"></div>
        `;
        this.updateSubButton(id);
        this.renderGrid(this.currentList, 'channel-grid');
    },

    showHistory() {
        this.isHome = false;
        const h = Storage.getHistory();
        this.currentList = h.map(x => ({ 
            id: x.id, 
            snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelId: x.channelId, channelTitle: x.channelTitle } 
        }));
        this.showView();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>視聴履歴</h2><div id="hist-grid"></div></div>`;
        this.renderGrid(this.currentList, 'hist-grid');
    },

    showSubs() {
        this.isHome = false;
        const s = Storage.getSubs();
        this.showView();
        const html = s.map(ch => `
            <div class="nav-item" style="background:#222; margin-bottom:10px; border-radius:8px;" onclick="Actions.openChannel('${ch.id}', '${ch.name}')">
                <img src="${this.channelIcons[ch.id] || ''}" style="width:30px; border-radius:50%;">
                <h3>${ch.name}</h3>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録チャンネル</h2>${html}</div>`;
    },

    handleSub(id, name) {
        Storage.toggleSub({ id, name });
        this.updateSubButton(id);
    },

    updateSubButton(id) {
        const b = document.getElementById('sub-btn');
        if (!b) return;
        const is = Storage.getSubs().some(x => x.id === id);
        b.innerText = is ? "登録済み" : "チャンネル登録";
        b.style.background = is ? "#333" : "#cc0000";
    },

    showView() {
        window.scrollTo(0, 0);
    }
};

window.onload = () => Actions.init();
