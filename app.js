const YT = {
    keys: [
        "AIzaSyBfCvyZ_J9mJiMFNYB6WfcuLyvf9zDdcUU",
        "AIzaSyCgVn-JWHKT_z6EC73Z6Vlex0F_d-BP_fY",
        "AIzaSyBbqPhAbqoWDOurTt7hejQmwc6dAoZ5Iy0",
        "AIzaSyAWk9mmie23-khi8-nipv1jHJND__UtEWA",
        "AIzaSyBL38iyqeiaKHoKqhloSnhG590DfJ35vCE"
    ],
    currentEduKey: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",

    async refreshEduKey() {
        try {
            const res = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await res.json();
            if (data && data.key) this.currentEduKey = data.key;
        } catch (e) { console.error("Key refresh error"); }
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

    getEmbedUrl(id) {
        const params = new URLSearchParams({
            autoplay: 1, origin: "https://create.kahoot.it",
            embed_config: JSON.stringify({ enc: this.currentEduKey, hideTitle: true }),
            rel: 0, modestbranding: 1, enablejsapi: 1
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
    currentList: [], relatedList: [], nextToken: "", channelIcons: {},
    isHome: false, isShortsMode: false, currentShortIndex: 0,

    async init() {
        await YT.refreshEduKey();
        this.goHome();
        const input = document.getElementById('search-input');
        if(input) {
            input.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); this.search(); input.blur(); } };
        }
        if(document.getElementById('search-btn')) document.getElementById('search-btn').onclick = () => this.search();
    },

    async goHome() {
        this.isHome = true; this.isShortsMode = false;
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.processData(data);
    },

    async search(isMore = false) {
        const q = document.getElementById('search-input').value;
        if(!q) return;
        this.isHome = false;
        let params = { q: this.isShortsMode ? q + " #Shorts" : q, part: 'snippet', type: 'video', maxResults: 30, pageToken: isMore ? this.nextToken : "" };
        const data = await YT.fetchAPI('search', params);
        this.processData(data, isMore);
    },

    async processData(data, isMore = false) {
        this.nextToken = data.nextPageToken || "";
        const items = data.items || [];
        const chIds = [...new Set(items.map(i => i.snippet.channelId))].join(',');
        await this.fetchChannelIcons(chIds);
        if(isMore) this.currentList.push(...items); else this.currentList = items;
        this.renderGrid(this.currentList, 'view-container');
    },

    renderGrid(items, targetId, isPlaylist = false) {
        const container = document.getElementById(targetId);
        if(!container) return;
        container.innerHTML = `<div class="grid">` + items.map((item, i) => `
            <div class="v-card" onclick="${this.isShortsMode ? `Actions.playShort(${i})` : (isPlaylist ? `Actions.openPlaylist('${item.id}')` : `Actions.playFromList(${i})`)}">
                <div class="thumb-container" style="${this.isShortsMode ? 'aspect-ratio:9/16;' : ''}">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb" style="${this.isShortsMode ? 'aspect-ratio:9/16;' : ''}">
                    ${!this.isShortsMode ? `<img src="${this.channelIcons[item.snippet.channelId] || ''}" class="ch-icon-img">` : ''}
                </div>
                <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
            </div>`).join('') + `</div>`;
    },

    async play(video) {
        this.isShortsMode = false;
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        await YT.refreshEduKey();
        window.scrollTo(0,0);
        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="display:flex; gap:20px; padding:20px;">
                <div class="player-main" style="flex:3;">
                    <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                        <iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                    </div>
                    <div style="padding:15px 0;">
                        <h2>${video.snippet.title}</h2>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                                <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                <strong>${video.snippet.channelTitle}</strong>
                            </div>
                            <button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')">登録</button>
                        </div>
                    </div>
                </div>
                <div id="related-side" style="flex:1; min-width:300px;">
                    <p>関連動画</p>
                    <div id="related-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                    <button class="btn" onclick="Actions.loadMoreRelated()" style="width:100%; margin-top:10px;">もっと見る</button>
                </div>
            </div>`;
        this.updateSubButton(video.snippet.channelId);
        Storage.addHistory({id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url, channelId: video.snippet.channelId, channelTitle: video.snippet.channelTitle});
        this.currentPlayVideo = video;
        this.loadMoreRelated(true);
    },

    async loadMoreRelated(isNew = false) {
        const q = this.currentPlayVideo.snippet.title.substring(0,12);
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 20, pageToken: isNew ? "" : this.nextToken });
        this.nextToken = data.nextPageToken || "";
        this.relatedList = isNew ? data.items : [...this.relatedList, ...data.items];
        const html = data.items.map((v, i) => `
            <div class="side-card" style="display:flex; gap:10px; cursor:pointer;" onclick="Actions.playFromRelated(${isNew ? i : this.relatedList.length - data.items.length + i})">
                <img src="${v.snippet.thumbnails.medium.url}" style="width:120px; border-radius:8px;">
                <div class="side-text"><h4 style="font-size:13px; margin:0;">${v.snippet.title}</h4></div>
            </div>`).join('');
        const list = document.getElementById('related-list');
        if(isNew) list.innerHTML = html; else list.innerHTML += html;
    },

    async playShort(index) {
        this.currentShortIndex = index;
        const video = this.currentList[index];
        const videoId = video.id.videoId;
        await YT.refreshEduKey();
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container" id="shorts-swipe-zone" style="height:calc(100vh - 70px); background:#000; position:relative;">
                <iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allow="autoplay"></iframe>
                <div style="position:absolute; right:10px; bottom:100px; display:flex; flex-direction:column; gap:20px;">
                    <button class="s-btn" onclick="Actions.nextShort(-1)">▲</button>
                    <button class="s-btn" onclick="Actions.nextShort(1)">▼</button>
                </div>
            </div>`;
        this.setupSwipe();
    },

    setupSwipe() {
        const zone = document.getElementById('shorts-swipe-zone');
        let startY = 0;
        zone.ontouchstart = (e) => startY = e.touches[0].clientY;
        zone.ontouchend = (e) => {
            let diff = startY - e.changedTouches[0].clientY;
            if (Math.abs(diff) > 50) this.nextShort(diff > 0 ? 1 : -1);
        };
    },

    nextShort(dir) {
        let n = this.currentShortIndex + dir;
        if(n >= 0 && n < this.currentList.length) this.playShort(n);
    },

    async openChannel(id, name, type = 'video', order = 'date') {
        let endpoint = type === 'playlist' ? 'playlists' : 'search';
        let params = { channelId: id, part: 'snippet', maxResults: 30 };
        if(type === 'video') { params.type = 'video'; params.order = order; }
        const data = await YT.fetchAPI(endpoint, params);
        document.getElementById('view-container').innerHTML = `
            <div class="channel-header" style="padding:20px; background:#1a1a1a; display:flex; align-items:center; gap:20px;">
                <img src="${this.channelIcons[id] || ''}" style="width:80px; height:80px; border-radius:50%;">
                <div><h2>${name}</h2><button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${id}','${name}')">登録</button></div>
            </div>
            <div class="tabs" style="display:flex; gap:20px; padding:10px 20px; border-bottom:1px solid #333;">
                <span onclick="Actions.openChannel('${id}','${name}','video','date')" style="cursor:pointer; color:${order==='date'?'#fff':'#aaa'}">最新</span>
                <span onclick="Actions.openChannel('${id}','${name}','video','viewCount')" style="cursor:pointer; color:${order==='viewCount'?'#fff':'#aaa'}">人気</span>
                <span onclick="Actions.openChannel('${id}','${name}','playlist')" style="cursor:pointer; color:${type==='playlist'?'#fff':'#aaa'}">リスト</span>
            </div>
            <div id="ch-grid"></div>`;
        this.updateSubButton(id);
        this.renderGrid(data.items, 'ch-grid', type === 'playlist');
    },

    async showShortsFeed() {
        this.isShortsMode = true; window.scrollTo(0,0);
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 30 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'view-container');
    },

    showHistory() {
        this.isShortsMode = false;
        const h = Storage.getHistory();
        this.currentList = h.map(x => ({id:x.id, snippet:{title:x.title, thumbnails:{high:{url:x.thumb}}, channelId:x.channelId, channelTitle:x.channelTitle}}));
        this.renderGrid(this.currentList, 'view-container');
    },

    showSubs() {
        const s = Storage.getSubs();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録チャンネル</h2>` + s.map(ch => `
            <div class="nav-item" style="background:#222; margin-bottom:10px; border-radius:8px; padding:10px;" onclick="Actions.openChannel('${ch.id}', '${ch.name}')">
                <h3>${ch.name}</h3>
            </div>`).join('') + `</div>`;
    },

    playFromList(i) { this.play(this.currentList[i]); },
    playFromRelated(i) { this.play(this.relatedList[i]); },
    handleSub(id, name) { Storage.toggleSub({id, name}); this.updateSubButton(id); },
    updateSubButton(id) { const b = document.getElementById('sub-btn'); if(b) b.innerText = Storage.getSubs().some(x=>x.id===id) ? "登録済み" : "チャンネル登録"; },
    async fetchChannelIcons(ids) { if(!ids) return; const data = await YT.fetchAPI('channels', {id:ids, part:'snippet'}); if(data.items) data.items.forEach(ch => this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url); },
    showView() { window.scrollTo(0,0); }
};

window.onload = () => Actions.init();
