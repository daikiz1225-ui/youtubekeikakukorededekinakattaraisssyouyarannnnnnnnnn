/**
 * proxy.js (Base64対応・レイアウト完全固定版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('隠密ブラウザ・真', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:2147483647; background:#000; overflow:hidden;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; width:100%;">
                <div style="padding:env(safe-area-inset-top) 15px 10px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0; align-items:center;">
                    <button id="p-exit" style="background:none; border:none; color:#ff453a; font-size:24px; font-weight:bold;">✕</button>
                    <input type="text" id="p-url" placeholder="攻略URL" style="flex:1; height:44px; border-radius:22px; border:none; background:#333; color:#fff; padding:0 20px; font-size:16px; outline:none;">
                    <button id="p-go" style="width:60px; height:44px; background:#007AFF; color:#fff; border-radius:22px; border:none; font-weight:bold;">Go</button>
                </div>
                <div id="p-view-wrap" style="flex:1; background:#fff; overflow:hidden; position:relative;">
                    <div id="p-load-msg" style="position:absolute; top:40%; width:100%; text-align:center; color:#999; display:none;">
                        📡 通信を難読化中...
                    </div>
                    <iframe id="p-render-frame" style="width:100%; height:100%; border:none;"></iframe>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-go');
        const frame = document.getElementById('p-render-frame');
        const loader = document.getElementById('p-load-msg');

        const fetchEncrypted = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            loader.style.display = 'block';
            frame.style.opacity = '0.3';

            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                const res = await fetch(`/api/proxy?q=${secret}`);
                const data = await res.text();

                // 🌟 TITIUNKOを削除し、タグを復元
                let restored = data.replace(/TITIUNKO/g, '').replace(/«/g, '<').replace(/»/g, '>');

                // iframeに流し込む（srcdocを使うことでiPadの監視を回避）
                frame.srcdoc = restored;
                frame.onload = () => {
                    loader.style.display = 'none';
                    frame.style.opacity = '1';
                };
            } catch (e) {
                loader.innerText = "❌ ブロックされました";
            }
        };

        btn.onclick = fetchEncrypted;
        input.onkeydown = (e) => { if(e.key === 'Enter') fetchEncrypted(); };
        document.getElementById('p-exit').onclick = () => location.reload();
    }
};
