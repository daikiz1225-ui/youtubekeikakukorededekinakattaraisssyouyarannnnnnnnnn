/* app.js の修正・強化版 */
const Actions = {
    // ... 前回の search はそのまま ...

    renderGrid(items, target = 'view-container') {
        const html = items.map((item, i) => `
            <div class="v-card">
                <img src="${item.snippet.thumbnails.high.url}" onclick="Actions.play(${i})">
                <div class="video-info-row">
                    <div class="ch-icon-small" onclick="Actions.openChannel('${item.snippet.channelId}', '${item.snippet.channelTitle}')">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(item.snippet.channelTitle)}&background=random">
                    </div>
                    <div>
                        <h3 onclick="Actions.play(${i})">${item.snippet.title}</h3>
                        <div class="channel-link" onclick="Actions.openChannel('${item.snippet.channelId}', '${item.snippet.channelTitle}')">${item.snippet.channelTitle}</div>
                    </div>
                </div>
            </div>
        `).join('');
        document.getElementById(target).innerHTML = `<div class="grid">${html}</div>`;
    },

    play(index) {
        const video = this.currentList[index];
        const videoId = video.id.videoId || video.id; // 検索結果とチャンネル動画の両方に対応
        
        Storage.addHistory({ id: videoId, title: video.snippet.title });
        
        // 💡 画面を「再生モード」に切り替え
        document.getElementById('view-container').innerHTML = `
            <div class="watch-layout">
                <div class="player-area">
                    <div class="player-box">
                        <iframe src="${YT.getEmbedUrl(videoId)}" allow="autoplay; fullscreen" allowfullscreen></iframe>
                    </div>
                    <div class="video-info-row">
                        <div class="ch-icon-small" onclick="Actions.openChannel('${video.snippet.channelId}', '${video.snippet.channelTitle}')">
                             <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(video.snippet.channelTitle)}&background=random">
                        </div>
                        <div>
                            <h2 style="margin:0;">${video.snippet.title}</h2>
                            <div class="channel-link" style="font-size:16px;">${video.snippet.channelTitle}</div>
                        </div>
                    </div>
                </div>
                <div class="sidebar-area" id="side-list"></div>
            </div>
        `;
        this.renderSideList(index);
    },

    // 💡 サイドバーのボタン群（履歴・登録チャンネル）に機能を繋ぐ
    showHistory() {
        const history = Storage.getHistory();
        this.currentList = history.map(h => ({ id: h.id, snippet: { title: h.title, thumbnails: { high: { url: `https://img.youtube.com/vi/${h.id}/hqdefault.jpg` } }, channelTitle: "再生履歴" } }));
        this.renderGrid(this.currentList);
    },

    showSubs() {
        const subs = Storage.getSubs();
        if(subs.length === 0) {
            document.getElementById('view-container').innerHTML = "<h2>登録チャンネルはありません</h2>";
            return;
        }
        // 登録チャンネルの一覧を表示（ここから各チャンネルページへ飛べる）
        const html = subs.map(s => `
            <div class="nav-item" style="background:#1e1e1e; margin-bottom:10px;" onclick="Actions.openChannel('${s.id}', '${s.name}')">
                <div class="ch-icon-small"></div>
                <span>${s.name}</span>
            </div>
        `).join('');
        document.getElementById('view-container').innerHTML = `<h2>登録中のチャンネル</h2><div style="margin-top:20px;">${html}</div>`;
    }
};

// 💡 ショートモードの切り替えをサイドバーのボタンにセット
Actions.setMode = function(mode) {
    alert(mode + " モードに切り替えました。検索時に適用されます。");
    this.currentMode = mode;
};
