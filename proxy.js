/**
 * proxy.js (ローディング表示バグ修正版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('ミラーリング・プロキシ', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 背後の要素を非表示
        const siblings = container.parentElement.children;
        for (let el of siblings) {
            if (el !== container) el.style.display = 'none';
        }

        container.innerHTML = `
            <div id="mirror-fullscreen" style="
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                z-index: 99999; background: #000; display: flex; flex-direction: column;
            ">
                <div style="display: flex; align-items: center; gap: 15px; padding: 15px 20px; background: #1a1a1a; border-bottom: 1px solid #333;">
                    <button id="p-close" style="background:none; border:none; color:#ff453a; font-size:24px; cursor:pointer; padding:5px 15px;">✕</button>
                    <input type="text" id="p-url" placeholder="URLを入力" 
                        style="flex: 1; height: 44px; border-radius: 12px; border: none; background: #2c2c2c; color: white; padding: 0 15px; font-size: 16px;">
                    <button id="p-btn" style="height: 44px; padding: 0 25px; background: #007AFF; color: white; border: none; border-radius: 12px; font-weight: bold;">Go</button>
                </div>

                <div style="flex: 1; position: relative; background: #fff;">
                    <div id="p-loader" style="
                        display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(255,255,255,0.9); z-index: 10; flex-direction: column;
                        justify-content: center; align-items: center; color: #333; font-weight: bold;
                    ">
                        <div style="font-size: 30px; margin-bottom: 10px;">⌛</div>
                        読み込み中...
                    </div>
                    <iframe id="p-frame" style="width: 100%; height: 100%; border: none;" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
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

        if (!btn || !input || !frame || !loader) return;

        const hideLoader = () => {
            loader.style.display = 'none';
        };

        const showLoader = () => {
            loader.style.display = 'flex';
        };

        const executeLoad = () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            showLoader();

            // セーフティタイマー: 8秒経ったら強制的にローディングを消す
            setTimeout(hideLoader, 8000);

            try {
                const encoded = btoa(encodeURIComponent(url).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
                frame.src = `/api/proxy?d=${encoded}`;
            } catch (e) {
                hideLoader();
                alert("URLエラー");
            }
            input.blur();
        };

        // イベント登録 (一回だけ動作するように設定)
        btn.onclick = executeLoad;
        input.onkeydown = (e) => { if (e.key === 'Enter') executeLoad(); };
        
        // iframeの読み込み完了時
        frame.onload = hideLoader;

        close.onclick = () => {
            if (confirm("終了しますか？")) location.reload();
        };
    }
};
