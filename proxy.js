/**
 * proxy.js (レイアウト最適化・画像プロキシ対応版)
 */
const ProxyModule = {
    // 1. 初期化: GameModuleのキャンバスを準備
    init() {
        if (typeof GameModule !== 'undefined' && GameModule.setupGameCanvas) {
            GameModule.setupGameCanvas('攻略データ抽出プロキシ', 'proxy');
            this.render();
        }
    },

    // 2. 画面描画: iPadでの操作性を重視したUI
    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        container.innerHTML = `
            <div id="proxy-app" style="width: 95vw; max-width: 1100px; margin: 0 auto; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="proxy-url-input" placeholder="https://game8.jp/..." 
                           style="flex: 1; height: 50px; border-radius: 12px; border: 1px solid #444; background: #222; color: white; padding: 0 15px; font-size: 16px; outline: none;">
                    <button id="proxy-submit-btn" 
                            style="height: 50px; padding: 0 25px; border-radius: 12px; background: #007AFF; color: white; border: none; font-weight: bold; cursor: pointer; -webkit-appearance: none;">
                        解析
                    </button>
                </div>
                <div id="proxy-status" style="font-size: 12px; color: #888; margin-bottom: 5px; height: 15px;"></div>
                <div id="proxy-output" 
                     style="background: #fcfcfc; color: #222; min-height: 70vh; border-radius: 15px; overflow: auto; padding: 0; box-shadow: 0 4px 30px rgba(0,0,0,0.5);">
                    <p style="text-align:center; color:#999; margin-top:100px;">URLを入力して「解析」をタップしてください</p>
                </div>
            </div>
        `;

        this.setupEvents();
    },

    // 3. イベント設定と解析ロジック
    setupEvents() {
        const input = document.getElementById('proxy-url-input');
        const btn = document.getElementById('proxy-submit-btn');
        const output = document.getElementById('proxy-output');
        const status = document.getElementById('proxy-status');

        // 安全なBase64変換 (日本語対応)
        const safeB64 = (str) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));

        const handleFetch = async () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            status.innerText = "🔒 フィルタを回避してデータを再構築中...";
            output.innerHTML = '<div style="text-align:center; padding:100px; color:#666;">読込中...</div>';

            try {
                // Vercel APIへ難読化リクエスト
                const encodedUrl = safeB64(url);
                const response = await fetch(`/api/proxy?d=${encodedUrl}`);
                const json = await response.json();

                if (json.error) throw new Error(json.error);

                // Base64からHTMLを復元
                const htmlText = decodeURIComponent(escape(atob(json.data)));
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');

                // 🌟 記事本体(メインコンテンツ)だけを特定して抽出
                const articleContent = doc.querySelector('.l-content, .archive-style, article, main, .entry-content') || doc.body;

                // 画像をすべてプロキシ経由に書き換え
                articleContent.querySelectorAll('img').forEach(img => {
                    let src = img.getAttribute('src') || img.getAttribute('data-src');
                    if (src) {
                        if (!src.startsWith('http')) src = new URL(src, url).href;
                        img.src = `/api/proxy?img=${safeB64(src)}`;
                        img.style.maxWidth = "100%";
                        img.style.height = "auto";
                        img.style.borderRadius = "8px";
                    }
                });

                // リンクも絶対パスへ
                articleContent.querySelectorAll('a').forEach(a => {
                    let href = a.getAttribute('href');
                    if (href && !href.startsWith('http') && !href.startsWith('#')) {
                        a.setAttribute('href', new URL(href, url).href);
                        a.setAttribute('target', '_blank'); // 別タブで開く
                    }
                });

                // 不要な要素(広告、サイドバー、スクリプト)を徹底削除
                articleContent.querySelectorAll('script, style, iframe, ads, .p-ad, .p-sidebar, .l-sidebar').forEach(el => el.remove());

                // 🌟 レイアウトを整えるCSS
                const customCSS = `
                    <style>
                        .proxy-body { padding: 20px; color: #333; line-height: 1.8; font-size: 16px; background: white; }
                        .proxy-body h1 { font-size: 24px; border-bottom: 2px solid #007AFF; padding-bottom: 10px; }
                        .proxy-body h2 { font-size: 20px; border-left: 5px solid #007AFF; padding-left: 12px; margin-top: 30px; background: #f0f7ff; padding-top: 5px; padding-bottom: 5px; }
                        .proxy-body table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
                        .proxy-body th, .proxy-body td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        .proxy-body th { background: #007AFF; color: white; }
                        .proxy-body td { background: #fff; }
                        .proxy-body ul, .proxy-body ol { padding-left: 20px; }
                        .proxy-body blockquote { border-left: 4px solid #ccc; padding-left: 15px; color: #666; font-style: italic; }
                    </style>
                `;

                // 組み立て表示
                output.innerHTML = `<div class="proxy-body">${customCSS}${articleContent.innerHTML}</div>`;
                status.innerText = "✅ 抽出完了";
                
            } catch (err) {
                status.innerText = "❌ 失敗";
                output.innerHTML = `<div style="color:red; padding:50px; text-align:center;">エラー: ${err.message}</div>`;
            }
        };

        // iPad/Enterキー対策
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetch(); } });
        btn.addEventListener('click', handleFetch);
    }
};
