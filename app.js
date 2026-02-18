/**
 * app.js - 司令塔（iPad対応・自動更新連動版）
 */

const Storage = {
    getHistory() { return JSON.parse(localStorage.getItem('yt_history')) || []; },
    addHistory(video) {
        let history = this.getHistory();
        history = [video, ...history.filter(v => v.id !== video.id)].slice(0, 50);
        localStorage.setItem('yt_history', JSON.stringify(history));
    },
    getSubs() { return JSON.parse(localStorage.getItem('yt_subs')) || []; },
    toggleSub(channel) {
        let subs = this.getSubs();
        const exists = subs.find(s => s.id === channel.id);
        if (exists) subs = subs.filter(s => s.id !== channel.id);
        else subs.push(channel);
        localStorage.setItem('yt_subs', JSON.stringify(subs));
    }
};

const Actions = {
    currentList: [],
    currentQuery: "",
    nextToken: "",

    async search(q = document.getElementById('search-input').value, isMore = false) {
        if (!q) return;
        this.currentQuery = q;
        try {
            const data = await YT.fetchAPI('search', { 
                q: q, part: 'snippet', type: 'video', maxResults: 24,
                pageToken: isMore ? this.nextToken : ""
            });
            this.nextToken = data.nextPageToken || "";
            if (isMore) this.currentList.push(...data.items);
            else { this.currentList = data.items; this.showView(); }
            this.renderGrid(this.currentList, 'view-container');
            const moreBtn = document.getElementById('load-more');
            if (moreBtn) moreBtn.style.display = this.nextToken ? 'block' : 'none';
        } catch (e) { console.error(e); }
    },

    loadMore() { this.search(undefined, true); },

    showSubs() {
        this.showView();
        const subs = Storage.getSubs();
        const container = document.getElementById('view-container');
        if (subs.length === 0) {
            container.innerHTML = `<div style="padding:40px; text-align:center;"><h2>登録チャンネルなし</h2></div>`;
            return;
        }
        container.innerHTML = `<div style="padding:20px;"><h1>登録チャンネル</h1>` + subs.map(s => `
            <div class="nav-item" style="background:rgba(255,255,255,0.05); margin:10px 0; padding:20px; border-radius:12px; cursor:pointer;" onclick="Actions.openChannel('${s.id}', '${s.name}')">
                <h3 style="margin:0;">${s.name}</h3>
            </div>`).join('') + `</div>`;
        if(document.getElementById('load-more')) document.getElementById('load-more').style.display = 'none';
    },

    async openChannel(id, name) {
        this.showView();
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h1>${name}</h1><div id="ch-grid" class="grid"></div></div>`;
        const data = await YT.fetchAPI('search', { channelId: id, part: 'snippet', type: 'video', order: 'date', maxResults: 30 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'ch-grid');
    },

    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        if (!container) return;
        container.innerHTML = items.map((item, i) => `
            <div class="v-card" onclick="Actions.play(${i})">
                <img src="${item.snippet.thumbnails.high.url}">
                <div class="video-info-row"><h3>${item.snippet.title}</h3></div>
            </div>`).join('');
    },

    // 💡 再生直前にキーを取得する安定版ロジック
    async play(index) {
        const video = this.currentList[index];
        const videoId = video.id.videoId || (video.id.resourceId ? video.id.resourceId.videoId : video.id);
        this.showView();

        // サイトから最新キーを自動収集
        await YT.refreshEduKey();

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-box" style="aspect-ratio:16/9; width:100%; background:#000;">
                    <iframe src="${YT.getEmbedUrl(videoId)}" style="width:100%; height:100%; border:none;" allow="autoplay; fullscreen" allowfullscreen></iframe>
                </div>
                <div style="padding:20px;"><h2>${video.snippet.title}</h2></div>
            </div>`;
        
        Storage.addHistory({ id: videoId, title: video.snippet.title, channel: video.snippet.channelTitle, thumb: video.snippet.thumbnails.medium.url });
    },

    goHome(clear = false) {
        if (clear) document.getElementById('search-input').value = "";
        const history = Storage.getHistory();
        if (history.length > 0) {
            this.currentList = history.map(h => ({ id: h.id, snippet: { title: h.title, thumbnails: { high: { url: h.thumb } } } }));
            this.renderGrid(this.currentList, 'view-container');
        } else {
            this.search("Education");
        }
        if(document.getElementById('load-more')) document.getElementById('load-more').style.display = 'none';
    },

    showHistory() { this.goHome(false); },
    showView() { window.scrollTo(0,0); const m = document.querySelector('main'); if(m) m.scrollTo(0,0); },

    handleSub(id, name) { Storage.toggleSub({ id, name }); this.updateSubButton(id); },
    updateSubButton(id) {
        const b = document.getElementById('sub-btn');
        if (b) {
            const is = Storage.getSubs().some(s => s.id === id);
            b.innerText = is ? "登録済み" : "チャンネル登録";
            b.style.background = is ? "#333" : "#f00";
        }
    }
};

window.onload = () => { Actions.goHome(); };
