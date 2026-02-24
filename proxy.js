/**
 * proxy.js (大画面ミラーリング版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('大画面ミラーリング', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 既存の親要素のパディングなどを無視して広げるスタイル
        container.innerHTML = `
            <div id="mirror-wrapper" style="
                position: relative;
                width: 96vw; 
                max-width: 1200px; 
                margin: 0 auto; 
                height: 85vh; 
                display: flex; 
                flex-direction: column; 
                background: #1a1a1a; 
                border-radius: 15px; 
                overflow: hidden;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            ">
                <div style="
                    display: flex; 
                    gap: 10px; 
                    padding: 15px; 
                    background: #2c2c2c; 
                    border-bottom: 1px solid #444;
                    z-index: 10;
                ">
                    <input type="text" id="p-url" placeholder="URLを入力 (例: game8.jp/...)" style="
                        flex: 1; 
                        height: 48px; 
                        border-radius: 10px; 
                        border: 1px solid #555; 
                        background: #111; 
                        color: white; 
                        padding: 0 15px; 
                        font-size: 16px;
                    ">
                    <button id="p-btn" style="
                        width: 100px; 
                        height: 48px; 
                        background: #007AFF; 
                        color: white; 
                        border: none; 
                        border-radius: 10px; 
                        font-weight: bold; 
                        cursor: pointer;
                        -webkit-appearance: none;
                    ">閲覧開始</button>
                </div>

                <div id="p-status" style="font-size: 12px; color: #aaa; background: #2c2c2c; padding: 0 15px 10px;"></div>

                <div style="flex: 1; position: relative; background: white;">
                    <iframe id="p-frame" style="
                        width: 100%; 
                        height: 100%; 
                        border: none;
                    " sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-btn');
        const frame = document.getElementById('p-frame');
        const status = document.getElementById('p-status');

        const load = () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            status.innerText = "🔄 アイフィルターを回避して接続中...";
            
            // Base64エンコード (日本語URL対応)
            const encoded = btoa(encodeURIComponent(url).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
            
            // iframeにAPI経由のURLをセット
            frame.src = `/api/proxy?d=${encoded}`;
            
            frame.onload = () => { 
                status.innerText = "✅ 表示中: " + url; 
            };
        };

        btn.addEventListener('click', load);
        input.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') {
                e.preventDefault();
                load();
            }
        });
    }
};
