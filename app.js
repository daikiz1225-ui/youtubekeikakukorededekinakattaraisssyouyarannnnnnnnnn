/* app.js */
const Actions = {
    currentList: [],
    
    async search(q = document.getElementById('search-input').value) {
        if(!q) return;
        const data = await YT.fetchAPI('search', { q, part: 'snippet', type: 'video', maxResults: 20 });
        this.currentList = data.items;
        this.renderGrid(data.items);
    },

    // チャンネルページを開く
    async openChannel(id, name) {
        const view = document.getElementById('view-container');
        view.innerHTML = `
            <div class="ch-info">
                <div style="width:80px; height:80px; background:#444; border-radius:50%;"></div>
                <h1>${name}</h1>
                <button id="sub-btn" class="sub-btn" onclick="Actions.handleSub('${id}', '${name}')">登録</button>
            </div>
            <div class="sort-btns">
                <button onclick="Actions.loadChannelVideos('${id}', 'date')">新着順</button>
                <button onclick="Actions.loadChannelVideos('${id}', 'viewCount')">人気順</button>
            </div>
            <div id="ch-grid" class="grid"></div>
        `;
        this.loadChannelVideos(id, 'date');
    },

    async loadChannelVideos(channelId, order) {
        const data = await YT.fetchAPI('search', { channelId, order, part: 'snippet', type: 'video', maxResults: 20 });
        this.currentList = data.items;
        this.renderGrid(data.items, 'ch-grid');
    },

    handleSub(id, name) {
        const isAdded = Storage.toggleSub({ id, name });
        document.getElementById('sub-btn').innerText = isAdded ? "登録済み" : "登録";
        document.getElementById('sub-btn').classList.toggle('active', isAdded);
    },

    renderGrid(items, target = 'view-container') {
        const html = items.map((item, i) => `
            <div class="v-card" onclick="Actions.play(${i})">
                <img src="${item.snippet.thumbnails.high.url}">
                <h3>${item.snippet.title}</h3>
                <div style="color:#aaa; font-size:12px;" onclick="event.stopPropagation(); Actions.openChannel('${item.snippet.channelId}', '${item.snippet.channelTitle}')">${item.snippet.channelTitle}</div>
            </div>
        `).join('');
        document.getElementById(target).innerHTML = `<div class="grid">${html}</div>`;
    },

    play(index) {
        const video = this.currentList[index];
        Storage.addHistory({ id: video.id.videoId, title: video.snippet.title });
        
        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="player-box">
                        <iframe src="${YT.getEmbedUrl(video.id.videoId)}" allowfullscreen></iframe>
                    </div>
                    <h2>${video.snippet.title}</h2>
                </div>
                <div class="sidebar-area" id="side-list"></div>
            </div>
        `;
        // 関連動画（今のリストの残り）を表示
        const sideHtml = this.currentList.map((v, i) => i === index ? '' : `<div class="v-card" onclick="Actions.play(${i})"><img src="${v.snippet.thumbnails.medium.url}"><h4>${v.snippet.title}</h4></div>`).join('');
        document.getElementById('side-list').innerHTML = sideHtml;
    }
};

const Router = {
    goHome(clear) {
        if(clear) document.getElementById('search-input').value = "";
        document.getElementById('view-container').innerHTML = `<div class="grid" id="home-grid"></div>`;
    }
};
