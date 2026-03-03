/**
 * state.js - 操作連動型リロード & 状態復元システム（完全版）
 */

const StateManager = {
    // URLを更新してリロードする
    reloadWith(params) {
        const url = new URL(window.location.origin + window.location.pathname);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        window.location.href = url.toString(); // ここで強制リロード
    },

    // ページが開かれた時に、URLを見て中身を再現する
    restore() {
        const p = new URLSearchParams(window.location.search);
        
        // 検索結果の復元
        if (p.has('q')) {
            const q = p.get('q');
            const input = document.getElementById('search-input');
            if (input) input.value = q;
            // app.jsが読み込まれるのを待ってから検索実行
            setTimeout(() => { if(window.Actions) Actions.search(); }, 500);
        }

        // 動画再生の復元
        if (p.has('v')) {
            const vId = p.get('v');
            setTimeout(() => {
                if(window.Actions) Actions.play({ id: { videoId: vId }, snippet: { title: "読込中...", thumbnails:{high:{url:""}} } });
            }, 800);
        }
    }
};

// --- ボタンの動きを「リロード式」に上書きする ---
window.addEventListener('DOMContentLoaded', () => {
    
    // 1. 検索ボタンの上書き
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.onclick = (e) => {
            e.preventDefault();
            const q = document.getElementById('search-input').value;
            if (q) StateManager.reloadWith({ q: q });
        };
    }

    // 2. サイドバーの「Live」や「ゲーム」の上書き
    // onclick属性を無効化して、リロード付きの動きに変える
    document.querySelectorAll('.nav-item').forEach(item => {
        const text = item.innerText;
        if (text.includes('Live')) {
            item.onclick = () => StateManager.reloadWith({ view: 'live' });
        } else if (text.includes('ゲーム')) {
            item.onclick = () => StateManager.reloadWith({ view: 'game' });
        } else if (text.includes('ホーム')) {
            item.onclick = () => window.location.href = window.location.origin + window.location.pathname;
        }
    });

    // 3. 復元処理の実行
    StateManager.restore();
});
