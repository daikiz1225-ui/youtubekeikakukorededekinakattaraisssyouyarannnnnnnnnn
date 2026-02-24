/**
 * proxy.js
 * フロントエンドUIと通信偽装ロジック
 */
const ProxyModule = {
    // 初期化
    init() {
        if (typeof GameModule !== 'undefined' && GameModule.setupGameCanvas) {
            GameModule.setupGameCanvas('安全データ抽出プロキシ', 'proxy');
            this.render();
        }
    },

    // 画面描画
    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        container.innerHTML = `
            <div id="proxy-app" style="width: 95vw; max-width: 1000px; margin: 0 auto; font-family: sans-serif;">
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="proxy-url-input" placeholder="URLを入力 (例: game8.jp/...)" 
                           style="flex: 1; height: 50px; border-radius: 12px; border: 1px solid #444; background: #222; color: white; padding: 0 15px; font-size: 16px; outline: none;">
                    <button id="proxy-submit-btn" 
                            style="height: 50px; padding: 0 25px; border-radius: 12px; background: #007AFF; color: white; border: none; font-weight: bold; cursor: pointer; -webkit-appearance: none;">
                        解析
                    </button>
                </div>
                <div id="proxy-status" style="font-size: 12px; color: #888; margin-bottom: 5px; height: 15px;"></div>
                <div id="proxy-output" 
                     style="background: white; color: #222; min-height: 65vh; border-radius: 15px; overflow: auto; padding: 20px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);">
                    <p style="text-align:center; color:#999; margin-top:100px;">ここにWebサイトが「バラバラにされて」表示されます</p>
                </div>
            </div>
        `;

        this.setupEvents();
    },

    // イベント設定
    setupEvents() {
        const input = document.getElementById('proxy-url-input');
        const btn = document.getElementById('proxy-submit-btn');
        const output = document.getElementById('proxy-output');
        const status = document.getElementById('proxy-status');

        const handleFetch = async () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            status.innerText = "🔒 通信を難読化中...";
            output.innerHTML = '<div style="text-align:center; padding:50px;">取得中...</div>';

            try {
                // 1. URLをBase64で難読化（アイフィルター対策）
                const encodedUrl = btoa(encodeURIComponent(url));
                
                // 2. VercelのAPIにリクエスト
                const response = await fetch(`/api/proxy?d=${encodedUrl}`);
                const data = await response.json();

                if (data.error) throw new Error(data.error);

                status.innerText = "✅ データを復元しました";
                
                // 3. 取得したHTMLを解析・補正
                const parser = new DOMParser();
                const doc = parser.parseFromString(data.content, 'text/html');
                const baseUrl = new URL(url).origin;

                // 画像やリンクのパスを「絶対パス」に修正
                const fixPath = (el, attr) => {
                    const val = el.getAttribute(attr);
                    if (val && !val.startsWith('http') && !val.startsWith('data:')) {
                        el.setAttribute(attr, baseUrl + (val.startsWith('/') ? '' : '/') + val);
                    }
                };

                doc.querySelectorAll('img').forEach(img => fixPath(img, 'src'));
                doc.querySelectorAll('a').forEach(a => fixPath(a, 'href'));

                // 4. 表示（スクリプト等は除去して安全に表示）
                output.innerHTML = doc.body.innerHTML;

            } catch (err) {
                status.innerText = "❌ 失敗";
                output.innerHTML = `<div style="color:red; padding:20px;">エラー: ${err.message}</div>`;
            }
        };

        // iPad対応: Enterキーで検索。ページ全体のリロードを防止
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleFetch();
            }
        });

        btn.addEventListener('click', handleFetch);
    }
};
