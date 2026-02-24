/**
 * proxy.js (Goボタン動作修正・iPad完全対応版)
 */
const ProxyModule = {
    init() {
        console.log("ProxyModule: Initializing...");
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('全画面ミラーリング', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 既存の邪魔な要素を隠す
        const siblings = container.parentElement.children;
        for (let el of siblings) {
            if (el !== container) el.style.display = 'none';
        }

        // 画面全体をジャック
        container.innerHTML = `
            <div id="mirror-fullscreen" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 99999;
                background: #000;
                display: flex;
                flex-direction: column;
            ">
                <div style="
                    display: flex; 
                    align-items: center; 
                    gap: 15px; 
                    padding: env(safe-area-inset-top) 20px 15px; 
                    background: #1a1a1a; 
                    border-bottom: 1px solid #333;
                ">
                    <button id="p-close" style="background:none; border:none; color:#ff453a; font-size:24px; cursor:pointer; padding:10px;">✕</button>
                    <input type="text" id="p-url" placeholder="URLを入力して閲覧" 
                        style="
                            flex: 1; 
                            height: 44px; 
                            border-radius: 12px; 
                            border: 1px solid #444; 
                            background: #2c2c2c; 
                            color: white; 
                            padding: 0 15px; 
                            font-size: 16px;
                            outline: none;
                        ">
                    <button id="p-btn" style="
                        height: 44px; 
                        padding: 0 25px; 
                        background: #007AFF; 
                        color: white; 
                        border: none; 
                        border-radius: 12px; 
                        font-weight: bold; 
                        cursor: pointer;
                        -webkit-tap-highlight-color: transparent;
                    ">Go</button>
                </div>

                <div style="flex: 1; width: 100%; background: white; position: relative;">
                    <div id="p-loading" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#666;">読み込み中...</div>
                    <iframe id="p-frame" style="width: 100%; height: 100%; border: none;" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
                </div>
            </div>
        `;

        // DOMの構築を待ってからバインド
        setTimeout(() => this.bind(), 50);
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-btn');
        const close = document.getElementById('p-close');
        const frame = document.getElementById('p-frame');
        const loader = document.getElementById('p-loading');

        if (!btn || !input) {
            console.error("ProxyModule: Critical elements not found.");
            return;
        }

        const executeLoad = () => {
            let url = input.value.trim();
            if (!url) return;
            
            console.log("ProxyModule: Loading URL ->", url);
            if (!url.startsWith('http')) url = 'https://' + url;

            // ローディング表示
            if (loader) loader.style.display = 'block';

            // Base64エンコード
            try {
                const encoded = btoa(encodeURIComponent(url).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
                frame.src = `/api/proxy?d=${encoded}`;
            } catch (e) {
                alert("URLの変換に失敗しました");
            }

            input.blur();
        };

        // クリックイベント
        btn.onclick = (e) => {
            e.preventDefault();
            executeLoad();
        };

        // エンターキー（iPadの「開く」ボタン）
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeLoad();
            }
        };

        // フレーム読み込み完了時
        frame.onload = () => {
            if (loader) loader.style.display = 'none';
        };

        // 閉じる（リロード）
        close.onclick = () => {
            if(confirm("プロキシを終了しますか？")) {
                location.reload();
            }
        };
    }
};
