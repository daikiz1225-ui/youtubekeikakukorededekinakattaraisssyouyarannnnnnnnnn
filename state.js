/**
 * state.js - 履歴（戻る・進む）対応 & 操作連動ロード
 */

const StateManager = {
    // URLを更新して履歴を作りつつリロード
    pushAndReload(params) {
        const url = new URL(window.location.origin + window.location.pathname);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        // これで履歴に残り、なおかつリロードされる
        window.location.href = url.toString();
    },

    // 起動時にURLを見て「何を表示するか」決める
    initFromUrl() {
        const p = new URLSearchParams(window.location.search);
        
        // app.jsが読み込まれるのを待つ
        const checkActions = setInterval(() => {
            if (window.Actions && Actions.init) {
                clearInterval(checkActions);
                
                // 1. まず初期化
                Actions.init();

                // 2. URLに応じた復元（ここが大事！）
                if (p.has('q')) {
                    document.getElementById('search-input').value = p.get('q');
                    Actions.search();
                } else if (p.has('v')) {
                    Actions.play({ id: { videoId: p.get('v') }, snippet: { title: "読込中...", thumbnails:{high:{url:""}} } });
                } else if (p.get('view') === 'live') {
                    Actions.showLiveHub();
                } else if (p.get('view') === 'game') {
                    Actions.showGame();
                } else {
                    Actions.goHome(); // 何もなければホーム
                }
            }
        }, 100);
    }
};

// --- 元の Actions の機能を奪わずに、リロード機能を「被せる」 ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. app.js の onload を無効化する（勝手に goHome させないため）
    window.onload = null;

    // 2. 検索ボタンの乗っ取り
    const sBtn = document.getElementById('search-btn');
    if (sBtn) {
        sBtn.onclick = (e) => {
            e.stopPropagation();
            const q = document.getElementById('search-input').value;
            if (q) StateManager.pushAndReload({ q: q });
        };
    }

    // 3. サイドバー項目の乗っ取り
    document.querySelectorAll('.nav-item').forEach(item => {
        const text = item.innerText;
        item.removeAttribute('onclick'); // 元のクリックを消す
        
        item.onclick = () => {
            if (text.includes('ホーム')) window.location.href = window.location.origin + window.location.pathname;
            else if (text.includes('Live')) StateManager.pushAndReload({ view: 'live' });
            else if (text.includes('ゲーム')) StateManager.pushAndReload({ view: 'game' });
            else if (text.includes('ショート')) StateManager.pushAndReload({ view: 'shorts' });
        };
    });

    // 4. 実行開始
    StateManager.initFromUrl();
});
