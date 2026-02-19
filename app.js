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
    currentList: [], relatedList: [], nextToken: "", channelIcons: {}, currentPlayVideo: null,

    async init() {
        await YT.refreshEduKey();
        this.goHome();
        const searchInput = document.getElementById('search-input');
        if(searchInput) {
            searchInput.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); this.search(); searchInput.blur(); } };
        }
        if(document.getElementById('search-btn')) document.getElementById('search-btn').onclick = () => this.search();
    },

    async goHome() {
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'view-container');
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if(!q) return;
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 30 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'view-container');
    },

    async play(video) {
        this.currentPlayVideo = video;
        const videoId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.id.resourceId?.videoId);
        await YT.refreshEduKey();
        
        document.getElementById('view-container').innerHTML = `
            <div class="watch-container" style="display:flex; gap:20px; padding:20px;">
                <div class="player-main" style="flex:3;">
                    <div style="aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden;">
                        <iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
                    </div>
                    <h2 style="margin-top:15px;">${video.snippet.title}</h2>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:10px; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                        <img src="${this.channelIcons[video.snippet.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                        <strong>${video.snippet.channelTitle}</strong>
                    </div>
                </div>
                <div id="related-side" style="flex:1; min-width:300px; display:flex; flex-direction:column; gap:10px;">
                    <p style="font-weight:bold;">関連動画</p>
                    <div id="related-list"></div>
                    <button class="btn" id="load-more-related" onclick="Actions.loadMoreRelated()" style="width:100%; margin-top:10px;">もっと読み込む</button>
                </div>
            </div>`;
        
        Storage.addHistory({id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url, channelId: video.snippet.channelId, channelTitle: video.snippet.channelTitle});
        this.loadMoreRelated(true);
    },

    async loadMoreRelated(isNew = false) {
        const query = this.currentPlayVideo.snippet.title.substring(0, 15);
        const data = await YT.fetchAPI('search', { q: query, part: 'snippet', type: 'video', maxResults: 20, pageToken: isNew ? "" : this.nextToken });
        this.nextToken = data.nextPageToken || "";
        this.relatedList = isNew ? data.items : [...this.relatedList, ...data.items];
        
        const html = data.items.map((v, i) => `
            <div class="side-card" style="display:flex; gap:10px; cursor:pointer;" onclick="Actions.playFromRelated(${isNew ? i : this.relatedList.length - data.items.length + i})">
                <img src="${v.snippet.thumbnails.medium.url}" style="width:120px; border-radius:8px;">
                <div class="side-text"><h4 style="font-size:13px; margin:0;">${v.snippet.title}</h4><p style="font-size:11px; color:#aaa;">${v.snippet.channelTitle}</p></div>
            </div>`).join('');
        
        const listContainer = document.getElementById('related-list');
        if(isNew) listContainer.innerHTML = html; else listContainer.innerHTML += html;
    },

    playFromRelated(i) { this.play(this.relatedList[i]); },

    async openChannel(id, name, type = 'video') {
        window.scrollTo(0,0);
        let endpoint = type === 'playlist' ? 'playlists' : 'search';
        let params = { channelId: id, part: 'snippet', maxResults: 30 };
        if (type === 'video') params.type = 'video';
        
        const data = await YT.fetchAPI(endpoint, params);
        
        document.getElementById('view-container').innerHTML = `
            <div class="channel-header" style="padding:20px; background:#1a1a1a; display:flex; align-items:center; gap:20px;">
                <img src="${this.channelIcons[id] || ''}" style="width:80px; height:80px; border-radius:50%;">
                <h2>${name}</h2>
            </div>
            <div class="tabs" style="display:flex; gap:20px; padding:10px 20px; border-bottom:1px solid #333;">
                <span onclick="Actions.openChannel('${id}', '${name}', 'video')" style="cursor:pointer; color:${type==='video'?'#fff':'#aaa'}">動画</span>
                <span onclick="Actions.openChannel('${id}', '${name}', 'playlist')" style="cursor:pointer; color:${type==='playlist'?'#fff':'#aaa'}">再生リスト</span>
            </div>
            <div id="channel-grid" class="grid"></div>`;
        
        this.renderGrid(data.items, 'channel-grid', type === 'playlist');
    },

    renderGrid(items, targetId, isPlaylist = false) {
        if(!items) return;
        const chIds = [...new Set(items.map(i => i.snippet.channelId))].filter(id => !this.channelIcons[id]).join(',');
        if(chIds) this.fetchChannelIcons(chIds);

        document.getElementById(targetId).innerHTML = items.map((item, i) => `
            <div class="v-card" onclick="${isPlaylist ? `Actions.openPlaylist('${item.id}')` : `Actions.playFromCurrent(${i})`}">
                <div class="thumb-container">
                    <img src="${item.snippet.thumbnails.high.url}" class="main-thumb">
                    ${isPlaylist ? '<div style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.8); padding:2px 5px; font-size:10px;">📁 再生リスト</div>' : ''}
                </div>
                <div class="v-text"><h3>${item.snippet.title}</h3><p>${item.snippet.channelTitle}</p></div>
            </div>`).join('');
    },

    async openPlaylist(listId) {
        const data = await YT.fetchAPI('playlistItems', { playlistId: listId, part: 'snippet', maxResults: 50 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'view-container');
    },

    playFromCurrent(i) { this.play(this.currentList[i]); },
    async fetchChannelIcons(ids) {
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if(data.items) data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
    }
};

window.onload = () => Actions.init();
