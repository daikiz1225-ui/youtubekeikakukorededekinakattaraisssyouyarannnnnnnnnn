/**
 * app.js - 司令塔（再生リスト・フル機能版）
 */

const Actions = {
    currentList: [],      
    currentQuery: "",     
    currentMode: 'video', 
    nextToken: "",        

    // --- 1. 検索実行 ---
    async search(q = document.getElementById('search-input').value, isMore = false) {
        if (!q) return;
        this.currentQuery = q;
        const searchQuery = this.currentMode === 'shorts' ? `${q} #shorts` : q;
        
        try {
            const data = await YT.fetchAPI('search', { 
                q: searchQuery, 
                part: 'snippet', 
                type: 'video', 
                maxResults: 24,
                pageToken: isMore ? this.nextToken : ""
            });

            this.nextToken = data.nextPageToken || "";
            if (isMore) this.currentList.push(...data.items);
            else {
                this.currentList = data.items;
                this.showView('grid-view');
            }

            this.renderGrid(this.currentList, 'view-container');
            const moreBtn = document.getElementById('load-more');
            if (moreBtn) moreBtn.style.display = this.nextToken ? 'block' : 'none';
        } catch (e) { console.error(e); }
    },

    loadMore() { this.search(this.currentQuery, true); },

    // --- 2. チャンネルページ (再生リストボタン追加) ---
    async openChannel(id, name) {
        this.showView();
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <div class="ch-info">
                    <div class="ch-icon-small" style="width:80px; height:80px;">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128">
                    </div>
                    <div>
                        <h1 style="margin:0;">${name}</h1>
                        <button id="sub-btn" class="sub-btn" onclick="Actions.handleSub('${id}', '${name}')">登録</button>
                    </div>
                </div>
                <div class="sort-btns">
                    <button onclick="Actions.loadChannelVideos('${id}', 'date')">動画</button>
                    <button onclick="Actions.loadChannelPlaylists('${id}')">再生リスト</button>
                </div>
                <div id="ch-grid" class="grid">読み込み中...</div>
            </div>`;
        this.updateSubButton(id);
        this.loadChannelVideos(id, 'date');
    },

    // 💡 YouTube上の再生リスト一覧を取得
    async loadChannelPlaylists(channelId) {
        document.getElementById('ch-grid').innerHTML = "リストを取得中...";
        try {
            const data = await YT.fetchAPI('playlists', { 
                channelId, 
                part: 'snippet', 
                maxResults: 20 
            });
            
            const container = document.getElementById('ch-grid');
            container.innerHTML = data.items.map(list => `
                <div class="v-card" onclick="Actions.loadPlaylistItems('${list.id}')">
                    <div style="position:relative;">
                        <img src="${list.snippet.thumbnails.high.url}">
                        <div style="position:absolute; bottom:0; right:0; background:rgba(0,0,0,0.8); padding:5px 10px; font-size:12px;">📁 再生リスト</div>
                    </div>
                    <h3>${list.snippet.title}</h3>
                </div>
            `).join('');
        } catch (e) { console.error(e); }
    },

    // 💡 再生リスト内の動画一覧を取得
    async loadPlaylistItems(playlistId) {
        document.getElementById('ch-grid').innerHTML = "動画を取得中...";
        try {
            const data = await YT.fetchAPI('playlistItems', { 
                playlistId, 
                part: 'snippet', 
                maxResults: 50 
            });
            this.currentList = data.items.map(item => ({
                id: { videoId: item.snippet.resourceId.videoId },
                snippet: item.snippet
            }));
            this.renderGrid(this.currentList, 'ch-grid');
        } catch (e) { console.error(e); }
    },

    async loadChannelVideos(channelId, order) {
        const data = await YT.fetchAPI('search', { channelId, order, part: 'snippet', type: 'video', maxResults: 24 });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'ch-grid');
    },

    // --- 3. グリッドレンダリング ---
    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        if (!container) return;
        container.innerHTML = items.map((item, i) => {
            const videoId = item.id.videoId || item.id;
            const title = item.snippet.title;
            const chName = item.snippet.channelTitle;
            const chId = item.snippet.channelId;
            const thumb = item.snippet.thumbnails.high.url;
            return `
                <div class="v-card" onclick="Actions.play(${i})">
                    <img src="${thumb}">
                    <div class="video-info-row">
                        <div class="ch-icon-small" onclick="event.stopPropagation(); Actions.openChannel('${chId}', '${chName}')">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(chName)}&background=random">
                        </div>
                        <div style="flex:1;">
                            <h3>${title}</h3>
                            <div class="channel-link">${chName}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // --- 4. 再生処理 ---
    play(index) {
        const video = this.currentList[index];
        const videoId = video.id.videoId || (video.id.resourceId ? video.id.resourceId.videoId : video.id);
        const title = video.snippet.title;
        const chName = video.snippet.channelTitle;
        const chId = video.snippet.channelId;

        Storage.addHistory({ id: videoId, title: title, channel: chName, thumb: video.snippet.thumbnails.medium.url });

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="player-box"><iframe src="${YT.getEmbedUrl(videoId)}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
                    <div class="video-info-row" style="margin-top:20px;">
                        <div class="ch-icon-small" style="width:48px; height:48px;" onclick="Actions.openChannel('${chId}', '${chName}')">
                             <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(chName)}&background=random">
                        </div>
                        <div>
                            <h2 style="margin:0; font-size:20px;">${title}</h2>
                            <div class="channel-link" style="font-size:16px;">${chName}</div>
                        </div>
                    </div>
                </div>
                <div class="sidebar-area" id="side-list"></div>
            </div>`;

        const sideContainer = document.getElementById('side-list');
        sideContainer.innerHTML = `<h3>次の動画</h3>` + this.currentList.slice(0, 15).map((v, i) => {
            if (i === index) return '';
            return `
                <div class="v-card" style="flex-direction:row; gap:10px; margin-bottom:12px;" onclick="Actions.play(${i})">
                    <img src="${v.snippet.thumbnails.medium.url}" style="width:140px; height:80px;">
                    <div style="flex:1;"><h4 style="margin:0; font-size:13px;">${v.snippet.title}</h4></div>
                </div>`;
        }).join('');
        window.scrollTo(0, 0);
    },

    // --- 5. ナビゲーション ---
    goHome(clear = false) {
        if (clear) document.getElementById('search-input').value = "";
        const history = Storage.getHistory();
        if (history.length > 0) {
            this.currentList = history.map(h => ({ id: h.id, snippet: { title: h.title, channelTitle: h.channel, thumbnails: { high: { url: h.thumb } } } }));
            this.renderGrid(this.currentList, 'view-container');
        } else {
            document.getElementById('view-container').innerHTML = "<div style='text-align:center; margin-top:100px;'><h1>YouTube Education</h1><p>検索して動画を探そう</p></div>";
        }
        document.getElementById('load-more').style.display = 'none';
    },

    showHistory() { this.goHome(false); },

    showSubs() {
        const subs = Storage.getSubs();
        if (subs.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2 style='padding:20px;'>登録チャンネルなし</h2>";
            return;
        }
        const html = subs.map(s => `
            <div class="nav-item" style="background:var(--hover-bg); margin-bottom:8px; padding:15px;" onclick="Actions.openChannel('${s.id}', '${s.name}')">
                <div class="ch-icon-small"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random"></div>
                <span>${s.name}</span>
            </div>`).join('');
        document.getElementById('view-container').innerHTML = `<div style="padding:20px;"><h2>登録中のチャンネル</h2>${html}</div>`;
    },

    showView() { window.scrollTo(0,0); },

    handleSub(id, name) {
        const isAdded = Storage.toggleSub({ id, name });
        this.updateSubButton(id);
        this.updateSidebarSubs();
    },

    updateSubButton(id) {
        const btn = document.getElementById('sub-btn');
        if (btn) {
            const isSubbed = Storage.getSubs().some(s => s.id === id);
            btn.innerText = isSubbed ? "登録済み" : "チャンネル登録";
            btn.classList.toggle('active', isSubbed);
        }
    },

    updateSidebarSubs() {
        const list = document.getElementById('sub-sidebar-list');
        if (!list) return;
        const subs = Storage.getSubs();
        list.innerHTML = `<div class="nav-sep"></div>` + subs.slice(0, 10).map(s => `
            <div class="nav-item" onclick="Actions.openChannel('${s.id}', '${s.name}')">
                <div class="ch-icon-small" style="width:24px; height:24px;"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random"></div>
                <span style="font-size:12px;">${s.name}</span>
            </div>`).join('');
    }
};

window.onload = () => {
    Actions.updateSidebarSubs();
    Actions.goHome();
};
