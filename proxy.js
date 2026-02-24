/**
 * proxy.js (レイアウト修正・完全独立表示版)
 */
const ProxyModule = {
    init() {
        if (typeof GameModule !== 'undefined') {
            GameModule.setupGameCanvas('隠密ブラウザ・極', 'proxy');
            this.render();
        }
    },

    render() {
        const container = document.getElementById('proxy-container');
        if (!container) return;
        
        // iPad全画面＆スクロール固定
        container.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999999; background:#000; overflow:hidden;";

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; width:100%;">
                <div style="padding:env(safe-area-inset-top) 15px 10px; background:#1a1a1a; display:flex; gap:10px; flex-shrink:0; align-items:center;">
                    <button id="p-exit" style="background:none; border:none; color:#ff453a; font-size:24px; padding:5px 15px;">✕</button>
                    <input type="text" id="p-url" placeholder="攻略URL" style="flex:1; height:40px; border-radius:20px; border:none; background:#333; color:#fff; padding:0 15px; font-size:16px;">
                    <button id="p-go" style="padding:0 20px; background:#007AFF; color:#fff; border-radius:20px; border:none; font-weight:bold;">Go</button>
                </div>
                <div id="p-frame-box" style="flex:1; background:#fff; overflow:hidden;">
                    <iframe id="p-canvas" style="width:100%; height:100%; border:none;"></iframe>
                </div>
            </div>
        `;
        this.bind();
    },

    bind() {
        const input = document.getElementById('p-url');
        const btn = document.getElementById('p-go');
        const frame = document.getElementById('p-canvas');

        const execute = async () => {
            let url = input.value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;

            const secret = btoa(unescape(encodeURIComponent(url))).split('').reverse().join('');
            
            try {
                const res = await fetch(`/api/proxy?q=${secret}`);
                const packed = await res.text();

                // 🌟 ノイズ除去＆復元（TITI, UNKO, 777を消す）
                let restored = packed.replace(/TITI|UNKO|777/g, '').replace(/«/g, '<').replace(/»/g, '>');

                // 🌟 レイアウト崩れを強制的に直すCSSを注入
                const fixCSS = `
                    <style>
                        body { margin:0; padding:15px; font-family:sans-serif; width:100vw; box-sizing:border-box; }
                        img { max-width:100% !important; height:auto !important; display:block; margin:10px auto; }
                        * { max-width: 100% !important; word-wrap: break-word !important; }
                    </style>
                `;

                frame.srcdoc = fixCSS + restored;
            } catch (e) {
                alert("通信エラー");
            }
        };

        btn.onclick = execute;
        input.onkeydown = (e) => { if(e.key === 'Enter') execute(); };
        document.getElementById('p-exit').onclick = () => location.reload();
    }
};
