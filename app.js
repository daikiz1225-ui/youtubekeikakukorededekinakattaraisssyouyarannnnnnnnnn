/**
 * app.js - 司令塔（完全版）
 * 起動時のAPI消費をカットし、履歴・登録チャンネル・チャンネルページを統括する。
 */

const Actions = {
    currentList: [],      // 現在表示中の動画リスト
    currentQuery: "",     // 現在の検索ワード
    currentMode: 'video', // 'video' or 'shorts'

    // --- 1. 検索実行 ---
    async search(q = document.getElementById('search-input').value) {
        if (!q) return;
        this.currentQuery = q;
        
        // 検索クエリの調整（ショートモードなら #shorts を付加）
        const searchQuery = this.currentMode === 'shorts' ? `${q} #shorts` : q;
        
        try {
            const data = await YT.fetchAPI('search', { 
                q: searchQuery, 
                part: 'snippet', 
                type: 'video', 
                maxResults: 24 
            });
            this.currentList = data.items;
            this.showView('grid-view');
            this.renderGrid(this.currentList, 'view-container');
        } catch (e) {
            console.error("検索エラー:", e);
            alert("API制限か通信エラーが発生したぜ。");
        }
    },

    // --- 2. チャンネルページを開く ---
    async openChannel(id, name) {
        this.showView('channel-view');
        const container = document.getElementById('view-container');
        
        container.innerHTML = `
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
                <button onclick="Actions.loadChannelVideos('${id}', 'date')">新着順</button>
                <button onclick="Actions.loadChannelVideos('${id}', 'viewCount')">人気順</button>
                <button onclick="Actions.loadChannelVideos('${id}', 'rating')">評価順</button>
            </div>
            <div id="ch-grid" class="grid">読み込み中...</div>
        `;
        
        this.updateSubButton(id);
        this.loadChannelVideos(id, 'date');
    },

    async loadChannelVideos(channelId, order) {
        const data = await YT.fetchAPI('search', { 
            channelId, 
            order, 
            part: 'snippet', 
            type: 'video', 
            maxResults: 20 
        });
        this.currentList = data.items;
        this.renderGrid(this.currentList, 'ch-grid');
    },

    // --- 3. 登録チャンネル処理 ---
    handleSub(id, name) {
        const isAdded = Storage.toggleSub({ id, name });
        this.updateSubButton(id);
        this.updateSidebarSubs();
    },

    updateSubButton(id) {
        const btn = document.getElementById('sub-btn');
        if (!btn) return;
        const isSubbed = Storage.getSubs().some(s => s.id === id);
        btn.innerText = isSubbed ? "登録済み" : "チャンネル登録";
        btn.classList.toggle('active', isSubbed);
    },

    // --- 4. グリッドレンダリング ---
    renderGrid(items, targetId) {
        const container = document.getElementById(targetId);
        if (!items || items.length === 0) {
            container.innerHTML = "<p style='padding:20px;'>動画が見つかりませんでした。</p>";
            return;
        }

        container.innerHTML = items.map((item, i) => {
            const videoId = item.id.videoId || item.id;
            const title = item.snippet.title;
            const chName = item.snippet.channelTitle;
            const chId = item.snippet.channelId;
            const thumb = item.snippet.thumbnails.high.url;

            return `
                <div class="v-card">
                    <img src="${thumb}" onclick="Actions.play(${i})">
                    <div class="video-info-row">
                        <div class="ch-icon-small" onclick="event.stopPropagation(); Actions.openChannel('${chId}', '${chName}')">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(chName)}&background=random">
                        </div>
                        <div style="flex:1;">
                            <h3 onclick="Actions.play(${i})">${title}</h3>
                            <div class="channel-link" onclick="event.stopPropagation(); Actions.openChannel('${chId}', '${chName}')">${chName}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // --- 5. 再生処理 (Watch Page) ---
    play(index) {
        const video = this.currentList[index];
        const videoId = video.id.videoId || video.id;
        const title = video.snippet.title;
        const chName = video.snippet.channelTitle;
        const chId = video.snippet.channelId;

        // 履歴に追加
        Storage.addHistory({ 
            id: videoId, 
            title: title, 
            channel: chName,
            thumb: video.snippet.thumbnails.medium.url 
        });

        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="player-box">
                        <iframe src="${YT.getEmbedUrl(videoId)}" allow="autoplay; fullscreen" allowfullscreen></iframe>
                    </div>
                    <div class="video-info-row" style="margin-top:20px;">
                        <div class="ch-icon-small" style="width:48px; height:48px;" onclick="Actions.openChannel('${chId}', '${chName}')">
                             <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(chName)}&background=random">
                        </div>
                        <div>
                            <h2 style="margin:0; font-size:20px;">${title}</h2>
                            <div class="channel-link" style="font-size:16px;" onclick="Actions.openChannel('${chId}', '${chName}')">${chName}</div>
                        </div>
                    </div>
                </div>
                <div class="sidebar-area">
                    <h3 style="margin-top:0;">関連動画</h3>
                    <div id="side-list"></div>
                </div>
            </div>
        `;

        const sideContainer = document.getElementById('side-list');
        sideContainer.innerHTML = this.currentList.map((v, i) => {
            if (i === index) return '';
            return `
                <div class="v-card" style="flex-direction:row; gap:10px; margin-bottom:12px;" onclick="Actions.play(${i})">
                    <img src="${v.snippet.thumbnails.medium.url}" style="width:160px; height:90px;">
                    <div style="flex:1;">
                        <h4 style="margin:0; font-size:14px; line-height:1.2;">${v.snippet.title}</h4>
                        <div class="channel-link" style="font-size:12px;">${v.snippet.channelTitle}</div>
                    </div>
                </div>
            `;
        }).join('');

        window.scrollTo(0, 0);
    },

    // --- 6. ユーティリティ ---
    showView(mode) {
        const container = document.getElementById('view-container');
        container.innerHTML = "";
        window.scrollTo(0, 0);
    },

    goHome(clear = false) {
        if (clear) {
            document.getElementById('search-input').value = "";
            this.currentQuery = "";
        }
        
        const history = Storage.getHistory();
        if (history.length > 0) {
            // APIを叩かず、ローカルの履歴を表示
            console.log("API節約モード: 履歴を表示します");
            this.currentList = history.map(h => ({ 
                id: h.id, 
                snippet: { 
                    title: h.title, 
                    channelTitle: h.channel || "再生済み", 
                    thumbnails: { high: { url: h.thumb || `https://img.youtube.com/vi/${h.id}/hqdefault.jpg` } },
                    channelId: "" 
                } 
            }));
            this.renderGrid(this.currentList, 'view-container');
        } else {
            document.getElementById('view-container').innerHTML = `
                <div style="text-align:center; margin-top:100px; color:#aaa;">
                    <h1 style="font-size:40px;">▶ YouTube Education</h1>
                    <p style="font-size:20px;">上の検索バーから動画を探そうぜ、だいき！</p>
                </div>
            `;
        }
    },

    showHistory() {
        this.goHome(false);
    },

    showSubs() {
        const subs = Storage.getSubs();
        if (subs.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2 style='padding:20px;'>登録チャンネルがありません</h2>";
            return;
        }
        const html = subs.map(s => `
            <div class="nav-item" style="background:var(--hover-bg); margin-bottom:8px; padding:20px;" onclick="Actions.openChannel('${s.id}', '${s.name}')">
                <div class="ch-icon-small" style="width:40px; height:40px;">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random">
                </div>
                <span style="font-size:18px;">${s.name}</span>
            </div>
        `).join('');
        document.getElementById('view-container').innerHTML = `
            <div style="padding:20px;">
                <h2 style="margin-bottom:20px;">登録中のチャンネル</h2>
                <div>${html}</div>
            </div>`;
    },

    updateSidebarSubs() {
        const list = document.getElementById('sub-sidebar-list');
        if (!list) return;
        const subs = Storage.getSubs();
        list.innerHTML = `
            <div class="nav-sep"></div>
            <div style="padding:10px 16px; font-size:12px; color:#aaa;">登録チャンネル</div>
            ` + subs.slice(0, 15).map(s => `
            <div class="nav-item" onclick="Actions.openChannel('${s.id}', '${s.name}')">
                <div class="ch-icon-small" style="width:24px; height:24px;">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random">
                </div>
                <span style="font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.name}</span>
            </div>
        `).join('');
    },

    setMode(mode) {
        this.currentMode = mode;
        const q = document.getElementById('search-input').value;
        if(q) this.search(q);
        else alert(mode === 'shorts' ? "ショート動画モードになりました。検索してくれ！" : "通常動画モードになりました。");
    }
};

// --- 初期化 ---
window.onload = () => {
    Actions.updateSidebarSubs();
    Actions.goHome(); // 起動時は履歴を表示（API消費なし）
};
