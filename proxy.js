/**
 * proxy.js (レイアウト組み立て強化版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined' && GameModule.setupGameCanvas) {
            GameModule.setupGameCanvas('攻略データ・完全復元', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;

        container.innerHTML = `
            <div id="proxy-app" style="width: 95vw; max-width: 1100px; margin: 0 auto; color: white;">
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="proxy-url-input" placeholder="URLを入力 (例: game8.jp/...)" 
                           style="flex: 1; height: 50px; border-radius: 12px; border: 1px solid #444; background: #222; color: white; padding: 0 15px; font-size: 16px; outline: none;">
                    <button id="proxy-submit-btn" 
                            style="height: 50px; padding: 0 25px; border-radius: 12px; background: #007AFF; color: white; border: none; font-weight: bold; cursor: pointer;">
                        解析開始
                    </button>
                </div>
                <div id="proxy-status" style="font-size: 12px; color: #888; margin-bottom: 5px; height: 15px;"></div>
                <div id="proxy-output" 
                     style="background: #ffffff; color: #333; min-height: 70vh; border-radius: 15px; overflow-x: hidden; overflow-y: auto; padding: 0; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                    <p style="text-align:center; color:#999; margin-top:100px;">URLを入力して解析してください</p>
                </div>
            </div>
        `;
        this.setupEvents();
    },

    setupEvents() {
        const input = document.getElementById('proxy-url-input');
        const btn = document.getElementById('proxy-submit-btn');
        const output = document.getElementById('proxy-output');
        const status = document.getElementById('proxy-status');

        const safeB64 = (str) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode('0x' + p1)));

        const handleFetch = async () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            status.innerText = "🔒 構造を解析して再構築中...";
            output.innerHTML = '<div style="text-align:center; padding:100px;">解析中...</div>';

            try {
                const encodedUrl = safeB64(url);
                const response = await fetch(`/api/proxy?d=${encodedUrl}`);
                const json = await response.json();
                if (json.error) throw new Error(json.error);

                const htmlText = decodeURIComponent(escape(atob(json.data)));
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');

                // 🌟 記事本体をより広く探す
                const selectors = ['.l-content', '.archive-style', 'article', '.entry-content', '#main', 'main'];
                let articleContent = null;
                for (let s of selectors) {
                    articleContent = doc.querySelector(s);
                    if (articleContent) break;
                }
                if (!articleContent) articleContent = doc.body;

                // --- データのクリーンアップ ---
                articleContent.querySelectorAll('script, style, iframe, ads, nav, footer, .p-ad, .p-sidebar').forEach(el => el.remove());

                // 画像の中継化
                articleContent.querySelectorAll('img').forEach(img => {
                    let src = img.getAttribute('src') || img.getAttribute('data-src');
                    if (src) {
                        if (!src.startsWith('http')) src = new URL(src, url).href;
                        img.src = `/api/proxy?img=${safeB64(src)}`;
                        img.style.maxWidth = "100%";
                        img.style.height = "auto";
                        img.style.display = "block";
                        img.style.margin = "15px auto";
                        img.style.borderRadius = "10px";
                    }
                });

                // 🌟 レイアウトを強制的に整えるスタイル
                const customCSS = `
                    <style>
                        .rebuild-container { padding: 25px; line-height: 1.7; font-family: sans-serif; }
                        .rebuild-container h1 { font-size: 26px; font-weight: bold; border-bottom: 3px solid #007AFF; padding-bottom: 10px; margin-bottom: 20px; }
                        .rebuild-container h2 { font-size: 20px; background: #f0f7ff; border-left: 6px solid #007AFF; padding: 10px 15px; margin-top: 35px; }
                        .rebuild-container h3 { font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 25px; color: #007AFF; }
                        .rebuild-container p { margin: 15px 0; }
                        .rebuild-container table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; table-layout: fixed; }
                        .rebuild-container th, .rebuild-container td { border: 1px solid #ddd; padding: 12px; word-wrap: break-word; }
                        .rebuild-container th { background: #007AFF; color: white; }
                        /* 横並びのリスト（Game8のカード風）を縦に並べるか調整 */
                        .rebuild-container ul { padding-left: 20px; }
                        .rebuild-container .flex, .rebuild-container [style*="display:flex"] { display: block !important; }
                    </style>
                `;

                output.innerHTML = `<div class="rebuild-container">${customCSS}${articleContent.innerHTML}</div>`;
                status.innerText = "✅ 再構築が完了しました";
                
            } catch (err) {
                status.innerText = "❌ 解析エラー";
                output.innerHTML = `<div style="color:red; padding:50px;">エラー: ${err.message}</div>`;
            }
        };

        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetch(); } });
        btn.addEventListener('click', handleFetch);
    }
};
