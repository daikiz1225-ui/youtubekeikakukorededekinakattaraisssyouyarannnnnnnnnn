/**
 * playlist.js - プレイリスト管理システム（改良版）
 */

const PlaylistManager = {
    storageKey: 'yt_playlists',

    save(video) {
        // IDの取得（app.jsと同じロジック）
        const id = video.contentDetails?.videoId || (video.id?.videoId || video.id);
        let list = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
        
        if (list.some(v => v.id === id)) {
            alert("既にプレイリストにあります！");
            return;
        }

        list.unshift({
            id: id,
            title: video.snippet.title,
            thumb: video.snippet.thumbnails?.high?.url || "",
            channelTitle: video.snippet.channelTitle
        });

        localStorage.setItem(this.storageKey, JSON.stringify(list));
        alert("プレイリストに保存しました！");
    },

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

    // ボタンを画面にねじ込む関数
    injectButton() {
        const playerArea = document.querySelector('.player-area');
        if (!playerArea) return;

        const titleElement = playerArea.querySelector('h1');
        // すでにボタンがある場合は何もしない
        if (!titleElement || titleElement.querySelector('.playlist-add-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'btn playlist-add-btn';
        btn.style.marginLeft = '10px';
        btn.style.background = '#3ea6ff';
        btn.style.color = '#fff';
        btn.style.fontSize = '14px';
        btn.innerText = '📂 プレイリストに保存';
        
        // 再生中の動画データを取得（ちょっと強引だけどActionsから取る）
        btn.onclick = () => {
            // 現在表示されているタイトルとURLからデータを推測
            const videoId = new URL(playerArea.querySelector('iframe').src).pathname.split('/').pop();
            const videoData = {
                id: videoId,
                snippet: {
                    title: titleElement.innerText.replace('📂 プレイリストに保存', '').trim(),
                    channelTitle: playerArea.querySelector('p')?.innerText || "Unknown",
                    thumbnails: { high: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` } }
                }
            };
            this.save(videoData);
        };

        titleElement.style.display = 'flex';
        titleElement.style.alignItems = 'center';
        titleElement.appendChild(btn);
    }
};

// --- 監視スタート ---
const observer = new MutationObserver(() => {
    PlaylistManager.injectButton();
});

window.addEventListener('load', () => {
    // 1. サイドバーに項目を追加（少し遅らせる）
    setTimeout(() => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !sidebar.querySelector('.nav-playlist')) {
            const div = document.createElement('div');
            div.className = 'nav-item nav-playlist';
            div.style.color = '#3ea6ff';
            div.innerHTML = '📂<span>プレイリスト</span>';
            div.onclick = () => PlaylistManager.show();
            // 履歴（最後から2番目くらい）の前に入れる
            const hr = sidebar.querySelector('hr');
            if (hr) sidebar.insertBefore(div, hr);
            else sidebar.appendChild(div);
        }
    }, 500);

    // 2. 画面の変化を監視開始
    const container = document.getElementById('view-container');
    if (container) {
        observer.observe(container, { childList: true, subtree: true });
    }
});
