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
        const e = s.find(x => x.id === c.id);
        if (e) s = s.filter(x => x.id !== c.id); else s.push(c);
        localStorage.setItem('yt_subs', JSON.stringify(s));
    }
};

const Actions = {
    currentList: [],
    nextToken: "",

    async search(q = document.getElementById('search-input').value, isMore = false) {
        if (!q) return;
        try {
            const data = await YT.fetchAPI('search', { q: q, part: 'snippet', type: 'video', maxResults: 24, pageToken: isMore ? this.nextToken : "" });
            this.nextToken = data.nextPageToken || "";
            if (isMore) this.currentList.push(...data.items);
            else { this.currentList = data.items; this.showView(); }
            this.renderGrid(this.currentList, 'view-container');
            document.getElementById('load-more').style.display = this.nextToken ? 'block' : 'none';
        } catch (e) { console.error(e); }
    },

    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        if(!container) return;
        container.innerHTML = items.map((item, i) => `
            <div class="v-card" onclick="Actions.play(${i})">
                <img src="${item.snippet.thumbnails.high.url}">
                <div class="video-info-row"><h3>${item.snippet.title}</h3></div>
            </div>`).join('');
    },

    async play(index) {
        const video = this.currentList[index];
        const videoId = video.id.videoId || (video.id.resourceId ? video.id.resourceId.videoId : video.id);
        this.showView();
        await YT.refreshEduKey();
        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-box" style="aspect-ratio:16/9; width:100%; background:#000;">
                    <iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allow="autoplay; fullscreen" allowfullscreen></iframe>
                </div>
                <div style="padding:20px;">
                    <h2>${video.snippet.title}</h2>
                    <button class="sub-btn" onclick="Actions.handleSub('${video.snippet.channelId}', '${video.snippet.channelTitle}')" id="sub-btn">チャンネル登録</button>
                </div>
            </div>`;
        this.updateSubButton(video.snippet.channelId);
        Storage.addHistory({ id: videoId, title: video.snippet.title, thumb: video.snippet.thumbnails.medium.url });
    },

    showSubs() {
        this.showView();
        const s = Storage.getSubs();
        const container = document.getElementById('view-container');
        if (s.length === 0) {
            container.innerHTML = `<div style="padding:40px; text-align:center;"><h2>登録チャンネルなし</h2></div>`;
            return;
        }
        container.innerHTML = `<div style="padding:20px;"><h1>登録チャンネル</h1>` + s.map(ch => `
            <div class="nav-item" style="background:rgba(255,255,255,0.05); margin:10px 0; padding:15px; border-radius:10px; cursor:pointer;" onclick="Actions.openChannel('${ch.id}', '${ch.name}')">
                <h3>${ch.name}</h3>
            </div>`).join('') + `</div>`;
        document.getElementById('load-more').style.display = 'none';
    },

    async openChannel(id, name) {
        this.showView();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>${name}</h1><div id="ch-grid" class="grid">読み込み中...</div></div>`;
        const data = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order: 'date', maxResults: 30 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'ch-grid');
    },

    goHome(clear = false) {
        if (clear) document.getElementById('search-input').value = "";
        const h = Storage.getHistory();
        if (h.length > 0) {
            this.currentList = h.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } } } }));
            this.renderGrid(this.currentList, 'view-container');
        } else { this.search("Education"); }
        document.getElementById('load-more').style.display = 'none';
    },

    showHistory() { this.goHome(false); },
    showView() { window.scrollTo(0,0); },
    handleSub(id, name) { Storage.toggleSub({ id, name }); this.updateSubButton(id); },
    updateSubButton(id) {
        const b = document.getElementById('sub-btn');
        if (b) {
            const is = Storage.getSubs().some(x => x.id === id);
            b.innerText = is ? "登録済み" : "チャンネル登録";
            b.style.background = is ? "#333" : "#f00";
        }
    },
    loadMore() { this.search(undefined, true); }
};

window.onload = () => { Actions.goHome(); };
