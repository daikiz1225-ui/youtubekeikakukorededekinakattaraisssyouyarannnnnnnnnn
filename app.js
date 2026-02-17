/**
 * app.js - 司令塔（完全版）
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
        
        // モードによるフィルタリング
        const searchQuery = this.currentMode === 'shorts' ? `${q} #shorts` : `${q} -#shorts -shorts`;
        
        try {
            const data = await YT.fetchAPI('search', { 
                q: searchQuery, 
                part: 'snippet', 
                type: 'video', 
                maxResults: 24,
                videoDuration: this.currentMode === 'shorts' ? 'short' : 'any',
                pageToken: isMore ? this.nextToken : ""
            });

            this.nextToken = data.nextPageToken || "";
            if (isMore) {
                this.currentList.push(...data.items);
            } else {
                this.currentList = data.items;
                this.showView();
            }

            this.renderGrid(this.currentList, 'view-container');
            
            // 「さらに読み込む」ボタンの表示制御
            const moreBtn = document.getElementById('load-more');
            if (moreBtn) moreBtn.style.display = this.nextToken ? 'block' : 'none';
        } catch (e) {
            if (e.message !== "ALL_KEYS_EXHAUSTED") console.error("Search Error:", e);
        }
    },

    loadMore() { this.search(this.currentQuery, true); },

    // --- 2. チャンネルページ（ソート・再生リスト対応） ---
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
                    <button onclick="Actions.showSortMenu('${id}')">動画</button>
                    <button onclick="Actions.loadChannelPlaylists('${id}')">再生リスト</button>
                </div>
                <div id="video-sort-options" style="margin-bottom:20px; display:none; gap:10px;">
                    <button onclick="Actions.loadChannelVideos('${id}', 'date')">新着順</button>
                    <button onclick="Actions.loadChannelVideos('${id}', 'viewCount')">人気順</button>
                    <button onclick="Actions.loadChannelVideos('${id}', 'oldest')">古い順</button>
                </div>
                <div id="ch-grid" class="grid">読み込み中...</div>
            </div>`;
        this.updateSubButton(id);
        this.showSortMenu(id);
    },

    showSortMenu(channelId) {
        const menu = document.getElementById('video-sort-options');
        if(menu) menu.style.display = 'flex';
        this.loadChannelVideos(channelId, 'date');
    },

    async loadChannelVideos(channelId, order) {
        document.getElementById('ch-grid').innerHTML = "読み込み中...";
        try {
            const apiOrder = (order === 'oldest') ? 'date' : order;
            const data = await YT.fetchAPI('search', { 
                channelId, order: apiOrder, part: 'snippet', type: 'video', maxResults: 50 
            });
            this.currentList = data.items;
            if (order === 'oldest') this.currentList.reverse();
            this.renderGrid(this.currentList, 'ch-grid');
        } catch (e) {}
    },

    async loadChannelPlaylists(channelId) {
        const menu = document.getElementById('video-sort-options');
        if(menu) menu.style.display = 'none';
        document.getElementById('ch-grid').innerHTML = "取得中...";
        try {
            const data = await YT.fetchAPI('playlists', { channelId, part: 'snippet', maxResults: 20 });
            document.getElementById('ch-grid').innerHTML = data.items.map(list => `
                <div class="v-card" onclick="Actions.loadPlaylistItems('${list.id}')">
                    <img src="${list.snippet.thumbnails.high.url}">
                    <h3>${list.snippet.title}</h3>
                </div>`).join('');
        } catch (e) {}
    },

    async loadPlaylistItems(playlistId) {
        try {
            const data = await YT.fetchAPI('playlistItems', { playlistId, part: 'snippet', maxResults: 50 });
            this.currentList = data.items.map(item => ({ id: { videoId: item.snippet.resourceId.videoId }, snippet: item.snippet }));
            this.renderGrid(this.currentList, 'ch-grid');
        } catch (e) {}
    },

    // --- 3. グリッド表示 ---
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
                </div>`;
        }).join('');
    },

    // --- 4. 再生（強制スクロールトップ） ---
    play(index) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const mainArea = document.querySelector('main');
        if(mainArea) mainArea.scrollTo(0, 0);

        const video = this.currentList[index];
        const videoId = video.id.videoId || (video.id.resourceId ? video.id.resourceId.videoId : video.id);
        const title = video.snippet.title;
        const chName = video.snippet.channelTitle;
        const chId = video.snippet.channelId;

        Storage.addHistory({ id: videoId, title, channel: chName, thumb: video.snippet.thumbnails.medium.url });

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="player-box"><iframe src="${YT.getEmbedUrl(videoId)}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
                    <div class="video-info-row" style="margin-top:20px;">
                        <div class="ch-icon-small" style="width:48px; height:48px;" onclick="Actions.openChannel('${chId}', '${chName}')">
                             <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(chName)}&background=random">
                        </div>
                        <div>
                            <h2 style="margin:0;">${title}</h2>
                            <div class="channel-link">${chName}</div>
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
    },

    // --- 5. ナビゲーション・初期化 ---
    setMode(mode) {
        this.currentMode = mode;
        const input = document.getElementById('search-input');
        if (input.value) this.search(input.value);
        else alert(mode === 'shorts' ? "ショート専用モードだぜ！検索してくれ。" : "通常モードに戻ったぜ。");
    },

    goHome(clear = false) {
        if (clear) document.getElementById('search-input').value = "";
        this.currentMode = 'video';
        const history = Storage.getHistory();
        if (history.length > 0) {
            this.currentList = history.map(h => ({ 
                id: h.id, 
                snippet: { title: h.title, channelTitle: h.channel, thumbnails: { high: { url: h.thumb } } } 
            }));
            this.renderGrid(this.currentList, 'view-container');
        } else {
            // 💡 履歴がない時だけ、初期検索（教育）を行うようにしてもOK
            // ここでは一旦、挨拶画面を表示。APIを叩きたければ this.search("教育") に書き換えてくれ！
            document.getElementById('view-container').innerHTML = `
                <div style="text-align:center; margin-top:100px;">
                    <h1>YouTube Education</h1>
                    <p>検索バーから勉強（？）を始めようぜ！</p>
                </div>`;
        }
        const moreBtn = document.getElementById('load-more');
        if(moreBtn) moreBtn.style.display = 'none';
    },

    showHistory() { this.goHome(false); },

    showView() {
        window.scrollTo(0,0);
        const mainArea = document.querySelector('main');
        if(mainArea) mainArea.scrollTo(0, 0);
    },

    handleSub(id, name) {
        Storage.toggleSub({ id, name });
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
                <div class="ch-icon-small"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random"></div>
                <span style="font-size:12px;">${s.name}</span>
            </div>`).join('');
    }
};

window.onload = () => {
    Actions.updateSidebarSubs();
    Actions.goHome();
};
