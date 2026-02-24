/**
 * proxy.js (最前面・全画面オーバーレイ版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('全画面ミラーリング', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 🌟 魔法の一手：背後のタイトルやボタンをすべて隠す
        // 親要素や兄弟要素の中に「Gameデータ抽出」などがある場合、それらを非表示にする
        const siblings = container.parentElement.children;
        for (let el of siblings) {
            if (el !== container) el.style.display = 'none';
        }

        // 🌟 画面全体をジャックするスタイル
        container.innerHTML = `
            <div id="mirror-fullscreen" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 9999;
                background: #000;
                display: flex;
                flex-direction: column;
            ">
                <div style="
                    display: flex; 
                    align-items: center; 
                    gap: 15px; 
                    padding: 15px 20px; 
                    background: #1a1a1a; 
                    border-bottom: 1px solid #333;
                ">
                    <button id="p-close" style="background:none; border:none; color:#888; font-size:24px; cursor:pointer; padding:0 10px;">✕</button>
                    <input type="text" id="p-url" placeholder="URLを入力して検索" 
                        style="
                            flex: 1; 
                            height: 44px; 
                            border-radius: 12px; 
                            border: none; 
                            background: #333; 
                            color: white; 
                            padding: 0 20px; 
                            font-size: 17px;
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
                        -webkit-appearance: none;
                    ">Go</button>
                </div>

                <div style="flex: 1; width: 100%; background: white; overflow: hidden;">
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
        const close = document.getElementById('p-close');
        const frame = document.getElementById('p-frame');

        const load = () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            const encoded = btoa(encodeURIComponent(url).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));
            frame.src = `/api/proxy?d=${encoded}`;
            input.blur();
        };

        btn.addEventListener('click', load);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); load(); } });
        
        // 閉じるボタン：リロードして元に戻す
        close.addEventListener('click', () => {
            location.reload();
        });
    }
};
