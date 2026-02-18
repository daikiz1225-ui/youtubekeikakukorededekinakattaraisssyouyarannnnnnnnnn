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
    nextToken: "",
    currentChannelId: "",

    async search(q = document.getElementById('search-input').value, isMore = false) {
        if (!q) return;
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 24, pageToken: isMore ? this.nextToken : "" });
        this.nextToken = data.nextPageToken || "";
        if (isMore) this.currentList.push(...data.items); else { this.currentList = data.items; this.showView(); }
        this.renderGrid(this.currentList, 'view-container');
        document.getElementById('load-more').style.display = this.nextToken ? 'block' : 'none';
    },

    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        container.innerHTML = `<div class="grid">` + items.map((item, i) => {
            const videoId = item.id.videoId || (item.id.resourceId ? item.id.resourceId.videoId : "");
            return `
            <div class="v-card">
                <img src="${item.snippet.thumbnails.high.url}" onclick="Actions.play(${i})">
                <div class="v-info">
                    <div class="ch-icon" onclick="Actions.openChannel('${item.snippet.channelId}', '${item.snippet.channelTitle}')"></div>
                    <div class="v-text">
                        <h3 onclick="Actions.play(${i})">${item.snippet.title}</h3>
                        <p onclick="Actions.openChannel('${item.snippet.channelId}', '${item.snippet.channelTitle}')">${item.snippet.channelTitle}</p>
                    </div>
                </div>
            </div>`;
        }).join('') + `</div>`;
    },

    async play(index) {
        const video = this.currentList[index];
        const videoId = video.id.videoId || (video.id.resourceId ? video.id.resourceId.videoId : video.id);
        await YT.refreshEduKey();
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-box"><iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allowfullscreen></iframe></div>
                <div style="padding:20px;">
                    <h2>${video.snippet.title}</h2>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <p onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')" style="cursor:pointer; color:#aaa;">${video.snippet.channelTitle}</p>
                        <button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')">チャンネル登録</button>
                    </div>
                </div>
            </div>`;
        this.updateSubButton(video.snippet.channelId);
        Storage.addHistory({ id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url });
    },

    async openChannel(id, name, order = 'date', type = 'video') {
        this.currentChannelId = id;
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h1>${name}</h1>
                <div class="tabs">
                    <div class="tab ${type==='video'&&order==='date'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date')">最新順</div>
                    <div class="tab ${type==='video'&&order==='viewCount'?'active':''}" onclick="Actions.openChannel('${id}','${name}','viewCount')">人気順</div>
                    <div class="tab ${type==='playlist'?'active':''}" onclick="Actions.showPlaylists('${id}','${name}')">再生リスト</div>
                </div>
                <div id="ch-grid" class="grid">読み込み中...</div>
            </div>`;
        
        const endpoint = type === 'video' ? 'search' : 'playlists';
        const params = { channelId: id, part: 'snippet', maxResults: 30 };
        if (type === 'video') { params.type = 'video'; params.order = order; }
        
        const data = await YT.fetchAPI(endpoint, params);
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'ch-grid');
    },

    async showPlaylists(id, name) {
        this.openChannel(id, name, 'date', 'playlist');
    },

    showSubs() {
        this.showView();
        const s = Storage.getSubs();
        const container = document.getElementById('view-container');
        if (s.length === 0) { container.innerHTML = `<h2 style="text-align:center; padding:50px;">登録なし</h2>`; return; }
        container.innerHTML = `<div style="padding:20px;"><h1>登録チャンネル</h1>` + s.map(ch => `
            <div class="nav-item" style="background:#222; margin-bottom:10px;" onclick="Actions.openChannel('${ch.id}', '${ch.name}')">
                <h3>${ch.name}</h3>
            </div>`).join('') + `</div>`;
    },

    goHome(clear = false) {
        if (clear) document.getElementById('search-input').value = "";
        const h = Storage.getHistory();
        if (h.length > 0) {
            this.currentList = h.map(x => ({ id: { videoId: x.id }, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelId: "", channelTitle: "履歴" } }));
            this.renderGrid(this.currentList, 'view-container');
        } else { this.search("Education"); }
    },

    showHistory() { this.goHome(); },
    showView() { window.scrollTo(0,0); document.getElementById('main-content').scrollTo(0,0); },
    handleSub(id, name) { Storage.toggleSub({ id, name }); this.updateSubButton(id); },
    updateSubButton(id) {
        const b = document.getElementById('sub-btn');
        if (!b) return;
        const is = Storage.getSubs().some(x => x.id === id);
        b.innerText = is ? "登録済み" : "チャンネル登録";
        b.style.background = is ? "#333" : "#cc0000";
    },
    loadMore() { this.search(undefined, true); }
};

window.onload = () => Actions.goHome();
