/**
 * proxy.js (レイアウト干渉完全回避・最前面固定版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('プロキシブラウザ', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 🌟 既存のYouTube風サイドバーやヘッダーに負けないよう、
        // ページ全体のスクロールと干渉を完全にカットするスタイル
        const styleId = 'proxy-shield-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                /* プロキシ起動中は親の要素をすべて無視して固定 */
                #mirror-fullscreen-root {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 2147483647 !important; /* ブラウザが表示できる最大値 */
                    background: #000;
                    display: flex;
                    flex-direction: column;
                }
                /* iPad Safariのスクロール跳ね返りを防止 */
                html, body { overflow: hidden !important; position: fixed !important; width: 100%; height: 100%; }
            `;
            document.head.appendChild(style);
        }

        container.innerHTML = `
            <div id="mirror-fullscreen-root">
                <div id="p-header" style="
                    display: flex; align-items: center; gap: 15px; 
                    padding: env(safe-area-inset-top) 20px 15px; 
                    background: #1a1a1a; border-bottom: 1px solid #333; 
                    flex-shrink: 0;
                ">
                    <button id="p-close" style="background:none; border:none; color:#ff453a; font-size:24px; cursor:pointer; padding:5px 15px;">✕</button>
                    <input type="text" id="p-url" placeholder="URLを入力 (例: game8.jp/...)" 
                        style="flex: 1; height: 44px; border-radius: 12px; border: none; background: #2c2c2c; color: white; padding: 0 15px; font-size: 16px; outline: none;">
                    <button id="p-btn" style="height: 44px; padding: 0 25px; background: #007AFF; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;">Go</button>
                </div>

                <div id="p-content-area" style="flex: 1; width: 100%; background: #fff; position: relative; overflow: hidden;">
                    <div id="p-loader" style="
                        display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(255,255,255,0.9); z-index: 10; flex-direction: column;
                        justify-content: center; align-items: center; color: #333;
                    ">
                        <div style="font-size: 30px; margin-bottom: 10px;">⌛</div>
                        解析して表示中...
                    </div>
                    
                    <iframe id="p-frame" style="width: 100%; height: 100%; border: none; background: white;" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
                </div>
            </div>
        `;

        setTimeout(() => this.bind(), 100);
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-btn');
        const frame = document.getElementById('p-frame');
        const loader = document.getElementById('p-loader');
        const close = document.getElementById('p-close');

        const executeLoad = () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            loader.style.display = 'flex';
            setTimeout(() => { if(loader) loader.style.display = 'none'; }, 8000);

            const encoded = btoa(encodeURIComponent(url).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
            frame.src = `/api/proxy?d=${encoded}`;
            input.blur();
        };

        btn.onclick = executeLoad;
        input.onkeydown = (e) => { if (e.key === 'Enter') executeLoad(); };
        frame.onload = () => { if(loader) loader.style.display = 'none'; };
        
        // 閉じる時はスタイルも解除してリロード
        close.onclick = () => {
            if (confirm("プロキシを終了しますか？")) {
                const style = document.getElementById('proxy-shield-style');
                if (style) style.remove();
                location.reload();
            }
        };
    }
};
