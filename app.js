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
    isShortsMode: false, currentShortIndex: 0, currentPlayVideo: null,

    async init() {
        this.renderSidebar();
        await YT.refreshEduKey();
        this.goHome();
        
        const input = document.getElementById('search-input');
        if(input) {
            input.onkeydown = (e) => { 
                if(e.key === 'Enter') { 
                    e.preventDefault(); 
                    this.search(); 
                    input.blur(); 
                } 
            };
        }
        if(document.getElementById('search-btn')) {
            document.getElementById('search-btn').onclick = () => this.search();
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
        this.isShortsMode = false;
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid(this.currentList, 'view-container');
    },

    async search(isMore = false) {
        const q = document.getElementById('search-input').value;
        if(!q) return;
        
        let query = this.isShortsMode ? q + " #Shorts" : q;
        let params = { q: query, part: 'snippet', type: 'video', maxResults: 30, pageToken: isMore ? this.nextToken : "" };
        
        const data = await YT.fetchAPI('search', params);
        this.nextToken = data.nextPageToken || "";
        if(isMore) this.currentList.push(...data.items); else this.currentList = data.items;
        this.renderGrid(this.currentList, 'view-container');
    },

    async fetchChannelIcons(ids) {
        if(!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if(data.items) data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
    },

    async renderGrid(items, targetId, isPlaylist = false) {
        const container = document.getElementById(targetId);
        if(!container) return;
        window.scrollTo(0,0);

        const chIds = [...new Set(items.map(i => i.snippet.channelId))].filter(id => !this.channelIcons[id]).join(',');
        await this.fetchChannelIcons(chIds);

        const html = items.map((item, i) => `
            <div class="v-card" onclick="${this.isShortsMode ? `Actions.playShort(${i})` : (isPlaylist ? `Actions.openPlaylist('${item.id}')` : `Actions.playFromList(${i})`)}">
                <div class="thumb-container" style="${this.isShortsMode ? 'aspect-ratio:9/16;' : ''}">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb" style="${this.isShortsMode ? 'aspect-ratio:9/16; object-fit:cover;' : ''}">
                    ${!this.isShortsMode ? `<img src="${this.channelIcons[item.snippet.channelId] || ''}" class="ch-icon-img">` : ''}
                </div>
                <div class="v-text">
                    <h3 style="font-size:14px; margin:8px 0;">${item.snippet.title}</h3>
                    <p style="font-size:12px; color:#aaa;">${item.snippet.channelTitle}</p>
                </div>
            </div>`).join('');
        container.innerHTML = `<div class="grid">${html}</div>`;
    },

    playFromList(i) { this.play(this.currentList[i]); },
    playFromRelated(i) { this.play(this.relatedList[i]); },

    async play(video) {
        if(!video) return;
        this.isShortsMode = false;
        this.currentPlayVideo = video;
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        await YT.refreshEduKey();
        window.scrollTo(0,0);

        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="display:flex; gap:20px; padding:20px; flex-wrap:wrap;">
                <div class="player-main" style="flex:3; min-width:360px;">
                    <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                        <iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                    </div>
                    <div style="padding:15px 0;">
                        <h2 style="font-size:18px;">${video.snippet.title}</h2>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                            <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                                <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                <strong>${video.snippet.channelTitle}</strong>
                            </div>
                            <button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')">登録</button>
                        </div>
                    </div>
                </div>
                <div id="related-side" style="flex:1; min-width:300px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <p style="font-weight:bold; margin:0;">関連動画</p>
                        <button onclick="Actions.loadMoreRelated()" style="background:none; border:none; color:#3ea6ff; cursor:pointer; font-weight:bold;">もっと見る</button>
                    </div>
                    <div id="related-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                </div>
            </div>`;

        this.updateSubButton(video.snippet.channelId);
        Storage.addHistory({ id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url, channelId: video.snippet.channelId, channelTitle: video.snippet.channelTitle });
        this.loadMoreRelated(true);
    },

    async loadMoreRelated(isNew = false) {
        const q = this.currentPlayVideo.snippet.title.substring(0, 15);
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 20, pageToken: isNew ? "" : this.nextToken });
        this.nextToken = data.nextPageToken || "";
        if(isNew) this.relatedList = data.items; else this.relatedList.push(...data.items);

        const html = data.items.map((v, i) => {
            const index = isNew ? i : (this.relatedList.length - data.items.length + i);
            return `
            <div class="side-card" style="display:flex; gap:10px; cursor:pointer;" onclick="Actions.playFromRelated(${index})">
                <img src="${v.snippet.thumbnails.medium.url}" style="width:120px; border-radius:8px; aspect-ratio:16/9; object-fit:cover;">
                <div class="side-text"><h4 style="font-size:13px; margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${v.snippet.title}</h4></div>
            </div>`;
        }).join('');
        const listDiv = document.getElementById('related-list');
        if(isNew) listDiv.innerHTML = html; else listDiv.innerHTML += html;
    },

    async showShortsFeed() {
        this.isShortsMode = true;
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', maxResults: 30 });
        this.currentList = data.items || [];
        this.renderGrid(this.currentList, 'view-container');
    },

    async playShort(index) {
        this.currentShortIndex = index;
        const video = this.currentList[index];
        const videoId = video.id.videoId;
        const chId = video.snippet.channelId;
        await YT.refreshEduKey();
        
        document.getElementById('view-container').innerHTML = `
            <div class="shorts-container" id="shorts-swipe-zone" style="height:calc(100vh - 70px); background:#000; position:relative; display:flex; justify-content:center; overflow:hidden;">
                <div style="height:100%; aspect-ratio:9/16; background:#111;">
                    <iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allow="autoplay"></iframe>
                </div>
                <div style="position:absolute; bottom:40px; left:20px; right:80px; z-index:10; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.8);">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; cursor:pointer;" onclick="Actions.openChannel('${chId}', '${video.snippet.channelTitle}')">
                        <img src="${this.channelIcons[chId] || ''}" style="width:44px; height:44px; border-radius:50%; border:2px solid #fff;">
                        <span style="font-weight:bold; font-size:16px;">@${video.snippet.channelTitle}</span>
                    </div>
                    <h3 style="font-size:15px; font-weight:normal; margin:0; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${video.snippet.title}</h3>
                </div>
                <div style="position:absolute; right:20px; bottom:100px; display:flex; flex-direction:column; gap:20px; z-index:100;">
                    <button class="s-btn" onclick="Actions.nextShort(-1)" style="padding:15px; border-radius:50%; background:rgba(51,51,51,0.8); color:#fff; border:none; font-size:18px;">▲</button>
                    <button class="s-btn" onclick="Actions.nextShort(1)" style="padding:15px; border-radius:50%; background:rgba(51,51,51,0.8); color:#fff; border:none; font-size:18px;">▼</button>
                </div>
            </div>`;
        this.setupSwipe();
        Storage.addHistory({ id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url, channelId: chId, channelTitle: video.snippet.channelTitle });
    },

    setupSwipe() {
        const zone = document.getElementById('shorts-swipe-zone');
        let startY = 0;
        zone.ontouchstart = (e) => startY = e.touches[0].clientY;
        zone.ontouchend = (e) => {
            let diff = startY - e.changedTouches[0].clientY;
            if (Math.abs(diff) > 60) this.nextShort(diff > 0 ? 1 : -1);
        };
    },

    nextShort(dir) {
        let n = this.currentShortIndex + dir;
        if(n >= 0 && n < this.currentList.length) this.playShort(n);
    },

    async openChannel(id, name, type = 'video', order = 'date') {
        this.isShortsMode = false;
        let endpoint = type === 'playlist' ? 'playlists' : 'search';
        let params = { channelId: id, part: 'snippet', maxResults: 30 };
        if(type === 'video') { params.type = 'video'; params.order = order; }
        const data = await YT.fetchAPI(endpoint, params);
        this.currentList = data.items || [];

        document.getElementById('view-container').innerHTML = `
            <div class="channel-header" style="padding:30px 20px; background:#1a1a1a; display:flex; align-items:center; gap:20px;">
                <img src="${this.channelIcons[id] || ''}" style="width:80px; height:80px; border-radius:50%;">
                <div><h2 style="margin:0;">${name}</h2><button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${id}','${name}')" style="margin-top:10px;">登録</button></div>
            </div>
            <div class="tabs" style="display:flex; gap:30px; padding:15px 20px; border-bottom:1px solid #333; background:#0f0f0f; position:sticky; top:0; z-index:10;">
                <span onclick="Actions.openChannel('${id}','${name}','video','date')" style="cursor:pointer; color:${type==='video'&&order==='date'?'#fff':'#aaa'}">最新</span>
                <span onclick="Actions.openChannel('${id}','${name}','video','viewCount')" style="cursor:pointer; color:${order==='viewCount'?'#fff':'#aaa'}">人気</span>
                <span onclick="Actions.openChannel('${id}','${name}','playlist')" style="cursor:pointer; color:${type==='playlist'?'#fff':'#aaa'}">リスト</span>
            </div>
            <div id="ch-grid" style="padding:20px;"></div>`;
        this.updateSubButton(id);
        this.renderGrid(this.currentList, 'ch-grid', type === 'playlist');
    },

    async openPlaylist(listId) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: listId, part: 'snippet', maxResults: 50 });
        this.currentList = data.items || [];
        this.renderGrid(this.currentList, 'view-container');
    },

    showHistory() {
        this.isShortsMode = false;
        const h = Storage.getHistory();
        this.currentList = h.map(x => ({id: {videoId: x.id}, snippet: {title: x.title, thumbnails: {high: {url: x.thumb}}, channelId: x.channelId, channelTitle: x.channelTitle}}));
        this.renderGrid(this.currentList, 'view-container');
    },

    showSubs() {
        this.isShortsMode = false;
        const s = Storage.getSubs();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録中のチャンネル</h2><div id="subs-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:15px; margin-top:20px;"></div></div>`;
        document.getElementById('subs-list').innerHTML = s.map(ch => `
            <div class="nav-item" style="background:#222; border-radius:12px; padding:15px; text-align:center; cursor:pointer;" onclick="Actions.openChannel('${ch.id}', '${ch.name}')">
                <img src="${this.channelIcons[ch.id] || ''}" style="width:60px; height:60px; border-radius:50%; margin-bottom:10px;">
                <h3 style="font-size:14px;">${ch.name}</h3>
            </div>`).join('');
    },

    handleSub(id, name) { Storage.toggleSub({id, name}); this.updateSubButton(id); },
    updateSubButton(id) {
        const b = document.getElementById('sub-btn');
        if(!b) return;
        const is = Storage.getSubs().some(x => x.id === id);
        b.innerText = is ? "登録済み" : "チャンネル登録";
        b.style.background = is ? "#333" : "#cc0000";
    }
};

window.onload = () => Actions.init();
