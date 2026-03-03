/**
 * state.js - ラグ解消 & 履歴対応 & 操作連動ロード
 */

// 1. app.js の「await待ち」を無効化する
window.onload = null; 

const StateManager = {
    // URLを更新して履歴を作りつつリロード
    pushAndReload(params) {
        const url = new URL(window.location.origin + window.location.pathname);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        window.location.href = url.toString();
    },

    // 起動時の処理
    async boot() {
        console.log("🚀 爆速起動開始...");
        
        // Actionsが読み込まれるのを待つ
        const check = setInterval(async () => {
            if (window.Actions && window.YT) {
                clearInterval(check);

                // 初期化実行
                Actions.init();

                // ★ここがミソ！キー取得は await せずに裏で回す
                console.log("🔑 キー取得をバックグラウンドで開始...");
                YT.refreshEduKey().catch(e => console.log("ラグったけど無視！"));

                // URLを見て状態を復元
                const p = new URLSearchParams(window.location.search);
                if (p.has('q')) {
                    document.getElementById('search-input').value = p.get('q');
                    Actions.search();
                } else if (p.has('v')) {
                    Actions.play({ id: { videoId: p.get('v') }, snippet: { title: "読込中...", thumbnails:{high:{url:""}} } });
                } else {
                    Actions.goHome(); // 通常はここ
                }
            }
        }, 100);
    }
};

// --- ボタンの動きを「履歴が残るリロード式」に書き換える ---
window.addEventListener('DOMContentLoaded', () => {
    // 検索ボタン
    const sBtn = document.getElementById('search-btn');
    if (sBtn) {
        sBtn.onclick = (e) => {
            e.preventDefault();
            const q = document.getElementById('search-input').value;
            if (q) StateManager.pushAndReload({ q: q });
        };
    }

    // サイドバー
    document.querySelectorAll('.nav-item').forEach(item => {
        const text = item.innerText;
        item.removeAttribute('onclick');
        item.onclick = () => {
            if (text.includes('ホーム')) window.location.href = window.location.origin + window.location.pathname;
            else if (text.includes('Live')) StateManager.pushAndReload({ view: 'live' });
            else if (text.includes('ゲーム')) StateManager.pushAndReload({ view: 'game' });
        };
    });

    // 起動！
    StateManager.boot();
});
