/**
 * proxy.js (画像プロキシ対応・完全難読化版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('安全データ抽出プロキシ v2', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        container.innerHTML = `
            <div id="proxy-app" style="width: 95vw; max-width: 1100px; margin: 0 auto; color: white;">
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="proxy-url-input" placeholder="https://game8.jp/..." 
                           style="flex: 1; height: 50px; border-radius: 12px; border: 1px solid #444; background: #222; color: white; padding: 0 15px; font-size: 16px;">
                    <button id="proxy-submit-btn" style="height: 50px; padding: 0 25px; border-radius: 12px; background: #007AFF; color: white; border: none; font-weight: bold; cursor: pointer;">解析</button>
                </div>
                <div id="proxy-status" style="font-size: 12px; color: #888; margin-bottom: 5px;"></div>
                <div id="proxy-output" style="background: white; color: #222; min-height: 70vh; border-radius: 15px; overflow: auto; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                    <p style="text-align:center; color:#999; margin-top:100px;">URLを入力して「解析」をタップしてください</p>
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

            status.innerText = "🔒 データを高度な暗号化で取得中...";
            output.innerHTML = '<div style="text-align:center; padding:100px;">読込中...</div>';

            try {
                const encodedUrl = safeB64(url);
                const response = await fetch(`/api/proxy?d=${encodedUrl}`);
                const json = await response.json();

                if (json.error) throw new Error(json.error);

                // Base64からHTMLを復元
                const htmlText = decodeURIComponent(escape(atob(json.data)));
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const baseUrl = new URL(url).origin;

                // 🌟 すべての画像を自分(Vercel)経由に書き換える
                doc.querySelectorAll('img').forEach(img => {
                    let src = img.getAttribute('src');
                    if (src) {
                        // 相対パスを絶対パスへ
                        if (!src.startsWith('http')) src = new URL(src, url).href;
                        // 画像URLを難読化してプロキシへ
                        img.src = `/api/proxy?img=${safeB64(src)}`;
                        img.style.maxWidth = "100%";
                        img.style.height = "auto";
                    }
                });

                // 不要な要素を削除
                doc.querySelectorAll('script, iframe, ins, ads').forEach(el => el.remove());

                output.innerHTML = doc.body.innerHTML;
                status.innerText = "✅ アイフィルターを回避して完全に復元しました";
                
            } catch (err) {
                status.innerText = "❌ 失敗";
                output.innerHTML = `<div style="color:red; padding:20px;">エラー: ${err.message}</div>`;
            }
        };

        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetch(); } });
        btn.addEventListener('click', handleFetch);
    }
};
