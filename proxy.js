/**
 * proxy.js (完全独立レイヤー版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('プロキシブラウザ', 'proxy');
            this.render();
        }
    },

    render() {
        // 🌟 既存のコンテナを使うのではなく、body直下に「浮いた窓」を作る
        let root = document.getElementById('proxy-independent-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'proxy-independent-root';
            document.body.appendChild(root);
        }

        // 🌟 親サイトのあらゆる干渉を遮断するCSSを注入
        const styleId = 'proxy-ultra-shield';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                #proxy-independent-root {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 2147483647 !important; /* OSレベルの最前面 */
                    background: #000 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                /* 親サイトのスクロールを完全に殺す */
                html, body { 
                    overflow: hidden !important; 
                    height: 100% !important; 
                    position: fixed !important; 
                }
            `;
            document.head.appendChild(style);
        }

        root.innerHTML = `
            <div id="p-header" style="
                display: flex; align-items: center; gap: 15px; 
                padding: env(safe-area-inset-top) 20px 15px; 
                background: #1a1a1a; border-bottom: 1px solid #333; 
                flex-shrink: 0; height: 70px; box-sizing: border-box;
            ">
                <button id="p-close" style="background:none; border:none; color:#ff453a; font-size:24px; cursor:pointer; padding:5px 15px;">✕</button>
                <input type="text" id="p-url" placeholder="URLを入力" 
                    style="flex: 1; height: 40px; border-radius: 10px; border: none; background: #333; color: white; padding: 0 15px; font-size: 16px; outline: none;">
                <button id="p-btn" style="height: 40px; padding: 0 20px; background: #007AFF; color: white; border: none; border-radius: 10px; font-weight: bold;">Go</button>
            </div>

            <div style="flex: 1; width: 100%; background: #fff; position: relative;">
                <div id="p-loader" style="
                    display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(255,255,255,0.9); z-index: 100; flex-direction: column;
                    justify-content: center; align-items: center; color: #333;
                ">
                    <div style="font-size: 30px; margin-bottom: 10px;">⌛</div>
                    読み込み中...
                </div>
                <iframe id="p-frame" style="width: 100%; height: 100%; border: none;" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
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
            const encoded = btoa(encodeURIComponent(url).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
            frame.src = `/api/proxy?d=${encoded}`;
            input.blur();
        };

        btn.onclick = executeLoad;
        input.onkeydown = (e) => { if (e.key === 'Enter') executeLoad(); };
        frame.onload = () => { loader.style.display = 'none'; };
        
        // ✕ボタンでプロキシを完全に消去して親サイトを復元
        close.onclick = () => {
            if (confirm("プロキシを終了しますか？")) {
                document.getElementById('proxy-independent-root').remove();
                document.getElementById('proxy-ultra-shield').remove();
                // bodyの固定を解除
                document.body.style.overflow = '';
                document.body.style.position = '';
                location.reload(); 
            }
        };
    }
};
