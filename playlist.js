/**
 * playlist.js - プレイリスト管理システム（独立版）
 */

const PlaylistManager = {
    storageKey: 'yt_playlists',

    // 1. データを保存する
    save(video) {
        const id = video.contentDetails?.videoId || (video.id.videoId || video.id);
        let list = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
        
        // 重複チェック
        if (list.some(v => v.id === id)) {
            alert("既にプレイリストにあります！");
            return;
        }

        list.unshift({
            id: id,
            title: video.snippet.title,
            thumb: video.snippet.thumbnails.high.url,
            channelTitle: video.snippet.channelTitle
        });

        localStorage.setItem(this.storageKey, JSON.stringify(list));
        alert("プレイリストに保存しました！");
    },

    // 2. プレイリストを表示する
    show() {
        Actions.currentView = "playlist";
        const list = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
        
        // Actions.renderGrid を流用するために形を整える
        Actions.currentList = list.map(x => ({
            id: x.id,
            snippet: {
                title: x.title,
                thumbnails: { high: { url: x.thumb } },
                channelTitle: x.channelTitle
            }
        }));
        
        Actions.renderGrid("📂 マイプレイリスト");
    }
};

// --- 既存の Actions に「後付け」で機能を合体させる ---
window.addEventListener('load', () => {
    
    // A. サイドバーに項目を追加
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.style.color = '#3ea6ff'; // 青色で目立たせる
        div.innerHTML = '📂<span>プレイリスト</span>';
        div.onclick = () => PlaylistManager.show();
        // 履歴の上あたりに追加
        sidebar.insertBefore(div, sidebar.querySelector('hr'));
    }

    // B. Actions.play を「改造」してボタンが出るようにする
    const originalPlay = Actions.play;
    Actions.play = function(video) {
        // まず元の再生機能を動かす
        originalPlay.apply(this, arguments);

        // 再生画面が表示された直後にボタンをねじ込む
        setTimeout(() => {
            const playerArea = document.querySelector('.player-area');
            if (playerArea) {
                const titleElement = playerArea.querySelector('h1');
                if (titleElement) {
                    const btn = document.createElement('button');
                    btn.className = 'btn';
                    btn.style.marginLeft = '10px';
                    btn.style.background = '#3ea6ff';
                    btn.style.color = '#fff';
                    btn.innerText = '📂 プレイリストに保存';
                    btn.onclick = () => PlaylistManager.save(video);
                    
                    // タイトルのすぐ横に追加
                    titleElement.style.display = 'flex';
                    titleElement.style.alignItems = 'center';
                    titleElement.appendChild(btn);
                }
            }
        }, 100);
    };
});
