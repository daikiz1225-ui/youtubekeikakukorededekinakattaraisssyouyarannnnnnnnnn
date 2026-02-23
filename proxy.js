/**
 * proxy.js
 * プロキシ機能の画面描画と制御
 */
const ProxyModule = {
    init() {
        // game.jsにある共通レイアウト関数を呼び出す
        GameModule.setupGameCanvas('WEBプロキシ', 'proxy');
        this.render();
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        container.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 10px;">
                <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                    <input type="text" id="proxy-input" placeholder="https://google.com" 
                           style="flex: 1; height: 48px; border-radius: 8px; padding: 0 15px; font-size: 16px; border: 1px solid #444; background: #1a1a1a; color: white;">
                    <button id="proxy-go" style="height: 48px; padding: 0 20px; background: #4CAF50; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">閲覧</button>
                </div>
                <iframe id="proxy-frame" style="width: 100%; height: 70vh; background: white; border-radius: 8px; border: none;"></iframe>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        const input = document.getElementById('proxy-input');
        const btn = document.getElementById('proxy-go');
        const frame = document.getElementById('proxy-frame');

        const execute = () => {
            const url = input.value.trim();
            if (url) {
                // server.jsのエンドポイントを呼び出す
                frame.src = `/proxy?url=${encodeURIComponent(url)}`;
            }
        };

        // iPad/Enterキー対策：検索実行時にリロードさせない
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                execute();
            }
        });

        btn.addEventListener('click', execute);
    }
};
