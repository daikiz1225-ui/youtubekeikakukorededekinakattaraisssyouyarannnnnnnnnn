/**
 * proxy.js (B案：自作デザイン流し込み版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('攻略ノート', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        
        // iPad全画面を確保
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:999999; background:#fff; overflow:hidden;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; width:100%; background:#f5f5f7;">
                <div style="padding:15px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0;">
                    <button id="p-exit" style="background:none; border:none; color:#ff453a; font-size:24px;">✕</button>
                    <input type="text" id="p-url" placeholder="攻略URLをペースト" style="flex:1; height:44px; border-radius:22px; border:none; background:#333; color:#fff; padding:0 20px; font-size:16px; outline:none;">
                    <button id="p-go" style="padding:0 20px; background:#007AFF; color:#fff; border-radius:22px; border:none; font-weight:bold;">Go</button>
                </div>
                <div id="p-content-area" style="flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:20px;">
                    <div id="p-status" style="text-align:center; color:#999; margin-top:100px;">URLを入れて抽出を開始してください</div>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-go');
        const contentArea = document.getElementById('p-content-area');

        const startFetch = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            contentArea.innerHTML = '<div style="text-align:center; padding:50px;">📦 パズルを解読中...</div>';

            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                const res = await fetch(`/api/proxy?q=${secret}`);
                const data = await res.text();

                // 🌟 ノイズ除去とタグの復元
                let restored = data.replace(/TITIUNKO/g, '').replace(/«/g, '<').replace(/»/g, '>');

                // 🌟 【自作デザインCSS】ここがレイアウトを直す肝です
                const myDesign = `
                    <style>
                        .note { font-family: -apple-system, sans-serif; color: #1d1d1f; max-width: 800px; margin: 0 auto; line-height: 1.8; }
                        .note h1, .note h2 { border-bottom: 2px solid #007AFF; padding-bottom: 8px; margin-top: 30px; }
                        .note img { max-width: 100% !important; height: auto !important; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                        .note table { width: 100% !important; border-collapse: collapse; margin: 20px 0; }
                        .note td, .note th { border: 1px solid #ddd; padding: 10px; font-size: 14px; }
                        .note span { color: inherit; text-decoration: none; } /* 元リンクの文字 */
                    </style>
                `;

                contentArea.innerHTML = myDesign + '<div class="note">' + restored + '</div>';
                contentArea.scrollTop = 0;
            } catch (e) {
                contentArea.innerHTML = '<div style="color:red; text-align:center; padding:50px;">❌ 通信エラー：ブロックされました</div>';
            }
        };

        btn.onclick = startFetch;
        input.onkeydown = (e) => { if(e.key === 'Enter') startFetch(); };
        document.getElementById('p-exit').onclick = () => location.reload();
    }
};
