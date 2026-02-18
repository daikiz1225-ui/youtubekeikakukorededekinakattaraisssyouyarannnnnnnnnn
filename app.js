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
    channelIcons: {},

    async search(q = document.getElementById('search-input').value, isMore = false) {
        if (!q) return;
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 24, pageToken: isMore ? this.nextToken : "" });
        this.nextToken = data.nextPageToken || "";
        
        const chIds = [...new Set(data.items.map(i => i.snippet.channelId))].join(',');
        await this.fetchChannelIcons(chIds);

        if (isMore) this.currentList.push(...data.items); 
        else { this.currentList = data.items; this.showView(); }
        
        this.renderGrid(this.currentList, 'view-container');
        document.getElementById('load-more').style.display = this.nextToken ? 'block' : 'none';
    },

    async fetchChannelIcons(ids) {
        if (!ids) return;
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        data.items.forEach(ch => { this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url; });
    },

    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        container.innerHTML = `<div class="grid">` + items.map((item, i) => {
            const chId = item.snippet.channelId;
            const icon = this.channelIcons[chId] || '';
            return `
            <div class="v-card">
                <img src="${item.snippet.thumbnails.high.url}" onclick="Actions.play(${i})">
                <div class="v-info">
                    <img src="${icon}" class="ch-icon-img" onclick="Actions.openChannel('${chId}', '${item.snippet.channelTitle}')">
                    <div class="v-text">
                        <h3 onclick="Actions.play(${i})">${item.snippet.title}</h3>
                        <p onclick="Actions.openChannel('${chId}', '${item.snippet.channelTitle}')">${item.snippet.channelTitle}</p>
                    </div>
                </div>
            </div>`;
        }).join('') + `</div>`;
    },

    // 💡 再生画面を昨日のシンプル版（+登録ボタン）に固定！
    async play(index) {
        const video = this.currentList[index];
        const videoId = video.id.videoId || (video.id.resourceId ? video.id.resourceId.videoId : video.id);
        await YT.refreshEduKey();
        this.showView();
        
        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-box" style="aspect-ratio:16/9; width:100%; background:#000;">
                    <iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allow="autoplay; fullscreen" allowfullscreen></iframe>
                </div>
                <div style="padding:20px;">
                    <h2 style="font-size:18px;">${video.snippet.title}</h2>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <p style="margin:0; color:#aaa; cursor:pointer;" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">${video.snippet.channelTitle}</p>
                        <button class="sub-btn" id="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')">チャンネル登録</button>
                    </div>
                </div>
            </div>`;
        
        this.updateSubButton(video.snippet.channelId);
        Storage.addHistory({ id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url, channelId: video.snippet.channelId, channelTitle: video.snippet.channelTitle });
        document.getElementById('load-more').style.display = 'none';
    },

    async openChannel(id, name, order = 'date', type = 'video') {
        this.showView();
        await this.fetchChannelIcons(id);
        const icon = this.channelIcons[id] || '';
        
        document.getElementById('view-container').innerHTML = `
            <div class="channel-header">
                <img src="${icon}">
                <div style="flex:1;">
                    <h2 style="margin:0;">${name}</h2>
                    <button class="sub-btn" id="sub-btn" style="margin-top:8px;" onclick="Actions.handleSub('${id}', '${name}')">チャンネル登録</button>
                </div>
            </div>
            <div class="tabs">
                <div class="tab ${type==='video'&&order==='date'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date')">最新</div>
                <div class="tab ${type==='video'&&order==='viewCount'?'active':''}" onclick="Actions.openChannel('${id}','${name}','viewCount')">人気</div>
                <div class="tab ${type==='playlist'?'active':''}" onclick="Actions.openChannel('${id}','${name}','date','playlist')">再生リスト</div>
            </div>
            <div id="ch-grid"></div>`;
        
        this.updateSubButton(id);
        const params = { channelId: id, part: 'snippet', maxResults: 30 };
        if (type === 'video') { params.type = 'video'; params.order = order; }
        const data = await YT.fetchAPI(type === 'video' ? 'search' : 'playlists', params);
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'ch-grid');
    },

    showHistory() {
        this.showView();
        const h = Storage.getHistory();
        if (h.length === 0) { document.getElementById('view-container').innerHTML = `<h2 style="text-align:center; padding:50px;">履歴なし</h2>`; return; }
        this.currentList = h.map(x => ({ id: { videoId: x.id }, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelId: x.channelId, channelTitle: x.channelTitle } }));
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>視聴履歴</h1><div id="hist-grid"></div></div>`;
        this.renderGrid(this.currentList, 'hist-grid');
        document.getElementById('load-more').style.display = 'none';
    },

    showSubs() {
        this.showView();
        const s = Storage.getSubs();
        const container = document.getElementById('view-container');
        if (s.length === 0) { container.innerHTML = `<h2 style="text-align:center; padding:50px;">登録なし</h2>`; return; }
        container.innerHTML = `<div style="padding:20px;"><h1>登録チャンネル</h1>` + s.map(ch => `
            <div class="nav-item" style="background:#222; margin-bottom:10px; justify-content:space-between;" onclick="Actions.openChannel('${ch.id}', '${ch.name}')">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${this.channelIcons[ch.id] || ''}" style="width:30px; height:30px; border-radius:50%;">
                    <h3>${ch.name}</h3>
                </div>
                <span>➔</span>
            </div>`).join('') + `</div>`;
    },

    goHome(clear = false) {
        if (clear) document.getElementById('search-input').value = "";
        this.search("Education"); 
    },

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
