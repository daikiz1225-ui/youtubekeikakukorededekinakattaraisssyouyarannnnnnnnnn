/**
 * proxy.js (全画面ミラーリング最適化版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            // タイトルバーなどを非表示にして、より広く使う
            GameModule.setupGameCanvas('全画面ミラーリング', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 親要素の制約をリセットし、画面いっぱいに広げる
        container.style.padding = "0";
        container.style.margin = "0";
        container.style.maxWidth = "none";
        container.style.width = "100%";

        container.innerHTML = `
            <div id="mirror-app" style="
                display: flex; 
                flex-direction: column; 
                width: 100%; 
                height: calc(100vh - 60px); /* 画面上部のバーを除いた全高 */
                background: #000;
            ">
                <div style="
                    display: flex; 
                    align-items: center; 
                    gap: 12px; 
                    padding: 10px 20px; 
                    background: #222; 
                    border-bottom: 1px solid #333;
                ">
                    <input type="text" id="p-url" placeholder="URLを入力 (例: game8.jp/...)" 
                        style="
                            flex: 1; 
                            height: 44px; 
                            border-radius: 22px; 
                            border: none; 
                            background: #333; 
                            color: white; 
                            padding: 0 20px; 
                            font-size: 16px;
                            outline: none;
                        ">
                    <button id="p-btn" style="
                        height: 44px; 
                        padding: 0 25px; 
                        background: #007AFF; 
                        color: white; 
                        border: none; 
                        border-radius: 22px; 
                        font-weight: bold; 
                        cursor: pointer;
                        -webkit-appearance: none;
                    ">解析開始</button>
                </div>

                <div id="p-status" style="
                    font-size: 11px; 
                    color: #007AFF; 
                    background: #222; 
                    padding: 0 20px 8px;
                    font-weight: bold;
                ">🌐 待機中...</div>

                <div style="
                    flex: 1; 
                    width: 100%; 
                    background: white; 
                    overflow: hidden;
                ">
                    <iframe id="p-frame" style="
                        width: 100%; 
                        height: 100%; 
                        border: none;
                        background: white;
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

            status.innerText = "🔄 アイフィルターを回避して構築中...";
            
            // 安全なBase64エンコード
            const encoded = btoa(encodeURIComponent(url).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
            
            // サーバーのミラーリングAPIへ
            frame.src = `/api/proxy?d=${encoded}`;
            
            frame.onload = () => { 
                status.innerText = "✅ 接続完了: " + url; 
                // iPadのキーボードを閉じる
                input.blur();
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
