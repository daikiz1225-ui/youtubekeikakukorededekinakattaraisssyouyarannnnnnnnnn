/**
 * proxy.js (自作サイト無干渉・完全独立ブラウザ版)
 */
const ProxyModule = {
    init() {
        // 自作サイトの setupGameCanvas は呼ぶが、描画は独自に行う
        if (typeof GameModule !== 'undefined' && GameModule.setupGameCanvas) {
            GameModule.setupGameCanvas('プロキシ起動中', 'proxy');
            this.render();
        }
    },

    render() {
        // 🌟 自作サイトのHTML構造を壊さないよう、bodyの最後に「独立した窓」を差し込む
        let overlay = document.getElementById('proxy-ultra-layer');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'proxy-ultra-layer';
            document.body.appendChild(overlay);
        }

        // 🌟 自作サイトのCSSを一切受け付けない「最強のシールド」
        const styleId = 'proxy-shield-css';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                #proxy-ultra-layer {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 9999999 !important; /* 自作サイトのヘッダーより上に */
                    background: #000 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                /* プロキシ表示中だけ自作サイト側のスクロールを止める */
                .proxy-active-lock {
                    overflow: hidden !important;
                    position: fixed !important;
                    width: 100% !important;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.classList.add('proxy-active-lock');

        overlay.innerHTML = `
            <div style="
                display: flex; align-items: center; gap: 15px; 
                padding: env(safe-area-inset-top) 20px 10px; 
                background: #1a1a1a; border-bottom: 1px solid #333; 
                flex-shrink: 0; height: auto;
            ">
                <button id="p-close" style="background:none; border:none; color:#ff453a; font-size:26px; cursor:pointer; padding:10px;">✕</button>
                <input type="text" id="p-url" placeholder="URLを入力して解析" 
                    style="flex: 1; height: 44px; border-radius: 12px; border: none; background: #333; color: white; padding: 0 15px; font-size: 16px; outline: none;">
                <button id="p-btn" style="height: 44px; padding: 0 25px; background: #007AFF; color: white; border: none; border-radius: 12px; font-weight: bold;">Go</button>
            </div>

            <div style="flex: 1; width: 100%; background: #fff; position: relative; overflow: hidden;">
                <div id="p-loader" style="
                    display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(255,255,255,0.95); z-index: 100; flex-direction: column;
                    justify-content: center; align-items: center; color: #333;
                ">
                    <div style="font-size: 40px; margin-bottom: 15px;">🔍</div>
                    解析中...
                </div>
                <iframe id="p-frame" style="width: 100%; height: 100%; border: none;" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
            </div>
        `;

        setTimeout(() => this.bind(), 50);
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-btn');
        const frame = document.getElementById('p-frame');
        const loader = document.getElementById('p-loader');
        const close = document.getElementById('p-close');

        const load = () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;
            
            loader.style.display = 'flex';
            const encoded = btoa(encodeURIComponent(url).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
            frame.src = `/api/proxy?d=${encoded}`;
            input.blur();
        };

        btn.onclick = load;
        input.onkeydown = (e) => { if (e.key === 'Enter') load(); };
        frame.onload = () => { loader.style.display = 'none'; };

        // ✕ボタン：自作サイトを汚さず元に戻す
        close.onclick = () => {
            document.body.classList.remove('proxy-active-lock');
            const layer = document.getElementById('proxy-ultra-layer');
            const style = document.getElementById('proxy-shield-css');
            if (layer) layer.remove();
            if (style) style.remove();
            // Canvasの状態をリセット（必要に応じて）
            location.reload(); 
        };
    }
};
