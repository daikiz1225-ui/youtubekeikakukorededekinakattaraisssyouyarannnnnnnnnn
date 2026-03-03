/**
 * playlist.js - プレイリスト管理システム（超・執念版）
 */

const PlaylistManager = {
    storageKey: 'yt_playlists',

    // 1. 保存ロジック
    save(video) {
        let list = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
        if (list.some(v => v.id === video.id)) {
            alert("既にプレイリストにあります！");
            return;
        }
        list.unshift(video);
        localStorage.setItem(this.storageKey, JSON.stringify(list));
        alert("プレイリストに保存しました！");
    },

    // 2. 表示ロジック
    show() {
        Actions.currentView = "playlist";
        const list = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
        Actions.currentList = list.map(x => ({
            id: x.id,
            snippet: {
                title: x.title,
                thumbnails: { high: { url: x.thumb } },
                channelTitle: x.channelTitle
            }
        }));
        Actions.renderGrid("📂 マイプレイリスト");
    },

    // 3. サイドバーに項目をねじ込む
    injectSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar || sidebar.querySelector('.nav-playlist')) return;

        const div = document.createElement('div');
        div.className = 'nav-item nav-playlist';
        div.style.color = '#3ea6ff';
        div.innerHTML = '📂<span>プレイリスト</span>';
        div.onclick = () => PlaylistManager.show();

        // 履歴(🕒)のアイコンを探して、その上に入れる
        const items = sidebar.querySelectorAll('.nav-item');
        let inserted = false;
        items.forEach(item => {
            if (item.innerText.includes('履歴')) {
                sidebar.insertBefore(div, item);
                inserted = true;
            }
        });
        if (!inserted) sidebar.appendChild(div);
    },

    // 4. 再生画面にボタンをねじ込む
    injectSaveButton() {
        const playerArea = document.querySelector('.player-area');
        if (!playerArea) return;

        const titleElement = playerArea.querySelector('h1');
        if (!titleElement || titleElement.querySelector('.playlist-add-btn')) return;

        // タイトルの横にボタンを作成
        const btn = document.createElement('button');
        btn.className = 'btn playlist-add-btn';
        btn.style.cssText = 'margin-left:15px; background:#3ea6ff; color:#fff; font-size:13px; padding:5px 15px; cursor:pointer; vertical-align:middle;';
        btn.innerText = '📂 プレイリストに保存';

        btn.onclick = () => {
            const iframe = playerArea.querySelector('iframe');
            if (!iframe) return;
            
            // 現在の動画情報を抽出
            const videoId = iframe.src.split('embed/')[1]?.split('?')[0];
            const videoData = {
                id: videoId,
                title: titleElement.innerText.replace('📂 プレイリストに保存', '').trim(),
                channelTitle: playerArea.querySelector('p')?.innerText || "不明なチャンネル",
                thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            };
            this.save(videoData);
        };

        titleElement.style.display = 'flex';
        titleElement.style.alignItems = 'center';
        titleElement.appendChild(btn);
    }
};

// --- しつこく実行し続ける ---
setInterval(() => {
    PlaylistManager.injectSidebar();
    PlaylistManager.injectSaveButton();
}, 1000); // 1秒ごとにチェック
