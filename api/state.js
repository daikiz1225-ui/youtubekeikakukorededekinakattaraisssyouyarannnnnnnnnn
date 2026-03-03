/**
 * state.js - 操作連動型リロード & 状態復元システム
 * 元の app.js を一切書き換えずに、上から機能を上書きするぜ！
 */

const StateManager = {
    // 1. URLから情報を読み取って、適切な画面を出す
    restoreState() {
        const params = new URLSearchParams(window.location.search);
        
        // 検索ワードがある場合
        if (params.has('q')) {
            const query = params.get('q');
            document.getElementById('search-input').value = query;
            setTimeout(() => Actions.search(), 500); // 起動後に検索実行
        }
        
        // 動画IDがある場合
        if (params.has('v')) {
            const videoId = params.get('v');
            // ダミーのビデオオブジェクトを作って再生させる
            setTimeout(() => Actions.play({ id: { videoId: videoId }, snippet: { title: "読込中...", channelTitle: "" } }), 800);
        }

        // 表示モード（Live, ショートなど）がある場合
        if (params.get('view') === 'live') setTimeout(() => Actions.showLiveHub(), 300);
        if (params.get('view') === 'shorts') setTimeout(() => Actions.showShorts(), 300);
    },

    // 2. URLを書き換えて強制リロードする
    reloadWithState(paramMap) {
        const url = new URL(window.location.href);
        // 一旦今のパラメータをクリア
        url.search = ""; 
        // 新しい状態をセット
        for (const [key, value] of Object.entries(paramMap)) {
            url.searchParams.set(key, value);
        }
        // ★ ここで運命のリロード！
        window.location.href = url.toString();
    }
};

// --- 元の Actions の関数を「リロード版」にアップグレード ---

// 検索をリロード式にする
const originalSearch = Actions.search;
Actions.search = function() {
    const q = document.getElementById('search-input').value;
    if (q) {
        StateManager.reloadWithState({ q: q });
    } else {
        originalSearch.apply(this);
    }
};

// 動画再生をリロード式にする
const originalPlay = Actions.play;
Actions.play = function(video) {
    const vId = video.contentDetails?.videoId || (video.id?.videoId || (typeof video.id === 'string' ? video.id : null));
    const params = new URLSearchParams(window.location.search);
    
    // まだURLにこの動画IDが乗っていない時だけリロード（無限ループ防止）
    if (vId && params.get('v') !== vId) {
        StateManager.reloadWithState({ v: vId });
    } else {
        originalPlay.apply(this, [video]);
    }
};

// サイドバーの各ボタンもリロード対応にする
const originalShowLiveHub = Actions.showLiveHub;
Actions.showLiveHub = function() {
    if (new URLSearchParams(window.location.search).get('view') !== 'live') {
        StateManager.reloadWithState({ view: 'live' });
    } else {
        originalShowLiveHub.apply(this);
    }
};

// ページ読み込み完了時に復元を実行
window.addEventListener('load', () => {
    StateManager.restoreState();
});
