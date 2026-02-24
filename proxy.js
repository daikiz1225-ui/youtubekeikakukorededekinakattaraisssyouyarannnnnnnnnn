/**
 * proxy.js (高機能・広画面版)
 */
const ProxyModule = {
    init() {
        // game.js の共通枠を使用
        GameModule.setupGameCanvas('攻略データ抽出', 'proxy');
        this.render();
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        // 画面を広く使うためのスタイル上書き
        container.innerHTML = `
            <div id="proxy-wrapper" style="width: 90vw; max-width: 1100px; margin: 0 auto; color: white; font-family: sans-serif;">
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <input type="text" id="target-url" placeholder="https://game8.jp/..." 
                           style="flex: 1; height: 50px; border-radius: 10px; padding: 0 15px; font-size: 16px; background: #333; color: white; border: 1px solid #555;">
                    <button id="extract-btn" style="height: 50px; padding: 0 25px; border-radius: 10px; background: #007AFF; color: white; border: none; font-weight: bold; cursor: pointer;">
                        解析開始
                    </button>
                </div>

                <div id="status-msg" style="margin-bottom: 10px; color: #aaa;"></div>

                <div id="result-display" style="background: white; color: #333; padding: 20px; border-radius: 15px; min-height: 500px; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <p style="text-align: center; color: #999; margin-top: 100px;">URLを入力して「解析開始」を押してください</p>
                </div>
            </div>
        `;
        this.bindEvents();
    },

    async bindEvents() {
        const btn = document.getElementById('extract-btn');
        const input = document.getElementById('target-url');
        const display = document.getElementById('result-display');
        const status = document.getElementById('status-msg');

        const startExtraction = async () => {
            const url = input.value.trim();
            if (!url) return alert('URLを入力してください');

            display.innerHTML = '<div style="text-align:center; padding:50px;"><div class="loader"></div><p>データをバラバラにして取得中...</p></div>';
            status.innerText = "通信中...";

            try {
                // alloriginsを経由
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&_=${Date.now()}`;
                const response = await fetch(proxyUrl);
                
                if (!response.ok) throw new Error('通信エラー');
                const data = await response.json();
                
                const parser = new DOMParser();
                const doc = parser.parseFromString(data.contents, 'text/html');

                // --- データのバラバラ抽出 ---
                const title = doc.querySelector('h1')?.innerText || "タイトル不明";
                const mainContent = doc.querySelector('.archive-style, .entry-content, article') || doc.body;
                
                // 相対パスの画像を絶対パスに書き換える処理
                const images = mainContent.querySelectorAll('img');
                images.forEach(img => {
                    if (img.src.startsWith('http')) return;
                    const originalHost = new URL(url).origin;
                    img.src = originalHost + img.getAttribute('src');
                    img.style.maxWidth = "100%";
                    img.style.height = "auto";
                });

                // 自作サイト用のテンプレートに流し込む
                display.innerHTML = `
                    <div style="border-bottom: 2px solid #eee; margin-bottom: 20px; padding-bottom: 10px;">
                        <h1 style="font-size: 24px; color: #000;">${title}</h1>
                        <p style="font-size: 12px; color: #666;">取得元: ${url}</p>
                    </div>
                    <div class="extracted-body" style="line-height: 1.6;">
                        ${mainContent.innerHTML}
                    </div>
                `;
                status.innerText = "取得完了";

            } catch (e) {
                console.error(e);
                display.innerHTML = `
                    <div style="color: red; padding: 20px; text-align: center;">
                        <h3>エラーが発生しました</h3>
                        <p>相手サイトのセキュリティによりブロックされた可能性があります。</p>
                        <p style="font-size: 12px; color: #666;">${e.message}</p>
                    </div>
                `;
                status.innerText = "失敗";
            }
        };

        // Enterキー対策
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); startExtraction(); }
        });
        btn.addEventListener('click', startExtraction);
    }
};
