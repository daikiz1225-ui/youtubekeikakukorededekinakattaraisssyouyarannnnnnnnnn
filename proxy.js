/**
 * proxy.js (エラー修正版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('安全データ抽出プロキシ', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        container.innerHTML = `
            <div style="width: 95vw; max-width: 1000px; margin: 0 auto;">
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="proxy-url-input" placeholder="https://game8.jp/..." 
                           style="flex: 1; height: 50px; border-radius: 12px; border: 1px solid #444; background: #222; color: white; padding: 0 15px; font-size: 16px;">
                    <button id="proxy-submit-btn" style="height: 50px; padding: 0 25px; border-radius: 12px; background: #007AFF; color: white; border: none; font-weight: bold; cursor: pointer;">解析</button>
                </div>
                <div id="proxy-status" style="font-size: 12px; color: #888; margin-bottom: 5px;"></div>
                <div id="proxy-output" style="background: white; color: #222; min-height: 60vh; border-radius: 15px; overflow: auto; padding: 20px;"></div>
            </div>
        `;
        this.setupEvents();
    },

    setupEvents() {
        const input = document.getElementById('proxy-url-input');
        const btn = document.getElementById('proxy-submit-btn');
        const output = document.getElementById('proxy-output');
        const status = document.getElementById('proxy-status');

        // 安全なBase64エンコード (日本語対応)
        const safeB64Encode = (str) => {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                return String.fromCharCode('0x' + p1);
            }));
        };

        const handleFetch = async () => {
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            status.innerText = "🔒 通信を難読化中...";
            try {
                // ここでエラーが出ていたのを修正
                const encodedUrl = safeB64Encode(url);
                
                const response = await fetch(`/api/proxy?d=${encodedUrl}`);
                const data = await response.json();

                if (data.error) throw new Error(data.error);

                const parser = new DOMParser();
                const doc = parser.parseFromString(data.content, 'text/html');
                const baseUrl = new URL(url).origin;

                // パス補正
                doc.querySelectorAll('img, a').forEach(el => {
                    const attr = el.tagName === 'IMG' ? 'src' : 'href';
                    const val = el.getAttribute(attr);
                    if (val && !val.startsWith('http') && !val.startsWith('data:')) {
                        try { el.setAttribute(attr, new URL(val, url).href); } catch(e){}
                    }
                });

                output.innerHTML = doc.body.innerHTML;
                status.innerText = "✅ 完了";
            } catch (err) {
                status.innerText = "❌ エラー発生";
                output.innerHTML = `<div style="color:red;">エラー詳細: ${err.message}</div>`;
            }
        };

        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetch(); } });
        btn.addEventListener('click', handleFetch);
    }
};
